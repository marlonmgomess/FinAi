
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Check, X, Bot, User, Calendar, Clock, Tag, Headset } from 'lucide-react';
import { processFinancialInput } from '../services/gemini';
import { Message, AIProcessedTransaction, TransactionType } from '../types';

interface ChatAssistantProps {
  onConfirm: (transaction: AIProcessedTransaction) => void;
}

const COMMON_CATEGORIES = [
  'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 
  'Moradia', 'Salário', 'Investimentos', 'Contas Fixas', 'Outros'
];

const ChatAssistant: React.FC<ChatAssistantProps> = ({ onConfirm }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou o FinAI. Como posso ajudar com suas finanças hoje? Você pode digitar ou falar algo como "Gastei 45 reais no mercado".',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Local state to handle edits to the pending transaction before confirmation
  const [editingTransaction, setEditingTransaction] = useState<{id: string, data: AIProcessedTransaction} | null>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSendMessage = useCallback(async (text?: string) => {
    const content = text || inputValue.trim();
    if (!content) return;

    setInputValue('');
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    setIsProcessing(true);
    const result = await processFinancialInput(content);
    setIsProcessing(false);

    if (result) {
      const assistantMsgId = (Date.now() + 1).toString();
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: `Entendi! Verifique os detalhes abaixo para registrar esta ${result.tipo}:`,
        timestamp: Date.now(),
        pendingTransaction: result
      };
      setMessages(prev => [...prev, assistantMsg]);
      setEditingTransaction({ id: assistantMsgId, data: { ...result } });
    } else {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, não consegui entender os detalhes. Poderia repetir com o valor e o que foi?',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);
    }
  }, [inputValue]);

  // Handle Speech Recognition Lifecycle
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      // Restart if Hands-free is enabled
      if (isHandsFree) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        handleSendMessage(finalTranscript);
      } else if (interimTranscript) {
        setInputValue(interimTranscript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [isHandsFree, handleSendMessage]);

  const toggleHandsFree = () => {
    const newState = !isHandsFree;
    setIsHandsFree(newState);
    if (newState) {
      try { recognitionRef.current?.start(); } catch (e) {}
    } else {
      recognitionRef.current?.stop();
    }
  };

  const manualMicToggle = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try { recognitionRef.current?.start(); } catch (e) {}
    }
  };

  const updateEditingData = (field: keyof AIProcessedTransaction, value: any) => {
    if (!editingTransaction) return;
    setEditingTransaction({
      ...editingTransaction,
      data: { ...editingTransaction.data, [field]: value }
    });
  };

  const confirmTransaction = (messageId: string) => {
    if (editingTransaction && editingTransaction.id === messageId) {
      onConfirm(editingTransaction.data);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pendingTransaction: undefined, content: 'Registrado com sucesso! ✅' } : m));
      setEditingTransaction(null);
    }
  };

  const cancelTransaction = (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pendingTransaction: undefined, content: 'Operação cancelada. Como posso ajudar agora?' } : m));
    setEditingTransaction(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
          <span className="text-sm font-semibold text-slate-700">
            {isHandsFree ? 'Modo Mãos Livres Ativo' : 'Assistente Inteligente'}
          </span>
        </div>
        <button 
          onClick={toggleHandsFree}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${isHandsFree ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
        >
          <Headset size={14} /> {isHandsFree ? 'ATIVADO' : 'MÃOS LIVRES'}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={18} />}
              </div>
              <div className="space-y-2">
                <div className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                  {msg.content}
                </div>
                {msg.pendingTransaction && editingTransaction && editingTransaction.id === msg.id && (
                  <div className="bg-gradient-to-br from-white via-white to-emerald-50/20 border border-slate-200 rounded-2xl p-4 shadow-lg shadow-emerald-500/5 space-y-4 w-full">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1 block">Tipo</label>
                        <select 
                          value={editingTransaction.data.tipo}
                          onChange={(e) => updateEditingData('tipo', e.target.value)}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all appearance-none"
                        >
                          <option value={TransactionType.EXPENSE}>Despesa</option>
                          <option value={TransactionType.INCOME}>Receita</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1 block">Valor (R$)</label>
                        <input 
                          type="number"
                          value={editingTransaction.data.valor}
                          onChange={(e) => updateEditingData('valor', parseFloat(e.target.value))}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1 block">Descrição</label>
                        <input 
                          type="text"
                          value={editingTransaction.data.descricao}
                          onChange={(e) => updateEditingData('descricao', e.target.value)}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                          placeholder="Ex: Almoço no Centro"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1 block flex items-center gap-1"><Tag size={10}/> Categoria</label>
                        <input 
                          type="text"
                          list="categories-list"
                          value={editingTransaction.data.categoria}
                          onChange={(e) => updateEditingData('categoria', e.target.value)}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                          placeholder="Escolha ou digite..."
                        />
                        <datalist id="categories-list">
                          {COMMON_CATEGORIES.map(cat => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>
                      
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1 block flex items-center gap-1"><Clock size={10}/> Data</label>
                        <input 
                          type="date"
                          value={editingTransaction.data.data}
                          onChange={(e) => updateEditingData('data', e.target.value)}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1 block flex items-center gap-1"><Calendar size={10}/> Vencimento</label>
                        <input 
                          type="date"
                          value={editingTransaction.data.dataVencimento || ''}
                          onChange={(e) => updateEditingData('dataVencimento', e.target.value || undefined)}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      <button 
                        onClick={() => confirmTransaction(msg.id)}
                        className="flex-1 bg-emerald-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all hover:bg-emerald-700"
                      >
                        <Check size={18} /> Salvar
                      </button>
                      <button 
                        onClick={() => cancelTransaction(msg.id)}
                        className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold active:scale-[0.98] transition-all hover:bg-slate-200"
                      >
                        <X size={18} /> Cancelar
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 px-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button 
            onClick={manualMicToggle}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${isListening ? 'bg-rose-500 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:text-emerald-600 hover:border-emerald-200'}`}
          >
            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <div className="flex-1 relative">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isListening ? "Ouvindo você..." : "Fale: 'Gastei 50 no mercado'"}
              className={`w-full h-12 bg-white border rounded-full px-5 pr-12 text-sm focus:outline-none focus:ring-2 transition-all shadow-sm ${isListening ? 'border-emerald-500 ring-emerald-500/10 italic text-slate-500' : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'}`}
            />
            <button 
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim()}
              className="absolute right-2 top-2 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-90"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        {isListening && (
           <div className="flex justify-center mt-3">
             <div className="flex items-center gap-1 h-4">
                <div className="w-1 h-3 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-4 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <div className="w-1 h-5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
                <div className="w-1 h-3 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default ChatAssistant;
