
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { Transaction, TransactionType } from "../types";
import { storageService } from "./storage";

export const audioUtils = {
  encode: (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  },
  decode: (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  },
  decodeAudioData: async (data: Uint8Array, ctx: AudioContext, sampleRate: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
  }
};

const cleanJsonResponse = (text: string) => {
  // Remove blocos de código markdown se existirem
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Erro ao parsear JSON do Gemini:", cleaned);
    return null;
  }
};

const getSystemInstruction = (summary: string, boxes: string) => 
`Você é o FinAI, assistente financeiro. Saldo: ${summary}. Caixinhas: ${boxes}. 
Processe comandos financeiros. RESPONDA APENAS EM JSON VÁLIDO.
Se o usuário registrar algo, preencha todos os campos.
Estrutura: {"advice": "Mensagem amigável", "transaction": {"tipo": "despesa"|"receita", "valor": 0, "descricao": "...", "categoria": "..."}}`;

export const connectLiveAssistant = async (
  history: Transaction[],
  callbacks: {
    onAudio: (base64: string) => void;
    onInterrupted: () => void;
    onClose: () => void;
  }
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const boxes = await storageService.getBoxes();
  const income = history.filter(t => t.tipo === TransactionType.INCOME).reduce((acc, t) => acc + t.valor, 0);
  const expenses = history.filter(t => t.tipo === TransactionType.EXPENSE).reduce((acc, t) => acc + t.valor, 0);
  const summary = `R$ ${(income - expenses).toFixed(2)}`;
  const boxesList = boxes.map(b => `${b.nome}: R$ ${b.saldo}`).join(', ');

  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      systemInstruction: getSystemInstruction(summary, boxesList),
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
      }
    },
    callbacks: {
      onopen: () => console.log("Live session opened"),
      onmessage: async (message: LiveServerMessage) => {
        if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
          callbacks.onAudio(message.serverContent.modelTurn.parts[0].inlineData.data);
        }
        if (message.serverContent?.interrupted) {
          callbacks.onInterrupted();
        }
      },
      onclose: callbacks.onClose,
      onerror: (e) => console.error("Live error:", e)
    }
  });
};

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
    const summary = `R$ ${(income - expenses).toFixed(2)}`;
    const boxesList = boxes.map(b => `${b.nome}: R$ ${b.saldo}`).join(', ');

    const result = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: input,
      config: {
        systemInstruction: `FinAI. Saldo: ${summary}. Caixinhas: ${boxesList}. RESPONDA JSON. "advice" PRIMEIRO. Tente sempre extrair "descricao" e "categoria".`,
        responseMimeType: "application/json",
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    let fullResponse = "";
    for await (const chunk of result) {
      if (chunk.text) {
        fullResponse += chunk.text;
        const match = fullResponse.match(/"advice":\s*"(.*?)(?:"|$)/s);
        if (match && match[1]) onChunk(match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
      }
    }
    return cleanJsonResponse(fullResponse);
  } catch (error) {
    console.error("Erro no processamento Gemini:", error);
    return null;
  }
};
