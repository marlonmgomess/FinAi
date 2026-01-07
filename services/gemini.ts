
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Transaction, TransactionType } from "../types";
import { storageService } from "./storage";

const getSystemInstruction = (contextSummary: string, boxesList: string) => `
Você é o FinAI, um assistente financeiro pessoal ultra-rápido.
CONTEXTO: ${contextSummary}
CAIXINHAS: ${boxesList}

RESPONDA SEMPRE EM JSON com estes campos:
{
  "transaction": { // Opcional, se houver ação financeira
    "tipo": "criar_caixinha" | "transfer_para_caixinha" | "retirada_da_caixinha" | "despesa" | "receita",
    "valor": number,
    "boxNome": string,
    "meta": number,
    "emoji": string,
    "banco": string,
    "descricao": string,
    "categoria": string
  },
  "advice": "Sua resposta amigável aqui" // Obrigatório
}
`;

export const processFinancialInputStreaming = async (
  input: string, 
  history: Transaction[],
  onChunk: (text: string) => void
) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const boxes = await storageService.getBoxes();
    const income = history.filter(t => t.tipo === TransactionType.INCOME).reduce((acc, t) => acc + t.valor, 0);
    const expenses = history.filter(t => t.tipo === TransactionType.EXPENSE).reduce((acc, t) => acc + t.valor, 0);
    
    const summary = `Saldo: R$ ${(income - expenses).toFixed(2)}`;
    const boxesList = boxes.map(b => `${b.nome}: R$ ${b.saldo}`).join(', ');

    const result = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: input,
      config: {
        systemInstruction: getSystemInstruction(summary, boxesList),
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 } // Prioriza velocidade total
      },
    });

    let fullResponse = "";
    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        // Tenta extrair apenas o conteúdo do campo "advice" para streaming amigável
        try {
          // Busca o valor entre as aspas do campo "advice"
          const adviceMatch = fullResponse.match(/"advice":\s*"(.*?)(?:"|$)/s);
          if (adviceMatch && adviceMatch[1]) {
            // Remove escapes de nova linha do JSON para o display
            onChunk(adviceMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
          }
        } catch (e) {
          // Se falhar a extração parcial, espera o fim
        }
      }
    }

    return JSON.parse(fullResponse.trim());
  } catch (error) {
    console.error("Erro no streaming Gemini:", error);
    return null;
  }
};
