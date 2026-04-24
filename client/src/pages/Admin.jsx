import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAppointments, cancelAppointment, deleteAppointment,
  getRecurringBlocks, createRecurringBlock, deleteRecurringBlock,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const TIMES = Array.from({ length: 20 }, (_, i) => {
  const h = 9 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

function AppointmentCard({ appt, onCancel, onDelete }) {
  const cancelled = appt.status === 'cancelled';
  return (
    <div className={`flex items-center justify-between py-4 border-b border-[#1A1A1A] last:border-0 ${cancelled ? 'opacity-30' : ''}`}>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">{appt.clientName}</span>
          {cancelled && <span className="text-xs text-[#444]">cancelado</span>}
        </div>
        <p className="text-[#444] text-xs mt-0.5">{appt.clientPhone} · {appt.service.name}</p>
        <p className="text-blue-500 text-xs font-medium mt-0.5">
          {new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {appt.time}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {!cancelled && (
          <button onClick={() => onCancel(appt.id)}
            className="text-xs text-[#444] hover:text-red-400 border border-[#1E1E1E] hover:border-red-900/40 px-3 py-1.5 rounded-lg transition-all">
            Cancelar
          </button>
        )}
        <button onClick={() => onDelete(appt.id)}
          className="text-xs text-[#333] hover:text-[#666] border border-[#1E1E1E] px-2.5 py-1.5 rounded-lg transition-all">
          ✕
        </button>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('today');
  const [appointments, setAppointments] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [newBlock, setNewBlock] = useState({ clientName: '', dayOfWeek: 1, time: '09:00', notes: '' });

  const today = new Date().toISOString().split('T')[0];

  const loadAppointments = useCallback(async (date) => {
    setLoading(true);
    try {
      const r = await getAppointments(date ? { date } : {});
      setAppointments(r.data);
    } catch {} finally { setLoading(false); }
  }, []);

  const loadBlocks = async () => {
    try { const r = await getRecurringBlocks(); setBlocks(r.data); } catch {}
  };

  useEffect(() => {
    if (tab === 'today') loadAppointments(today);
    else if (tab === 'all') loadAppointments(filterDate);
    else loadBlocks();
  }, [tab]);

  const handleCancel = async (id) => {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
      await cancelAppointment(id);
      setAppointments((p) => p.map((a) => a.id === id ? { ...a, status: 'cancelled' } : a));
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir permanentemente?')) return;
    try {
      await deleteAppointment(id);
      setAppointments((p) => p.filter((a) => a.id !== id));
    } catch {}
  };

  const handleAddBlock = async () => {
    if (!newBlock.clientName) return;
    try {
      await createRecurringBlock(newBlock);
      setNewBlock({ clientName: '', dayOfWeek: 1, time: '09:00', notes: '' });
      loadBlocks();
    } catch {}
  };

  const handleDeleteBlock = async (id) => {
    if (!confirm('Remover este horário fixo?')) return;
    try {
      await deleteRecurringBlock(id);
      setBlocks((p) => p.filter((b) => b.id !== id));
    } catch {}
  };

  const confirmed = appointments.filter((a) => a.status === 'confirmed').length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">

      {/* Header */}
      <div className="flex items-start justify-between mb-12">
        <div>
          <p className="section-label mb-2">Painel · Barbearia Avance</p>
          <h1 className="text-3xl font-bold text-white">{user?.name}</h1>
        </div>
        <button onClick={() => { signOut(); navigate('/'); }}
          className="text-xs text-[#333] hover:text-red-400 transition-colors mt-1">
          Sair →
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
          { label: 'Hoje', value: confirmed },
          { label: 'Total', value: appointments.length },
          { label: 'Fixos', value: blocks.length },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-blue-500 text-3xl font-bold">{s.value}</p>
            <p className="text-[#333] text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1A1A1A] mb-8">
        {[
          { key: 'today', label: 'Hoje' },
          { key: 'all', label: 'Todos' },
          { key: 'blocks', label: 'Horários Fixos' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
              tab === t.key ? 'text-white border-blue-600' : 'text-[#444] border-transparent hover:text-[#888]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Today */}
      {tab === 'today' && (
        <div className="card p-5">
          {loading ? <p className="text-[#333] text-sm text-center py-6">Carregando...</p> :
           appointments.length === 0 ? <p className="text-[#333] text-sm text-center py-6">Nenhum agendamento para hoje.</p> :
           appointments.map((a) => <AppointmentCard key={a.id} appt={a} onCancel={handleCancel} onDelete={handleDelete} />)}
        </div>
      )}

      {/* All */}
      {tab === 'all' && (
        <div>
          <div className="flex gap-3 mb-5 items-center">
            <input type="date" value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); loadAppointments(e.target.value); }}
              className="input-field max-w-[190px]" />
            {filterDate && (
              <button onClick={() => { setFilterDate(''); loadAppointments(''); }}
                className="text-xs text-[#333] hover:text-white transition-colors">
                Limpar
              </button>
            )}
          </div>
          <div className="card p-5">
            {loading ? <p className="text-[#333] text-sm text-center py-6">Carregando...</p> :
             appointments.length === 0 ? <p className="text-[#333] text-sm text-center py-6">Nenhum agendamento encontrado.</p> :
             appointments.map((a) => <AppointmentCard key={a.id} appt={a} onCancel={handleCancel} onDelete={handleDelete} />)}
          </div>
        </div>
      )}

      {/* Fixed Blocks */}
      {tab === 'blocks' && (
        <div>
          <p className="text-[#444] text-sm mb-6">Bloqueados toda semana para clientes recorrentes.</p>

          <div className="card p-5 mb-5">
            <p className="text-[#888] text-sm font-medium mb-4">Adicionar horário fixo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input type="text" placeholder="Nome do cliente" value={newBlock.clientName}
                onChange={(e) => setNewBlock((b) => ({ ...b, clientName: e.target.value }))} className="input-field" />
              <select value={newBlock.dayOfWeek}
                onChange={(e) => setNewBlock((b) => ({ ...b, dayOfWeek: parseInt(e.target.value) }))} className="input-field">
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <select value={newBlock.time}
                onChange={(e) => setNewBlock((b) => ({ ...b, time: e.target.value }))} className="input-field">
                {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="text" placeholder="Observação (opcional)" value={newBlock.notes}
                onChange={(e) => setNewBlock((b) => ({ ...b, notes: e.target.value }))} className="input-field" />
            </div>
            <button onClick={handleAddBlock} className="btn-primary w-full py-2.5 text-sm">Adicionar</button>
          </div>

          <div className="card p-5">
            {blocks.length === 0
              ? <p className="text-[#333] text-sm text-center py-4">Nenhum horário fixo cadastrado.</p>
              : blocks.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-4 border-b border-[#1A1A1A] last:border-0">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-blue-500 text-xs font-semibold">{DAYS[b.dayOfWeek]}</p>
                      <p className="text-white font-bold">{b.time}</p>
                    </div>
                    <div>
                      <p className="text-white text-sm">{b.clientName}</p>
                      {b.notes && <p className="text-[#333] text-xs">{b.notes}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteBlock(b.id)}
                    className="text-xs text-[#333] hover:text-red-400 border border-[#1E1E1E] hover:border-red-900/40 px-3 py-1.5 rounded-lg transition-all">
                    Remover
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
}
