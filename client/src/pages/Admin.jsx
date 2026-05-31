import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAppointments, updateAppointmentStatus, updateAppointment, cancelAppointment, deleteAppointment,
  getStats, getClients,
  getAllServices, createService, updateService, deleteService,
  getRecurringBlocks, createRecurringBlock, deleteRecurringBlock,
  getBusinessHours, updateBusinessHours, getDayBlocks, createDayBlock, deleteDayBlock,
} from '../services/api';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const STATUS_CONFIG = {
  confirmed: { label: 'Confirmado',        color: 'text-blue-400',   bg: 'bg-blue-900/30 border-blue-800/50' },
  completed: { label: 'Concluído',         color: 'text-green-400',  bg: 'bg-green-900/30 border-green-800/50' },
  no_show:   { label: 'Não compareceu',    color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/40' },
  cancelled: { label: 'Cancelado',         color: 'text-red-400',    bg: 'bg-red-900/20 border-red-800/40' },
};

function apptServiceNames(a) {
  return a.services?.map((as) => as.service?.name).filter(Boolean).join(' + ') || '—';
}

function fmt(date) {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtCurrency(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}
function getWeekDates(base) {
  const d = new Date(base + 'T12:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd.toISOString().split('T')[0];
  });
}

export default function Admin() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#141414] px-6 py-4 flex items-center justify-between sticky top-[73px] bg-[#0A0A0A] z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0] || 'R'}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{user?.name}</p>
            <p className="text-[#444] text-xs">Painel de controle</p>
          </div>
        </div>
        <button onClick={signOut} className="text-[#444] hover:text-red-400 text-xs transition-colors">
          Sair
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#141414] px-6 flex gap-1 overflow-x-auto sticky top-[133px] bg-[#0A0A0A] z-10">
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'agenda',    label: 'Agenda' },
          { key: 'clientes',  label: 'Clientes' },
          { key: 'servicos',  label: 'Serviços' },
          { key: 'config',    label: 'Configurações' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
              tab === t.key ? 'border-blue-500 text-white' : 'border-transparent text-[#555] hover:text-[#888]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-6xl mx-auto">
        {tab === 'dashboard' && <TabDashboard />}
        {tab === 'agenda'    && <TabAgenda />}
        {tab === 'clientes'  && <TabClientes />}
        {tab === 'servicos'  && <TabServicos />}
        {tab === 'config'    && <TabConfig />}
      </div>
    </div>
  );
}

