
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Check, X, Bot, User, Calendar, Clock, Tag, Headset, Sparkles, Bell } from 'lucide-react';
import { processFinancialInput } from '../services/gemini';
import { notificationService } from '../services/notifications';
import { Message, AIProcessedTransaction, TransactionType, Transaction } from '../types';

interface ChatAssistantProps {
  transactions: Transaction[];
  onConfirm: (transaction: AIProcessedTransaction) => void;
}

const COMMON_CATEGORIES = [
  'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 
  'Moradia', 'Salário', 'Investimentos', 'Contas Fixas', 'Outros'
];

const playCue = (type: 'start' | 'stop' | 'toggle') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === 'start') {
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'stop') {
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'toggle') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.15);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now); osc.stop(now + 0.25);
    }
  } catch (e) {}
};

const ChatAssistant: React.FC<ChatAssistantProps> = ({ transactions, onConfirm }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou seu assistente FinAI. Posso registrar seus gastos ou conversar sobre como economizar. O que vamos fazer hoje?',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [editingTransaction, setEditingTransaction] = useState<{id: string, data: AIProcessedTransaction} | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isProcessing]);

  useEffect(() => {
    // Ao abrir o chat, solicita permissão de notificação para garantir os lembretes
    notificationService.requestPermission();
  }, []);

  const handleSendMessage = useCallback(async (text?: string) => {
    const content = text || inputValue.trim();
    if (!content) return;

    setInputValue('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    setIsProcessing(true);
    const result = await processFinancialInput(content, transactions);
    setIsProcessing(false);

    if (result) {
      const assistantMsgId = (Date.now() + 1).toString();
      if (result.transaction) {
        const assistantMsg: Message = {
          id: assistantMsgId,
          role: 'assistant',
          content: `Entendido! Verifique os detalhes para registrar esta ${result.transaction.tipo}:`,
          timestamp: Date.now(),
          pendingTransaction: result.transaction
        };
        setMessages(prev => [...prev, assistantMsg]);
        setEditingTransaction({ id: assistantMsgId, data: { ...result.transaction } });
      } else if (result.advice) {
        const assistantMsg: Message = {
          id: assistantMsgId,
          role: 'assistant',
          content: result.advice,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } else {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Desculpe, não consegui processar isso. Pode repetir?',
        timestamp: Date.now()
      }]);
    }
  }, [inputValue, transactions]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => { setIsListening(true); playCue('start'); };
    recognition.onend = () => {
      setIsListening(false);
      playCue('stop');
      if (isHandsFree) { try { recognition.start(); } catch (e) {} }
    };
    recognition.onresult = (event: any) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (final) handleSendMessage(final);
      else if (interim) setInputValue(interim);
    };
    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [isHandsFree, handleSendMessage]);

  const updateEditingData = (field: keyof AIProcessedTransaction, value: any) => {
    if (!editingTransaction) return;
    setEditingTransaction({ ...editingTransaction, data: { ...editingTransaction.data, [field]: value } });
  };

  const confirmTransaction = (messageId: string) => {
    if (editingTransaction && editingTransaction.id === messageId) {
      onConfirm(editingTransaction.data);
      
      const successMsg = editingTransaction.data.dataVencimento 
        ? 'Registrado! Vou te avisar um dia antes do vencimento. 🔔' 
        : 'Registrado com sucesso! ✅';

      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pendingTransaction: undefined, content: successMsg } : m));
      setEditingTransaction(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-500" />
          <span className="text-sm font-semibold text-slate-700">Assistente FinAI</span>
        </div>
        <button 
          onClick={() => { setIsHandsFree(!isHandsFree); playCue('toggle'); if(!isHandsFree) recognitionRef.current?.start(); else recognitionRef.current?.stop(); }}
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
                <div className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm' : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50 shadow-sm'}`}>
                  {msg.content}
                </div>
                {msg.pendingTransaction && editingTransaction && editingTransaction.id === msg.id && (
                  <div className="bg-gradient-to-br from-white via-white to-emerald-50/20 border border-slate-200 rounded-2xl p-4 shadow-lg space-y-4 w-full">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tipo</label>
                        <select value={editingTransaction.data.tipo} onChange={e => updateEditingData('tipo', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-bold appearance-none">
                          <option value={TransactionType.EXPENSE}>Despesa</option>
                          <option value={TransactionType.INCOME}>Receita</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Valor</label>
                        <input type="number" value={editingTransaction.data.valor} onChange={e => updateEditingData('valor', parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-bold"/>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Descrição</label>
                        <input type="text" value={editingTransaction.data.descricao} onChange={e => updateEditingData('descricao', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-semibold"/>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Categoria</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {COMMON_CATEGORIES.slice(0, 5).map(cat => (
                            <button key={cat} onClick={() => updateEditingData('categoria', cat)} className={`px-2 py-1 rounded-full border text-[10px] transition-colors ${editingTransaction.data.categoria === cat ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                              {cat}
                            </button>
                          ))}
                        </div>
                        <input list="cat-list" value={editingTransaction.data.categoria} onChange={e => updateEditingData('categoria', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-semibold" placeholder="Ou digite..."/>
                        <datalist id="cat-list">{COMMON_CATEGORIES.map(c => <option key={c} value={c}/>)}</datalist>
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><Clock size={10}/> Data</label>
                        <input 
                          type="date" 
                          value={editingTransaction.data.data} 
                          onChange={e => updateEditingData('data', e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-700 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><Calendar size={10}/> Vencimento (Opc.)</label>
                        <input 
                          type="date" 
                          value={editingTransaction.data.dataVencimento || ''} 
                          onChange={e => updateEditingData('dataVencimento', e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-700 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {editingTransaction.data.dataVencimento && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                        <Bell size={14} className="text-amber-600" />
                        <span className="text-[10px] text-amber-700 font-medium italic">Lembrete automático agendado para 24h antes.</span>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={() => confirmTransaction(msg.id)} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold shadow-md"><Check size={16}/> Salvar</button>
                      <button onClick={() => setEditingTransaction(null)} className="flex-1 bg-slate-100 text-slate-500 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"><X size={16}/> Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isProcessing && <div className="flex gap-2"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Bot size={18}/></div><div className="bg-slate-100 p-3 rounded-2xl animate-pulse">Pensando...</div></div>}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button onClick={() => isListening ? recognitionRef.current.stop() : recognitionRef.current.start()} className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${isListening ? 'bg-rose-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
            {isListening ? <MicOff size={22}/> : <Mic size={22}/>}
          </button>
          <div className="flex-1 relative">
            <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Pergunte algo ou registre um gasto..." className="w-full h-12 bg-white border border-slate-200 rounded-full px-5 pr-12 text-sm focus:ring-2 focus:ring-emerald-500/20 shadow-sm"/>
            <button onClick={() => handleSendMessage()} className="absolute right-2 top-2 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center"><Send size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
