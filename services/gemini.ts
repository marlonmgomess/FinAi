
import { GoogleGenAI, Type } from "@google/genai";
import { AIProcessedTransaction, TransactionType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const systemInstruction = `
Você é o FinAI, um assistente financeiro pessoal inteligente e amigável.
Sua tarefa é ouvir o que o usuário diz sobre gastos ou ganhos e extrair as informações estruturadas.

Regras:
1. Extraia: tipo (despesa ou receita), valor (número), categoria, data (formato YYYY-MM-DD), data de vencimento (opcional, formato YYYY-MM-DD) e descrição.
2. Se a data de registro não for mencionada, use a data de hoje: ${new Date().toISOString().split('T')[0]}.
3. Tente identificar "data de vencimento" se o usuário disser algo como "para o dia 10", "vence dia 15", "vencimento amanhã". Se não houver menção a vencimento, deixe esse campo vazio.
4. Identifique categorias comuns como: Alimentação, Transporte, Lazer, Saúde, Educação, Moradia, Salário, Investimentos, Contas Fixas, Outros.
5. O valor deve ser sempre positivo.
6. Seja natural na conversa, mas responda SEMPRE com o JSON estruturado após sua breve mensagem de confirmação.

Exemplos de entrada e saída:
"Gastei 50 reais no BK hoje" -> { "tipo": "despesa", "valor": 50.00, "categoria": "Alimentação", "data": "2024-05-20", "descricao": "Burger King" }
"Pagar conta de luz de 120 reais que vence dia 25" -> { "tipo": "despesa", "valor": 120.00, "categoria": "Contas Fixas", "data": "2024-05-20", "dataVencimento": "2024-05-25", "descricao": "Conta de Luz" }
"Recebi 3000 de salário" -> { "tipo": "receita", "valor": 3000.00, "categoria": "Salário", "data": "2024-05-20", "descricao": "Salário mensal" }
`;

export const processFinancialInput = async (input: string): Promise<AIProcessedTransaction | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: input,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tipo: { type: Type.STRING, enum: Object.values(TransactionType) },
            valor: { type: Type.NUMBER },
            categoria: { type: Type.STRING },
            data: { type: Type.STRING },
            dataVencimento: { type: Type.STRING, description: "Opcional. Data de vencimento da conta ou recebimento esperado." },
            descricao: { type: Type.STRING }
          },
          required: ["tipo", "valor", "categoria", "data", "descricao"]
        }
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as AIProcessedTransaction;
    }
    return null;
  } catch (error) {
    console.error("Gemini processing error:", error);
    return null;
  }
};
