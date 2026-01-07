
import { GoogleGenAI, Type } from "@google/genai";
import { AIProcessedTransaction, TransactionType, Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemInstruction = (contextSummary: string) => `
Você é o FinAI, um assistente financeiro pessoal inteligente, empático e muito organizado.
Sua missão é ajudar o usuário a ter uma vida financeira saudável, seja registrando transações ou dando conselhos.

ESTADO FINANCEIRO ATUAL DO USUÁRIO:
${contextSummary}

REGRAS DE RESPOSTA:
1. Se o usuário estiver relatando um gasto, ganho ou conta: responda estritamente com o JSON da transação.
2. Se o usuário fizer uma pergunta, pedir conselho ou apenas conversar: responda de forma amigável em Markdown (texto natural), usando os dados financeiros dele como base. Seja realista e encorajador.
3. Para transações, extraia: tipo (despesa/receita), valor, categoria, data (YYYY-MM-DD), vencimento (opcional) e descrição.
4. Categorias sugeridas: Alimentação, Transporte, Lazer, Saúde, Educação, Moradia, Salário, Investimentos, Contas Fixas, Outros.

EXEMPLO DE RESPOSTA PARA TRANSAÇÃO:
{ "tipo": "despesa", "valor": 50.0, "categoria": "Alimentação", "data": "2024-05-20", "descricao": "Almoço" }

EXEMPLO DE RESPOSTA PARA CONSELHO:
"Notei que você gastou bastante com 'Lazer' esta semana (R$ 400). Como seu saldo atual é de R$ 1.200, talvez seja bom segurar um pouco para garantir o pagamento da sua conta de Luz que vence logo."
`;

export interface GeminiResponse {
  transaction?: AIProcessedTransaction;
  advice?: string;
}

export const processFinancialInput = async (
  input: string, 
  history: Transaction[]
): Promise<GeminiResponse | null> => {
  try {
    // Preparar resumo para o contexto da IA
    const income = history.filter(t => t.tipo === TransactionType.INCOME).reduce((acc, t) => acc + t.valor, 0);
    const expenses = history.filter(t => t.tipo === TransactionType.EXPENSE).reduce((acc, t) => acc + t.valor, 0);
    const summary = `
      - Saldo Atual: R$ ${(income - expenses).toFixed(2)}
      - Total Ganhos: R$ ${income.toFixed(2)}
      - Total Gastos: R$ ${expenses.toFixed(2)}
      - Últimas 5 transações: ${history.slice(0, 5).map(t => `${t.descricao} (R$ ${t.valor})`).join(', ')}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: input,
      config: {
        systemInstruction: getSystemInstruction(summary),
        // Não forçamos JSON aqui para permitir que a IA decida entre JSON (transação) ou Texto (conselho)
      },
    });

    const text = response.text.trim();
    
    // Tenta detectar se é um JSON
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const transaction = JSON.parse(text) as AIProcessedTransaction;
        return { transaction };
      } catch {
        return { advice: text };
      }
    } else {
      return { advice: text };
    }
  } catch (error) {
    console.error("Gemini processing error:", error);
    return null;
  }
};
