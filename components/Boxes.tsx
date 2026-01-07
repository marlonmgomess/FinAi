
import React, { useState, useEffect } from 'react';
import { Box, TransactionType } from '../types';
import { storageService } from '../services/storage';
import { Plus, TrendingUp, Target, Wallet, Trash2, ArrowRightLeft, Clock, Pencil, Landmark, Check, X } from 'lucide-react';

const Boxes: React.FC = () => {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newBox, setNewBox] = useState({ nome: '', meta: '', emoji: '💰', banco: '' });
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ nome: '', meta: '', emoji: '', banco: '' });

  const loadBoxes = async () => {
    const data = await storageService.getBoxes();
    setBoxes(data);
  };

  useEffect(() => { loadBoxes(); }, []);

  const handleCreate = async () => {
    if (!newBox.nome || !newBox.meta) return;
    await storageService.saveBox({
      nome: newBox.nome,
      meta: parseFloat(newBox.meta),
      emoji: newBox.emoji,
      banco: newBox.banco
    });
    setNewBox({ nome: '', meta: '', emoji: '💰', banco: '' });
    setShowAdd(false);
    loadBoxes();
  };

  const startEditing = (box: Box) => {
    setEditingBoxId(box.id);
    setEditFormData({
      nome: box.nome,
      meta: box.meta.toString(),
      emoji: box.emoji,
      banco: box.banco || ''
    });
  };

  const handleUpdate = async (id: string) => {
    if (!editFormData.nome || !editFormData.meta) return;
    await storageService.updateBox(id, {
      nome: editFormData.nome,
      meta: parseFloat(editFormData.meta),
      emoji: editFormData.emoji,
      banco: editFormData.banco
    });
    setEditingBoxId(null);
    loadBoxes();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir esta caixinha? O saldo voltará para o extrato geral.')) {
      await storageService.deleteBox(id);
      loadBoxes();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Minhas Caixinhas</h2>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-emerald-600 text-white p-2 rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-100 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Target size={18} className="text-emerald-500" /> Nova Meta
          </h3>
          <div className="grid grid-cols-4 gap-3">
             <input 
              placeholder="📦" 
              value={newBox.emoji} 
              onChange={e => setNewBox({...newBox, emoji: e.target.value})}
              className="col-span-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-center text-xl"
            />
            <input 
              placeholder="Nome (ex: Viagem)" 
              value={newBox.nome} 
              onChange={e => setNewBox({...newBox, nome: e.target.value})}
              className="col-span-3 bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-semibold"
            />
            <input 
              placeholder="Meta (R$)" 
              type="number"
              value={newBox.meta} 
              onChange={e => setNewBox({...newBox, meta: e.target.value})}
              className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-semibold"
            />
            <input 
              placeholder="Banco (opcional)" 
              value={newBox.banco} 
              onChange={e => setNewBox({...newBox, banco: e.target.value})}
              className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-semibold"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold shadow-sm">Criar Caixinha</button>
            <button onClick={() => setShowAdd(false)} className="px-4 bg-slate-100 text-slate-500 py-2 rounded-xl text-sm font-bold">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {boxes.length > 0 ? boxes.map(box => {
          const isEditing = editingBoxId === box.id;
          const percent = Math.min(100, (box.saldo / box.meta) * 100);

          if (isEditing) {
            return (
              <div key={box.id} className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-lg space-y-4 animate-in zoom-in-95">
                <div className="grid grid-cols-4 gap-3">
                  <input 
                    value={editFormData.emoji} 
                    onChange={e => setEditFormData({...editFormData, emoji: e.target.value})}
                    className="col-span-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-center text-xl"
                  />
                  <input 
                    value={editFormData.nome} 
                    onChange={e => setEditFormData({...editFormData, nome: e.target.value})}
                    className="col-span-3 bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-bold"
                  />
                  <input 
                    type="number"
                    value={editFormData.meta} 
                    onChange={e => setEditFormData({...editFormData, meta: e.target.value})}
                    className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-bold"
                  />
                  <input 
                    value={editFormData.banco} 
                    onChange={e => setEditFormData({...editFormData, banco: e.target.value})}
                    className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-bold"
                    placeholder="Banco"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(box.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                    <Check size={14}/> Salvar Alterações
                  </button>
                  <button onClick={() => setEditingBoxId(null)} className="px-3 bg-slate-100 text-slate-500 py-2 rounded-xl text-xs font-bold">
                    <X size={14}/>
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={box.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl bg-slate-50 w-12 h-12 flex items-center justify-center rounded-2xl border border-slate-100 shadow-inner">
                    {box.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{box.nome}</h3>
                      {box.banco && (
                        <span className="flex items-center gap-1 bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded-md border border-slate-200 font-bold uppercase">
                          <Landmark size={8} /> {box.banco}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Objetivo: R$ {box.meta.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditing(box)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(box.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-emerald-600">R$ {box.saldo.toLocaleString()}</span>
                  <span className="text-xs font-bold text-slate-500">{percent.toFixed(1)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><Clock size={10} /> Criado em {new Date(box.createdAt).toLocaleDateString()}</span>
                {percent >= 100 && <span className="text-emerald-500 flex items-center gap-1 animate-bounce">META ATINGIDA! 🎉</span>}
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Plus size={32} />
            </div>
            <p className="text-slate-500 font-medium">Nenhuma caixinha criada.</p>
            <p className="text-xs text-slate-400 mt-1">Diga: "Crie uma caixinha no Nubank para minha viagem"</p>
          </div>
        )}
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-center">
        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
          <TrendingUp size={20} />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-800">Total Investido</p>
          <p className="text-lg font-black text-emerald-900">R$ {boxes.reduce((s, b) => s + b.saldo, 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Boxes;
