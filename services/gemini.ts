
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType } from "../types";
import { storageService } from "./storage";

// System instruction helper to provide context and rules to the model
const getSystemInstruction = (contextSummary: string, boxesList: string) => `
Você é o FinAI, um assistente financeiro pessoal. Você agora suporta "Caixinhas de Bancos" (investimentos por objetivo).

ESTADO FINANCEIRO:
${contextSummary}

CAIXINHAS EXISTENTES:
${boxesList}

REGRAS DE RESPOSTA:
Sempre retorne um JSON. Se a intenção do usuário for uma ação financeira (criar caixinha, guardar, retirar, gasto/ganho), preencha o campo "transaction".
Se for apenas conversa, dúvida ou feedback, preencha o campo "advice".

Campos para "transaction":
- "tipo": "criar_caixinha", "transfer_para_caixinha", "retirada_da_caixinha", "despesa" ou "receita".
- "valor": número.
- "boxNome": nome da caixinha (se aplicável).
- "meta": meta em valor (se criar caixinha).
- "emoji": emoji (se criar caixinha).
- "banco": nome do banco (se criar caixinha ou se o usuário mencionar).
- "descricao": descrição da transação.
- "categoria": categoria (se despesa/receita).

O campo "advice" deve conter uma resposta amigável em Markdown.
`;

/**
 * Processes natural language input using Gemini to extract financial actions or provide advice.
 */
export const processFinancialInput = async (
  input: string, 
  history: Transaction[]
) => {
  try {
    // Initialize Gemini API client inside the function to ensure it always uses the most up-to-date API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const boxes = await storageService.getBoxes();
    const income = history.filter(t => t.tipo === TransactionType.INCOME).reduce((acc, t) => acc + t.valor, 0);
    const expenses = history.filter(t => t.tipo === TransactionType.EXPENSE).reduce((acc, t) => acc + t.valor, 0);
    
    const summary = `- Saldo Livre: R$ ${(income - expenses).toFixed(2)}`;
    const boxesList = boxes.length > 0 
      ? boxes.map(b => `- ${b.nome} (${b.banco || 'Sem banco'}): Saldo R$ ${b.saldo}, Meta R$ ${b.meta}`).join('\n')
      : "Nenhuma caixinha criada ainda.";

    // Generate content using gemini-3-flash-preview for efficiency
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: input,
      config: {
        systemInstruction: getSystemInstruction(summary, boxesList),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transaction: {
              type: Type.OBJECT,
              properties: {
                tipo: { type: Type.STRING },
                valor: { type: Type.NUMBER },
                categoria: { type: Type.STRING },
                data: { type: Type.STRING },
                dataVencimento: { type: Type.STRING },
                descricao: { type: Type.STRING },
                boxNome: { type: Type.STRING },
                meta: { type: Type.NUMBER },
                emoji: { type: Type.STRING },
                banco: { type: Type.STRING },
              }
            },
            advice: { type: Type.STRING }
          }
        }
      },
    });

    // Extract text directly from property as per guidelines (response.text is a getter, not a method)
    const jsonStr = response.text;
    if (!jsonStr) return null;

    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error("Error processing financial input with Gemini:", error);
    return null;
  }
};
