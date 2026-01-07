
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Headset, Volume2, XCircle } from 'lucide-react';
import { processFinancialInputStreaming, connectLiveAssistant, audioUtils, generateId } from '../services/gemini';
import { Message, Transaction } from '../types';

interface ChatAssistantProps {
  transactions: Transaction[];
  onConfirm: (data: any) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ transactions, onConfirm }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial', role: 'assistant', content: 'Olá! Sou o FinAI. Como posso ajudar com suas finanças hoje?', timestamp: Date.now() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const liveSessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isProcessing, isLive]);

  const stopLiveSession = useCallback(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.then((s: any) => s.close());
      liveSessionRef.current = null;
    }
    activeSourcesRef.current.forEach(s => s.stop());
    activeSourcesRef.current.clear();
    setIsLive(false);
  }, []);

  const startLiveSession = async () => {
    try {
      if (!audioContextsRef.current) {
        audioContextsRef.current = {
          input: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
          output: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 })
        };
      }
      
      const { input, output } = audioContextsRef.current;
      if (input.state === 'suspended') await input.resume();
      if (output.state === 'suspended') await output.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsLive(true);

      const sessionPromise = connectLiveAssistant(transactions, {
        onAudio: async (base64) => {
          const buffer = await audioUtils.decodeAudioData(audioUtils.decode(base64), output, 24000);
          const source = output.createBufferSource();
          source.buffer = buffer;
          source.connect(output.destination);
          
          const startTime = Math.max(nextStartTimeRef.current, output.currentTime);
          source.start(startTime);
          nextStartTimeRef.current = startTime + buffer.duration;
          
          activeSourcesRef.current.add(source);
          source.onended = () => activeSourcesRef.current.delete(source);
        },
        onInterrupted: () => {
          activeSourcesRef.current.forEach(s => s.stop());
          activeSourcesRef.current.clear();
          nextStartTimeRef.current = 0;
        },
        onClose: () => setIsLive(false)
      });

      liveSessionRef.current = sessionPromise;

      const micSource = input.createMediaStreamSource(stream);
      const processor = input.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
        
        const pcmBase64 = audioUtils.encode(new Uint8Array(int16.buffer));
        sessionPromise.then(session => {
          session.sendRealtimeInput({ media: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' } });
        });
      };

      micSource.connect(processor);
      processor.connect(input.destination);

    } catch (err) {
      console.error("Erro no áudio:", err);
      setIsLive(false);
    }
  };

  const handleSendMessage = async () => {
    const content = inputValue.trim();
    if (!content || isProcessing) return;

    setInputValue('');
    const assistantId = generateId();
    
    setMessages(p => [
      ...p, 
      { id: generateId(), role: 'user', content, timestamp: Date.now() },
      { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }
    ]);
    
    setIsProcessing(true);
    
    try {
      const result = await processFinancialInputStreaming(content, transactions, (chunk) => {
        setMessages(p => p.map(m => m.id === assistantId ? { ...m, content: chunk } : m));
      });

      if (result?.transaction) {
        onConfirm(result.transaction);
        setMessages(p => p.map(m => m.id === assistantId ? { 
          ...m, 
          content: (result.advice || m.content) + " (✅ Salvo no extrato)" 
        } : m));
      } else if (result?.advice) {
        setMessages(p => p.map(m => m.id === assistantId ? { ...m, content: result.advice } : m));
      }
    } catch (error) {
      console.error("Erro no chat:", error);
      setMessages(p => p.map(m => m.id === assistantId ? { ...m, content: "Tive um erro técnico. Pode tentar novamente?" } : m));
    } finally {
      setIsProcessing(false);
      // Foca de volta no input após processar (ajuda no mobile)
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-700">Assistente FinAI</span>
        </div>
        {!isLive && (
          <button 
            onClick={startLiveSession}
            className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase hover:bg-emerald-200 active:scale-95 transition-all shadow-sm"
          >
            <Headset size={14} /> Modo Mãos Livres
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={18} />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm min-h-[40px] ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {msg.content || (isProcessing && msg.role === 'assistant' ? 'Pensando...' : '')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLive && (
        <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center text-white z-50 animate-in fade-in duration-300">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping scale-150"></div>
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-2xl relative">
              <Volume2 size={48} className="animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-black mb-2 uppercase tracking-tighter">FinAI ouvindo...</h2>
          <p className="text-emerald-100 text-sm">Fale naturalmente seus gastos.</p>
          <button 
            onClick={stopLiveSession}
            className="mt-12 bg-white/10 active:bg-white/30 border border-white/30 px-6 py-3 rounded-full flex items-center gap-2 font-black uppercase text-xs transition-all"
          >
            <XCircle size={18} /> Parar de falar
          </button>
        </div>
      )}

      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 relative">
            <input 
              ref={inputRef}
              type="text" 
              value={inputValue} 
              disabled={isLive}
              onChange={e => setInputValue(e.target.value)} 
              placeholder="Digite aqui..." 
              className="w-full h-12 bg-white border border-slate-200 rounded-full px-5 text-sm focus:ring-2 focus:ring-emerald-500/20 shadow-sm outline-none disabled:bg-slate-100"
              autoComplete="off"
            />
            <button 
              type="submit"
              disabled={isProcessing || isLive || !inputValue.trim()}
              className="absolute right-2 top-2 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md disabled:bg-slate-300 active:scale-90 transition-all"
            >
              <Send size={16}/>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatAssistant;
