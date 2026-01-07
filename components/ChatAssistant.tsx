
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Check, X, Bot, User, Sparkles, Target, ArrowRightLeft } from 'lucide-react';
import { processFinancialInputStreaming } from '../services/gemini';
import { notificationService } from '../services/notifications';
import { Message, AIProcessedTransaction, TransactionType, Transaction } from '../types';

interface ChatAssistantProps {
  transactions: Transaction[];
  onConfirm: (data: any) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ transactions, onConfirm }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou seu assistente FinAI. Como posso ajudar com suas finanças hoje?',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [editingAction, setEditingAction] = useState<{id: string, data: any} | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isProcessing]);

  useEffect(() => { notificationService.requestPermission(); }, []);

  const handleSendMessage = useCallback(async (text?: string) => {
    const content = text || inputValue.trim();
    if (!content) return;

    setInputValue('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    const assistantMsgId = (Date.now() + 1).toString();
    // Mensagem inicial vazia do assistente para o streaming
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    }]);

    setIsProcessing(true);
    
    const result = await processFinancialInputStreaming(
      content, 
      transactions,
      (streamedText) => {
        // Update the message content as chunks arrive
        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId ? { ...m, content: streamedText } : m
        ));
      }
    );

    setIsProcessing(false);

    if (result) {
      if (result.transaction) {
        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId ? { 
            ...m, 
            content: result.advice || m.content,
            pendingTransaction: result.transaction 
          } : m
        ));
        setEditingAction({ id: assistantMsgId, data: result.transaction });
      } else {
        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId ? { ...m, content: result.advice || m.content } : m
        ));
      }
    }
  }, [inputValue, transactions]);

  // Speech logic
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      if (transcript) handleSendMessage(transcript);
    };
    recognitionRef.current = recognition;
  }, [handleSendMessage]);

  const updateActionData = (field: string, value: any) => {
    if (!editingAction) return;
    setEditingAction({ ...editingAction, data: { ...editingAction.data, [field]: value } });
  };

  const confirmAction = (messageId: string) => {
    if (editingAction && editingAction.id === messageId) {
      onConfirm(editingAction.data);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pendingTransaction: undefined, content: 'Tudo pronto! Ação registrada com sucesso. ✨' } : m));
      setEditingAction(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-700">FinAI Inteligente</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={18} />}
              </div>
              <div className="space-y-2">
                <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm min-h-[40px] ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {msg.content || (msg.role === 'assistant' && <span className="flex gap-1 items-center"><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span></span>)}
                </div>
                
                {msg.pendingTransaction && editingAction?.id === msg.id && (
                  <div className="bg-white border-2 border-emerald-100 rounded-2xl p-4 shadow-xl space-y-4 w-full animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2 mb-2">
                       {editingAction.data.tipo === 'criar_caixinha' ? <Target className="text-emerald-500" /> : <ArrowRightLeft className="text-blue-500" />}
                       <span className="text-xs font-black uppercase text-slate-400">Confirmar Ação</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {editingAction.data.tipo === 'criar_caixinha' ? (
                        <>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Nome da Caixinha</label>
                            <input value={editingAction.data.boxNome} onChange={e => updateActionData('boxNome', e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2 font-bold outline-none"/>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Meta (R$)</label>
                            <input type="number" value={editingAction.data.meta} onChange={e => updateActionData('meta', parseFloat(e.target.value))} className="w-full bg-slate-50 border rounded-xl p-2 font-bold text-emerald-600 outline-none"/>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Banco</label>
                            <input value={editingAction.data.banco || ''} onChange={e => updateActionData('banco', e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2 font-bold text-slate-600 outline-none"/>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Descrição</label>
                            <input value={editingAction.data.descricao} onChange={e => updateActionData('descricao', e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2 font-bold outline-none"/>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Valor (R$)</label>
                            <input type="number" value={editingAction.data.valor} onChange={e => updateActionData('valor', parseFloat(e.target.value))} className="w-full bg-slate-50 border rounded-xl p-2 font-bold text-blue-600 outline-none"/>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Destino</label>
                            <input value={editingAction.data.boxNome || 'Saldo Livre'} className="w-full bg-slate-50 border rounded-xl p-2 font-bold text-slate-400 outline-none" readOnly/>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button onClick={() => confirmAction(msg.id)} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"><Check size={14}/> Confirmar</button>
                      <button onClick={() => setEditingAction(null)} className="flex-1 bg-slate-100 text-slate-500 py-2.5 rounded-xl font-bold text-xs">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => isListening ? recognitionRef.current?.stop() : recognitionRef.current?.start()} 
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-colors ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-slate-400 border border-slate-200'}`}
          >
            {isListening ? <MicOff size={22}/> : <Mic size={22}/>}
          </button>
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={inputValue} 
              disabled={isProcessing}
              onChange={e => setInputValue(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
              placeholder="Digite sua transação..." 
              className="w-full h-12 bg-white border border-slate-200 rounded-full px-5 text-sm focus:ring-2 focus:ring-emerald-500/20 shadow-sm outline-none disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button 
              disabled={isProcessing}
              onClick={() => handleSendMessage()} 
              className="absolute right-2 top-2 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md hover:bg-emerald-700 transition-colors disabled:bg-slate-300"
            >
              <Send size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