/* ─────────────────── DASHBOARD ─────────────────── */
function TabDashboard() {
  const [stats, setStats] = useState(null);
  const [todayAppts, setTodayAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([getStats(), getAppointments({ date: today })])
      .then(([s, a]) => { setStats(s.data); setTodayAppts(a.data); })
      .catch(() => setError('Erro ao carregar dados. Verifique a conexão com o servidor.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <div className="card p-6 text-red-400 text-sm">{error}</div>;

  const todayStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[#444] text-sm capitalize">{todayStr}</p>
        <h1 className="text-2xl font-bold text-white mt-1">Visão geral</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Confirmados hoje"  value={stats?.today.confirmed ?? 0}       sub="agendamentos"   color="blue" />
        <KpiCard title="Concluídos hoje"   value={stats?.today.completed ?? 0}       sub="atendimentos"   color="green" />
        <KpiCard title="Faturado hoje"     value={fmtCurrency(stats?.today.revenue)} sub="em concluídos"  color="blue" />
        <KpiCard title="Clientes únicos"   value={stats?.totalUniqueClients ?? 0}    sub="no total"       color="gray" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KpiCard title="Faturado na semana" value={fmtCurrency(stats?.week.revenue)}  sub={`${stats?.week.total} atendimentos`}  color="blue" />
        <KpiCard title="Faturado no mês"    value={fmtCurrency(stats?.month.revenue)} sub={`${stats?.month.total} atendimentos`} color="blue" />
        <KpiCard
          title="Ticket médio (mês)"
          value={stats?.month.total ? fmtCurrency(stats.month.revenue / stats.month.total) : 'R$ 0,00'}
          sub="por atendimento"
          color="gray"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-white text-sm font-semibold mb-4">Serviços mais solicitados</h3>
          {stats?.topServices?.length === 0 && <p className="text-[#444] text-sm">Nenhum dado ainda.</p>}
          <div className="space-y-3">
            {stats?.topServices?.map((s, i) => (
              <div key={s.serviceId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[#333] text-xs font-mono w-4">{i + 1}</span>
                  <span className="text-[#aaa] text-sm">{s.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">{s.count}x</p>
                  <p className="text-[#444] text-xs">{fmtCurrency(s.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-white text-sm font-semibold mb-4">Agenda de hoje</h3>
          {todayAppts.length === 0 && <p className="text-[#444] text-sm">Nenhum agendamento hoje.</p>}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {todayAppts.map((a) => (
              <div key={a.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${STATUS_CONFIG[a.status]?.bg}`}>
                <div>
                  <p className="text-white text-sm font-medium">{a.time} · {a.clientName}</p>
                  <p className="text-[#555] text-xs">{apptServiceNames(a)}</p>
                </div>
                <span className={`text-xs ${STATUS_CONFIG[a.status]?.color}`}>{STATUS_CONFIG[a.status]?.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── AGENDA ─────────────────── */
function TabAgenda() {
  const today = new Date().toISOString().split('T')[0];
  const [weekBase, setWeekBase] = useState(today);
  const [weekDates, setWeekDates] = useState(getWeekDates(today));
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState('day');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getAppointments().then((r) => setAppointments(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setWeekDates(getWeekDates(weekBase)); }, [weekBase]);

  const shiftWeek = (dir) => {
    const d = new Date(weekBase + 'T12:00:00');
    d.setDate(d.getDate() + dir * 7);
    setWeekBase(d.toISOString().split('T')[0]);
  };

  const apptsByDate = {};
  appointments.forEach((a) => {
    if (!apptsByDate[a.date]) apptsByDate[a.date] = [];
    apptsByDate[a.date].push(a);
  });

  const handleStatusChange = async (id, status) => {
    await updateAppointmentStatus(id, status);
    load();
  };
  const handleDelete = async (id) => {
    if (!confirm('Excluir este agendamento permanentemente?')) return;
    await deleteAppointment(id);
    load();
  };

  const dayAppts = (apptsByDate[selectedDate] || []).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Agenda</h2>
        <div className="flex gap-2">
          <button onClick={() => setView('day')} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${view === 'day' ? 'bg-blue-600 text-white' : 'bg-[#111] text-[#555] border border-[#1E1E1E]'}`}>Dia</button>
          <button onClick={() => setView('week')} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${view === 'week' ? 'bg-blue-600 text-white' : 'bg-[#111] text-[#555] border border-[#1E1E1E]'}`}>Semana</button>
        </div>
      </div>

      {/* Week strip */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => shiftWeek(-1)} className="text-[#555] hover:text-white text-xl px-2">‹</button>
          <p className="text-[#555] text-xs">{fmt(weekDates[0])} — {fmt(weekDates[6])}</p>
          <button onClick={() => shiftWeek(1)} className="text-[#555] hover:text-white text-xl px-2">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date, i) => {
            const count = apptsByDate[date]?.filter((a) => a.status !== 'cancelled').length || 0;
            const isToday = date === today;
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                onClick={() => { setSelectedDate(date); setView('day'); }}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                  isSelected ? 'bg-blue-600' : isToday ? 'bg-[#0d1117] border border-blue-900' : 'hover:bg-[#141414]'
                }`}
              >
                <span className={`text-xs ${isSelected ? 'text-blue-200' : 'text-[#555]'}`}>{DAYS[i]}</span>
                <span className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : isToday ? 'text-blue-400' : 'text-[#888]'}`}>
                  {new Date(date + 'T12:00:00').getDate()}
                </span>
                {count > 0 && (
                  <span className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-blue-200' : 'text-blue-500'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {view === 'week'
        ? <WeekView weekDates={weekDates} apptsByDate={apptsByDate} onStatusChange={handleStatusChange} onDelete={handleDelete} />
        : <DayView date={selectedDate} appointments={dayAppts} loading={loading} onStatusChange={handleStatusChange} onDelete={handleDelete} onReload={load} />
      }
    </div>
  );
}

function WeekView({ weekDates, apptsByDate, onStatusChange, onDelete }) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDates.map((date, i) => {
        const appts = (apptsByDate[date] || []).filter((a) => a.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));
        return (
          <div key={date} className="card p-2 min-h-24">
            <p className="text-[#555] text-xs text-center">{DAYS[i]}</p>
            <p className="text-[#777] text-xs text-center mb-2">{new Date(date + 'T12:00:00').getDate()}</p>
            <div className="space-y-1">
              {appts.map((a) => (
                <div key={a.id} className={`px-1.5 py-1 rounded text-[10px] border ${STATUS_CONFIG[a.status]?.bg}`}>
                  <p className="text-white font-medium">{a.time}</p>
                  <p className="text-[#aaa] truncate">{a.clientName}</p>
                </div>
              ))}
              {appts.length === 0 && <p className="text-[#2a2a2a] text-[10px] text-center mt-2">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ date, appointments, loading, onStatusChange, onDelete, onReload }) {
  const [expanded, setExpanded] = useState(null);
  const [editingAppt, setEditingAppt] = useState(null);
  const dateLabel = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  if (loading) return <Spinner />;

  return (
    <div>
      <p className="text-[#555] text-sm capitalize mb-4">{dateLabel}</p>
      {appointments.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-[#333] text-sm">Nenhum agendamento neste dia.</p>
        </div>
      )}
      <div className="space-y-3">
        {appointments.map((a) => (
          <div key={a.id} className={`card border overflow-hidden ${STATUS_CONFIG[a.status]?.bg}`}>
            <button
              className="w-full px-5 py-4 text-left flex items-center justify-between"
              onClick={() => setExpanded(expanded === a.id ? null : a.id)}
            >
              <div className="flex items-center gap-4">
                <p className="text-white text-lg font-bold w-12">{a.time}</p>
                <div>
                  <p className="text-white font-medium">{a.clientName}</p>
                  <p className="text-[#555] text-sm">{apptServiceNames(a)} · {fmtCurrency(a.price)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full border ${STATUS_CONFIG[a.status]?.bg} ${STATUS_CONFIG[a.status]?.color}`}>
                  {STATUS_CONFIG[a.status]?.label}
                </span>
                <span className="text-[#444] text-xs">{expanded === a.id ? '▲' : '▼'}</span>
              </div>
            </button>
            {expanded === a.id && (
              <div className="px-5 pb-4 border-t border-[#1a1a1a] pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Telefone"  value={a.clientPhone} />
                  <Info label="Serviço"   value={apptServiceNames(a)} />
                  <Info label="Duração"   value={`${a.totalDuration} min`} />
                  <Info label="Valor"     value={fmtCurrency(a.price)} accent />
                  {a.notes && <Info label="Obs." value={a.notes} span2 />}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <ActionBtn color="blue" onClick={() => setEditingAppt(a)}>Editar</ActionBtn>
                  {a.status !== 'completed' && (
                    <ActionBtn color="green" onClick={() => onStatusChange(a.id, 'completed')}>Marcar concluído</ActionBtn>
                  )}
                  {a.status !== 'no_show' && a.status !== 'cancelled' && (
                    <ActionBtn color="yellow" onClick={() => onStatusChange(a.id, 'no_show')}>Não compareceu</ActionBtn>
                  )}
                  {a.status !== 'cancelled' && (
                    <ActionBtn color="red" onClick={() => onStatusChange(a.id, 'cancelled')}>Cancelar</ActionBtn>
                  )}
                  <button onClick={() => onDelete(a.id)} className="ml-auto px-3 py-1.5 bg-[#1a1a1a] border border-[#252525] text-[#444] text-xs rounded-lg hover:text-red-400 transition-all">
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {editingAppt && (
        <EditModal
          appointment={editingAppt}
          onClose={() => setEditingAppt(null)}
          onSaved={() => { setEditingAppt(null); onReload(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────── CLIENTES ─────────────────── */
function TabClientes() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = (q) => {
    setLoading(true);
    getClients(q).then((r) => setClients(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(''); }, []);

  const handleSearch = (e) => { e.preventDefault(); load(search); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Clientes</h2>
        <span className="text-[#444] text-sm">{clients.length} encontrados</span>
      </div>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..." className="input-field flex-1" />
        <button type="submit" className="btn-primary px-4 py-2 text-sm">Buscar</button>
        <button type="button" onClick={() => { setSearch(''); load(''); }} className="px-4 py-2 bg-[#111] border border-[#1E1E1E] text-[#555] text-sm rounded-xl hover:text-white transition-all">
          Limpar
        </button>
      </form>

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clients.map((c) => (
            <div
              key={c.clientPhone}
              className={`card p-4 cursor-pointer transition-all hover:border-blue-900/50 ${selected === c.clientPhone ? 'border-blue-800/60' : ''}`}
              onClick={() => setSelected(selected === c.clientPhone ? null : c.clientPhone)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-medium">{c.clientName}</p>
                  <p className="text-[#444] text-sm">{c.clientPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-400 font-bold text-sm">{fmtCurrency(c.totalSpent)}</p>
                  <p className="text-[#444] text-xs">{c.totalVisits} visita{c.totalVisits !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {c.lastVisit && <p className="text-[#333] text-xs mt-2">Última: {fmt(c.lastVisit)}</p>}

              {selected === c.clientPhone && (
                <div className="mt-4 border-t border-[#1a1a1a] pt-4 space-y-2">
                  <p className="text-[#444] text-xs mb-3">Histórico</p>
                  {c.appointments.slice(0, 8).map((a) => (
                    <div key={a.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${STATUS_CONFIG[a.status]?.bg}`}>
                      <span className="text-[#aaa] text-xs">{fmt(a.date)} {a.time} · {apptServiceNames(a)}</span>
                      <span className={`text-xs ${STATUS_CONFIG[a.status]?.color}`}>{STATUS_CONFIG[a.status]?.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {clients.length === 0 && <p className="text-[#444] text-sm col-span-2">Nenhum cliente encontrado.</p>}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── SERVIÇOS ─────────────────── */
function TabServicos() {
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', duration: '', description: '', image: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getAllServices().then((r) => setServices(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ name: '', price: '', duration: '', description: '', image: '' }); setEditing('new'); };
  const openEdit = (s) => { setForm({ name: s.name, price: s.price, duration: s.duration, description: s.description, image: s.image || '' }); setEditing(s); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === 'new') await createService(form);
      else await updateService(editing.id, form);
      setEditing(null);
      load();
    } finally { setSaving(false); }
  };

  const handleToggle = async (s) => { await updateService(s.id, { active: !s.active }); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Serviços</h2>
        <button onClick={openNew} className="btn-primary px-4 py-2 text-sm">+ Novo serviço</button>
      </div>

      {editing && (
        <div className="card p-5">
          <h3 className="text-white font-medium mb-4">{editing === 'new' ? 'Novo serviço' : `Editar: ${editing.name}`}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[#444] text-xs block mb-1">Nome</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Corte + Barba" className="input-field" required />
            </div>
            <div>
              <label className="text-[#444] text-xs block mb-1">Preço (R$)</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" className="input-field" required />
            </div>
            <div>
              <label className="text-[#444] text-xs block mb-1">Duração (minutos)</label>
              <input type="number" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="30" className="input-field" required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[#444] text-xs block mb-1">Descrição</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descrição breve do serviço" className="input-field" required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[#444] text-xs block mb-1">Foto do serviço (opcional)</label>
              <div className="flex gap-3 items-start">
                <input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="URL da imagem ou /cortes/corte.jpg" className="input-field flex-1" />
                {form.image && (
                  <img src={form.image} alt="" className="w-14 h-14 rounded-lg object-cover border border-[#1E1E1E] shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                )}
              </div>
              <p className="text-[#333] text-[11px] mt-1">Cole o link de uma foto, ou coloque o arquivo em <span className="text-[#555]">client/public/cortes/</span> e use <span className="text-[#555]">/cortes/nome.jpg</span></p>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="px-5 py-2 bg-[#111] border border-[#1E1E1E] text-[#555] text-sm rounded-xl hover:text-white transition-all">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.id} className={`card p-4 flex items-center justify-between transition-all ${!s.active ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-4 min-w-0">
                {s.image
                  ? <img src={s.image} alt="" className="w-14 h-14 rounded-lg object-cover border border-[#1E1E1E] shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  : <div className="w-14 h-14 rounded-lg bg-[#161616] border border-[#1E1E1E] flex items-center justify-center shrink-0 text-[#333] text-xs">sem foto</div>
                }
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">{s.name}</p>
                    {!s.active && <span className="text-[#444] text-[10px] border border-[#222] px-1.5 py-0.5 rounded shrink-0">inativo</span>}
                  </div>
                  <p className="text-[#444] text-sm truncate">{s.description}</p>
                  <div className="flex gap-4 mt-1">
                    <span className="text-blue-500 text-sm font-medium">{fmtCurrency(s.price)}</span>
                    <span className="text-[#444] text-sm">{s.duration} min</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button onClick={() => openEdit(s)} className="px-3 py-1.5 bg-[#111] border border-[#1E1E1E] text-[#555] text-xs rounded-lg hover:text-white transition-all">Editar</button>
                <button onClick={() => handleToggle(s)} className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${s.active ? 'bg-[#111] border-[#1E1E1E] text-[#555] hover:text-yellow-400' : 'bg-green-900/30 border-green-800/50 text-green-400'}`}>
                  {s.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── CONFIG ─────────────────── */
function TabConfig() {
  const [hours, setHours] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newBlock, setNewBlock] = useState({ date: '', reason: '', startTime: '', endTime: '' });
  const [newRecurring, setNewRecurring] = useState({ clientName: '', dayOfWeek: '1', time: '', notes: '' });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([getBusinessHours(), getDayBlocks(), getRecurringBlocks()])
      .then(([h, b, r]) => { setHours(h.data); setBlocks(b.data); setRecurring(r.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const updateHour = (idx, field, value) => setHours((prev) => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));

  const saveHours = async () => {
    setSaving(true);
    await updateBusinessHours(hours);
    setSaving(false);
  };

  const handleAddBlock = async (e) => {
    e.preventDefault();
    await createDayBlock({ date: newBlock.date, reason: newBlock.reason, startTime: newBlock.startTime || null, endTime: newBlock.endTime || null });
    setNewBlock({ date: '', reason: '', startTime: '', endTime: '' });
    load();
  };

  const handleAddRecurring = async (e) => {
    e.preventDefault();
    await createRecurringBlock(newRecurring);
    setNewRecurring({ clientName: '', dayOfWeek: '1', time: '', notes: '' });
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-10">
      <h2 className="text-xl font-bold text-white">Configurações</h2>

      {/* Horários */}
      <section className="card p-5">
        <h3 className="text-white font-semibold mb-5">Horário de funcionamento</h3>
        <div className="space-y-4">
          {hours.map((h, idx) => (
            <div key={h.dayOfWeek} className="flex flex-wrap items-center gap-3">
              <span className="text-[#888] text-sm w-16">{DAYS_FULL[h.dayOfWeek]}</span>
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => updateHour(idx, 'isOpen', !h.isOpen)}>
                <div className={`w-9 h-5 rounded-full relative transition-all ${h.isOpen ? 'bg-blue-600' : 'bg-[#222]'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${h.isOpen ? 'left-4.5' : 'left-0.5'}`} style={{ left: h.isOpen ? '18px' : '2px' }} />
                </div>
                <span className="text-[#555] text-xs w-14">{h.isOpen ? 'Aberto' : 'Fechado'}</span>
              </label>
              {h.isOpen && (
                <>
                  <div>
                    <label className="text-[#333] text-xs block">Abre</label>
                    <input type="time" value={h.openTime} onChange={(e) => updateHour(idx, 'openTime', e.target.value)} className="input-field py-1.5 text-sm w-28" />
                  </div>
                  <div>
                    <label className="text-[#333] text-xs block">Fecha</label>
                    <input type="time" value={h.closeTime} onChange={(e) => updateHour(idx, 'closeTime', e.target.value)} className="input-field py-1.5 text-sm w-28" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <button onClick={saveHours} disabled={saving} className="btn-primary mt-6 px-5 py-2 text-sm disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar horários'}
        </button>
      </section>

      {/* Bloqueios de dia */}
      <section className="card p-5">
        <h3 className="text-white font-semibold mb-1">Bloqueios de agenda</h3>
        <p className="text-[#444] text-xs mb-5">Bloquear dias específicos (férias, feriados). Sem horário = dia inteiro bloqueado.</p>
        <form onSubmit={handleAddBlock} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div>
            <label className="text-[#444] text-xs block mb-1">Data</label>
            <input type="date" value={newBlock.date} onChange={(e) => setNewBlock((b) => ({ ...b, date: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="text-[#444] text-xs block mb-1">Motivo</label>
            <input value={newBlock.reason} onChange={(e) => setNewBlock((b) => ({ ...b, reason: e.target.value }))} placeholder="ex: Férias" className="input-field" />
          </div>
          <div>
            <label className="text-[#444] text-xs block mb-1">Início (opcional)</label>
            <input type="time" value={newBlock.startTime} onChange={(e) => setNewBlock((b) => ({ ...b, startTime: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="text-[#444] text-xs block mb-1">Fim (opcional)</label>
            <input type="time" value={newBlock.endTime} onChange={(e) => setNewBlock((b) => ({ ...b, endTime: e.target.value }))} className="input-field" />
          </div>
          <button type="submit" className="btn-primary px-4 py-2 text-sm sm:col-span-4">Adicionar bloqueio</button>
        </form>
        <div className="space-y-2">
          {blocks.length === 0 && <p className="text-[#333] text-sm">Nenhum bloqueio cadastrado.</p>}
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3 bg-[#111] border border-[#1E1E1E] rounded-xl">
              <div>
                <p className="text-white text-sm">{fmt(b.date)} · {b.startTime ? `${b.startTime}–${b.endTime}` : 'Dia inteiro'}</p>
                {b.reason && <p className="text-[#444] text-xs">{b.reason}</p>}
              </div>
              <button onClick={() => { deleteDayBlock(b.id).then(load); }} className="text-[#333] hover:text-red-400 text-xs ml-4 transition-colors">Remover</button>
            </div>
          ))}
        </div>
      </section>

      {/* Clientes fixos */}
      <section className="card p-5">
        <h3 className="text-white font-semibold mb-1">Clientes fixos (horários recorrentes)</h3>
        <p className="text-[#444] text-xs mb-5">Reserva permanente por dia da semana.</p>
        <form onSubmit={handleAddRecurring} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div>
            <label className="text-[#444] text-xs block mb-1">Nome</label>
            <input value={newRecurring.clientName} onChange={(e) => setNewRecurring((r) => ({ ...r, clientName: e.target.value }))} placeholder="Nome do cliente" className="input-field" required />
          </div>
          <div>
            <label className="text-[#444] text-xs block mb-1">Dia da semana</label>
            <select value={newRecurring.dayOfWeek} onChange={(e) => setNewRecurring((r) => ({ ...r, dayOfWeek: e.target.value }))} className="input-field">
              {DAYS_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[#444] text-xs block mb-1">Horário</label>
            <input type="time" value={newRecurring.time} onChange={(e) => setNewRecurring((r) => ({ ...r, time: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="text-[#444] text-xs block mb-1">Obs (opcional)</label>
            <input value={newRecurring.notes} onChange={(e) => setNewRecurring((r) => ({ ...r, notes: e.target.value }))} className="input-field" />
          </div>
          <button type="submit" className="btn-primary px-4 py-2 text-sm sm:col-span-4">Adicionar</button>
        </form>
        <div className="space-y-2">
          {recurring.length === 0 && <p className="text-[#333] text-sm">Nenhum cliente fixo cadastrado.</p>}
          {recurring.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 bg-[#111] border border-[#1E1E1E] rounded-xl">
              <div>
                <p className="text-white text-sm">{r.clientName} · {DAYS_FULL[r.dayOfWeek]} às {r.time}</p>
                {r.notes && <p className="text-[#444] text-xs">{r.notes}</p>}
              </div>
              <button onClick={() => { deleteRecurringBlock(r.id).then(load); }} className="text-[#333] hover:text-red-400 text-xs ml-4 transition-colors">Remover</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─────────────────── SHARED ─────────────────── */
function KpiCard({ title, value, sub, color }) {
  const colors = { blue: 'text-blue-400', green: 'text-green-400', gray: 'text-white' };
  return (
    <div className="card p-5">
      <p className="text-[#444] text-xs mb-3">{title}</p>
      <p className={`text-2xl font-bold ${colors[color] || 'text-white'}`}>{value}</p>
      {sub && <p className="text-[#333] text-xs mt-1">{sub}</p>}
    </div>
  );
}

function Info({ label, value, accent, span2 }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <p className="text-[#444] text-xs">{label}</p>
      <p className={`text-sm font-medium ${accent ? 'text-blue-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function ActionBtn({ color, onClick, children }) {
  const styles = {
    blue:   'bg-blue-900/30 border-blue-800/40 text-blue-400 hover:bg-blue-900/50',
    green:  'bg-green-900/40 border-green-800/50 text-green-400 hover:bg-green-900/60',
    yellow: 'bg-yellow-900/30 border-yellow-800/40 text-yellow-400 hover:bg-yellow-900/50',
    red:    'bg-red-900/20 border-red-900/40 text-red-400 hover:bg-red-900/40',
  };
  return (
    <button onClick={onClick} className={`px-3 py-1.5 border text-xs rounded-lg transition-all ${styles[color]}`}>
      {children}
    </button>
  );
}

function EditModal({ appointment, onClose, onSaved }) {
  const [allServices, setAllServices] = useState([]);
  const [form, setForm] = useState({
    clientName:  appointment.clientName,
    clientPhone: appointment.clientPhone,
    date:        appointment.date,
    time:        appointment.time,
    notes:       appointment.notes || '',
    serviceIds:  appointment.services?.map((as) => as.serviceId) || [],
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    getAllServices().then((r) => setAllServices(r.data.filter((s) => s.active)));
  }, []);

  const toggleSvc = (id) =>
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s) => s !== id) : [...f.serviceIds, id],
    }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.serviceIds.length === 0) { setError('Selecione ao menos um serviço'); return; }
    setSaving(true); setError('');
    try {
      await updateAppointment(appointment.id, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar alterações');
    } finally { setSaving(false); }
  };

  const totalDur   = allServices.filter((s) => form.serviceIds.includes(s.id)).reduce((t, s) => t + s.duration, 0);
  const totalPrice = allServices.filter((s) => form.serviceIds.includes(s.id)).reduce((t, s) => t + s.price, 0);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-[#0d0d0d] border border-[#1E1E1E] rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between sticky top-0 bg-[#0d0d0d] z-10">
          <div>
            <h3 className="text-white font-semibold text-sm">Editar agendamento</h3>
            <p className="text-[#444] text-xs">#{appointment.id} · {appointment.clientName}</p>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-5">
          {/* Cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#444] text-xs block mb-1">Nome</label>
              <input value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                className="input-field" required />
            </div>
            <div>
              <label className="text-[#444] text-xs block mb-1">Telefone</label>
              <input type="tel" value={form.clientPhone} onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                className="input-field" required />
            </div>
          </div>

          {/* Data e hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#444] text-xs block mb-1">Data</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="input-field" required />
            </div>
            <div>
              <label className="text-[#444] text-xs block mb-1">Horário</label>
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="input-field" required />
            </div>
          </div>

          {/* Serviços */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[#444] text-xs">Serviços</label>
              {form.serviceIds.length > 0 && (
                <span className="text-[#444] text-xs">{totalDur} min · {fmtCurrency(totalPrice)}</span>
              )}
            </div>
            <div className="space-y-2">
              {allServices.map((s) => {
                const checked = form.serviceIds.includes(s.id);
                return (
                  <label key={s.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                      checked ? 'bg-blue-950/40 border-blue-800/50' : 'bg-[#111] border-[#1E1E1E] hover:border-[#2a2a2a]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'border-blue-500 bg-blue-600' : 'border-[#333]'}`}>
                        {checked && <div className="w-2 h-1.5 bg-white rounded-sm" />}
                      </div>
                      <div>
                        <p className={`text-sm ${checked ? 'text-blue-300' : 'text-white'}`}>{s.name}</p>
                        <p className="text-[#444] text-xs">{s.duration} min</p>
                      </div>
                    </div>
                    <span className="text-[#555] text-sm shrink-0 ml-3">{fmtCurrency(s.price)}</span>
                    <input type="checkbox" className="hidden" checked={checked} readOnly onClick={() => toggleSvc(s.id)} />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-[#444] text-xs block mb-1">Observações</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2} className="input-field resize-none" placeholder="Opcional..." />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900/40 rounded-xl px-3 py-2">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-[#111] border border-[#1E1E1E] text-[#555] py-2.5 rounded-xl text-sm hover:text-white transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-[#222] border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}
