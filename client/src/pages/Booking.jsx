import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getServices, getAvailableSlots, createAppointment, getBusinessHours, getDayBlocks, getBookingSettings } from '../services/api';

const STEPS = ['Serviços', 'Data & Horário', 'Dados', 'Confirmar'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_WEEK = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function fmtCurrency(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Booking() {
  const [searchParams]                = useSearchParams();
  const [step, setStep]               = useState(0);
  const [services, setServices]       = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate]   = useState('');
  const [selectedTime, setSelectedTime]   = useState('');
  const [slots, setSlots]             = useState([]);
  const [slotsLoading, setSlotsLoading]   = useState(false);
  const [businessHours, setBusinessHours] = useState([]);
  const [dayBlocks, setDayBlocks]     = useState([]);
  const [windowDays, setWindowDays]   = useState(7);
  const [calMonth, setCalMonth]       = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [form, setForm]               = useState({ name: '', phone: '' });
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [error, setError]             = useState('');

  const today     = toISO(new Date());
  const maxDate   = (() => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() + windowDays); return toISO(d); })();
  const totalPrice    = selectedServices.reduce((s, sv) => s + sv.price, 0);
  const totalDuration = selectedServices.reduce((s, sv) => s + sv.duration, 0);

  useEffect(() => {
    getServices().then((r) => {
      setServices(r.data);
      // Pré-seleciona o serviço vindo da home (?servico=ID)
      const preId = searchParams.get('servico');
      if (preId) {
        const found = r.data.find((s) => String(s.id) === preId);
        if (found) setSelectedServices([found]);
      }
    }).catch(() => {});
    Promise.all([getBusinessHours(), getDayBlocks(), getBookingSettings()])
      .then(([h, b, s]) => {
        setBusinessHours(h.data);
        setDayBlocks(b.data);
        if (s.data?.bookingWindowDays) setWindowDays(s.data.bookingWindowDays);
      })
      .catch(() => {});
  }, []);

  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
    setSelectedTime('');
    setSlots([]);
  };

  const loadSlots = useCallback(async (date, duration) => {
    setSlotsLoading(true);
    setSlots([]);
    setSelectedTime('');
    try {
      const r = await getAvailableSlots(date, duration);
      setSlots(r.data.available || []);
    } catch { setSlots([]); }
    finally { setSlotsLoading(false); }
  }, []);

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    loadSlots(dateStr, totalDuration);
  };

  const isDayUnavailable = (dateStr) => {
    if (dateStr < today) return true;
    if (dateStr > maxDate) return true; // além da janela de agendamento
    const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
    const bh = businessHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (bh && !bh.isOpen) return true;
    const block = dayBlocks.find((b) => b.date === dateStr && !b.startTime);
    if (block) return true;
    return false;
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const r = await createAppointment({
        clientName:  form.name,
        clientPhone: form.phone,
        serviceIds:  selectedServices.map((s) => s.id),
        date:        selectedDate,
        time:        selectedTime,
      });
      setBookedAppointment(r.data);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao agendar. Tente novamente.');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep(0); setSelectedServices([]); setSelectedDate(''); setSelectedTime('');
    setSlots([]); setForm({ name: '', phone: '' }); setSuccess(false);
    setBookedAppointment(null); setError('');
  };

  // ─── Tela de sucesso ───────────────────────────────────────────────────────
  if (success) {
    const apptServices = bookedAppointment.services?.map((as) => as.service) || [];
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="w-12 h-12 rounded-full bg-blue-600/15 border border-blue-600/30 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">Agendado.</h2>
          <p className="text-[#555] text-sm mb-8">Te esperamos no horário marcado.</p>
          <div className="card p-6 space-y-4 mb-6">
            <div>
              <p className="text-[#444] text-xs mb-2">Serviços</p>
              {apptServices.map((s) => (
                <div key={s.id} className="flex justify-between text-sm py-0.5">
                  <span className="text-white">{s.name}</span>
                  <span className="text-[#555]">{fmtCurrency(s.price)}</span>
                </div>
              ))}
            </div>
            <SummaryRow label="Data"    value={new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} />
            <SummaryRow label="Horário" value={selectedTime} accent />
            <SummaryRow label="Duração" value={`${bookedAppointment.totalDuration} min`} />
            <SummaryRow label="Nome"    value={bookedAppointment.clientName} />
            <div className="border-t border-[#1E1E1E] pt-4">
              <SummaryRow label="Total" value={fmtCurrency(bookedAppointment.price)} accent large />
            </div>
          </div>
          <button onClick={reset} className="btn-primary w-full py-3 text-sm">Fazer outro agendamento</button>
        </div>
      </div>
    );
  }

  // ─── Flow principal ────────────────────────────────────────────────────────
  return (
    <div className="min-h-[80vh] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <p className="section-label mb-3">Barbearia Avance · Ryann França</p>
          <h1 className="text-3xl font-bold text-white">Agendar horário</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`h-[2px] flex-1 transition-all duration-300 ${i === 0 ? 'hidden' : i <= step ? 'bg-blue-600' : 'bg-[#1E1E1E]'}`} />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-[#1A1A1A] text-[#333] border border-[#252525]'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
            </div>
          ))}
        </div>

        {/* ── Step 0: Serviços ─────────────────────────────────────────── */}
        {step === 0 && (
          <div>
            <p className="text-[#555] text-sm mb-2">Selecione um ou mais serviços</p>
            <p className="text-[#333] text-xs mb-6">Toque para marcar ou desmarcar</p>
            <div className="divide-y divide-[#1A1A1A] border border-[#1A1A1A] rounded-2xl overflow-hidden mb-5">
              {services.map((s) => {
                const selected = !!selectedServices.find((sv) => sv.id === s.id);
                return (
                  <button key={s.id} onClick={() => toggleService(s)}
                    className={`w-full px-5 py-4 text-left flex items-center justify-between transition-colors ${selected ? 'bg-blue-950/60' : 'hover:bg-[#111]'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-blue-500 bg-blue-600' : 'border-[#333]'}`}>
                        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium transition-colors ${selected ? 'text-blue-300' : 'text-white'}`}>{s.name}</p>
                        <p className="text-[#444] text-xs mt-0.5">{s.duration} min · {s.description}</p>
                      </div>
                    </div>
                    <p className={`font-bold text-sm ml-4 shrink-0 ${selected ? 'text-blue-400' : 'text-blue-500'}`}>{fmtCurrency(s.price)}</p>
                  </button>
                );
              })}
            </div>
            {selectedServices.length > 0 && (
              <div className="card p-4 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[#555] text-xs">{selectedServices.length} serviço{selectedServices.length !== 1 ? 's' : ''} · {totalDuration} min</p>
                  <p className="text-white font-bold text-lg mt-0.5">{fmtCurrency(totalPrice)}</p>
                </div>
                <button onClick={() => setStep(1)} className="btn-primary px-6 py-2.5 text-sm">
                  Continuar →
                </button>
              </div>
            )}
            {selectedServices.length === 0 && (
              <button disabled className="btn-primary w-full py-3 text-sm opacity-20 cursor-not-allowed">Continuar</button>
            )}
          </div>
        )}

        {/* ── Step 1: Calendário + Horários ──────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[#555] text-xs">{selectedServices.map((s) => s.name).join(' + ')}</p>
                <p className="text-[#333] text-xs">{totalDuration} min · {fmtCurrency(totalPrice)}</p>
              </div>
              <button onClick={() => setStep(0)} className="text-[#444] hover:text-white text-xs transition-colors">← Serviços</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Calendário */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCalMonth((m) => {
                    const d = new Date(m.year, m.month - 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })} className="text-[#555] hover:text-white px-2 text-lg transition-colors">‹</button>
                  <p className="text-white text-sm font-medium">{MONTHS[calMonth.month]} {calMonth.year}</p>
                  <button onClick={() => setCalMonth((m) => {
                    const d = new Date(m.year, m.month + 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })} className="text-[#555] hover:text-white px-2 text-lg transition-colors">›</button>
                </div>

                {/* Cabeçalho dias da semana */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS_WEEK.map((d) => (
                    <p key={d} className="text-center text-[#333] text-xs py-1">{d}</p>
                  ))}
                </div>

                {/* Dias */}
                <CalendarGrid
                  year={calMonth.year}
                  month={calMonth.month}
                  today={today}
                  selectedDate={selectedDate}
                  isDayUnavailable={isDayUnavailable}
                  onDayClick={handleDayClick}
                />

                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#141414]">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-600" /><span className="text-[#444] text-xs">Selecionado</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]" /><span className="text-[#444] text-xs">Fechado / Passado</span></div>
                </div>
                <p className="text-[#333] text-[11px] mt-3">Agenda aberta para os próximos {windowDays} dias.</p>
              </div>

              {/* Horários */}
              <div className="card p-4">
                {!selectedDate ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10">
                    <svg className="w-9 h-9 mb-3 text-[#2a2a2a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4.5" width="18" height="16" rx="2" />
                      <path strokeLinecap="round" d="M3 9h18M8 2.5v4M16 2.5v4" />
                    </svg>
                    <p className="text-[#444] text-sm">Selecione uma data no calendário para ver os horários disponíveis</p>
                  </div>
                ) : slotsLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="w-5 h-5 border-2 border-[#222] border-t-blue-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div>
                    <p className="text-white text-sm font-medium mb-1 capitalize">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </p>
                    <p className="text-[#444] text-xs mb-4">
                      {slots.length > 0 ? `${slots.length} horário${slots.length !== 1 ? 's' : ''} disponível${slots.length !== 1 ? 'is' : ''}` : 'Sem horários disponíveis'}
                    </p>
                    {slots.length === 0 ? (
                      <p className="text-[#333] text-sm text-center py-6">Tente outra data.</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                        {slots.map((slot) => (
                          <button key={slot} onClick={() => setSelectedTime(slot)}
                            className={`py-3 rounded-xl text-sm font-medium transition-all ${
                              selectedTime === slot
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#111] border border-[#1E1E1E] text-[#888] hover:text-white hover:border-[#333]'
                            }`}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(0)} className="flex-1 bg-[#111] hover:bg-[#161616] border border-[#1E1E1E] text-[#888] py-3 rounded-xl text-sm transition-all">
                Voltar
              </button>
              <button onClick={() => setStep(2)} disabled={!selectedDate || !selectedTime}
                className="flex-1 btn-primary py-3 text-sm disabled:opacity-20 disabled:cursor-not-allowed">
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Dados ────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <p className="text-[#555] text-sm mb-6">Seus dados para confirmação</p>
            <div className="card p-5 space-y-4">
              <div>
                <label className="text-[#444] text-xs block mb-2">Nome completo</label>
                <input type="text" placeholder="João Silva" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-[#444] text-xs block mb-2">Telefone / WhatsApp</label>
                <input type="tel" placeholder="(11) 99999-9999" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input-field" />
              </div>
            </div>
            <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} disableNext={!form.name || !form.phone} />
          </div>
        )}

        {/* ── Step 3: Confirmar ─────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <p className="text-[#555] text-sm mb-6">Revise antes de confirmar</p>
            <div className="card p-5 space-y-4 mb-5">
              <div>
                <p className="text-[#444] text-xs mb-2">Serviços</p>
                {selectedServices.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm py-0.5">
                    <span className="text-white">{s.name}</span>
                    <span className="text-[#555]">{fmtCurrency(s.price)}</span>
                  </div>
                ))}
              </div>
              <SummaryRow label="Data"     value={new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} />
              <SummaryRow label="Horário"  value={`${selectedTime} (${totalDuration} min)`} accent />
              <SummaryRow label="Nome"     value={form.name} />
              <SummaryRow label="Telefone" value={form.phone} />
              <div className="border-t border-[#1E1E1E] pt-4">
                <SummaryRow label="Total" value={fmtCurrency(totalPrice)} accent large />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 bg-[#111] hover:bg-[#161616] border border-[#1E1E1E] text-[#888] py-3 rounded-xl text-sm transition-all">
                Voltar
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 btn-primary py-3 text-sm disabled:opacity-30 disabled:cursor-not-allowed">
                {loading ? 'Confirmando...' : 'Confirmar agendamento'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Componente do calendário ───────────────────────────────────────────────
function CalendarGrid({ year, month, today, selectedDate, isDayUnavailable, onDayClick }) {
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  // Células vazias antes do dia 1
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="grid grid-cols-7 gap-1">
      {cells.map((day, idx) => {
        if (!day) return <div key={`e-${idx}`} />;
        const dateStr    = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const unavailable = isDayUnavailable(dateStr);
        const isToday    = dateStr === today;
        const isSelected = dateStr === selectedDate;

        return (
          <button
            key={dateStr}
            disabled={unavailable}
            onClick={() => onDayClick(dateStr)}
            className={`aspect-square rounded-lg text-sm font-medium transition-all flex items-center justify-center
              ${isSelected  ? 'bg-blue-600 text-white'
              : unavailable ? 'text-[#2a2a2a] cursor-not-allowed bg-[#0d0d0d]'
              : isToday     ? 'text-blue-400 border border-blue-900 hover:bg-blue-950/40'
              : 'text-[#888] hover:bg-[#141414] hover:text-white'}`}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function SummaryRow({ label, value, accent, large }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[#444] text-sm">{label}</span>
      <span className={`font-medium ${accent ? 'text-blue-500' : 'text-white'} ${large ? 'text-lg font-bold' : 'text-sm'}`}>{value}</span>
    </div>
  );
}

function StepNav({ onBack, onNext, disableNext }) {
  return (
    <div className="flex gap-3 mt-5">
      <button onClick={onBack} className="flex-1 bg-[#111] hover:bg-[#161616] border border-[#1E1E1E] text-[#888] py-3 rounded-xl text-sm transition-all">
        Voltar
      </button>
      <button onClick={onNext} disabled={disableNext}
        className="flex-1 btn-primary py-3 text-sm disabled:opacity-20 disabled:cursor-not-allowed">
        Continuar
      </button>
    </div>
  );
}
