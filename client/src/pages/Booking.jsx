import { useState, useEffect } from 'react';
import { getServices, getAvailableSlots, createAppointment } from '../services/api';

const STEPS = ['Serviços', 'Data', 'Horário', 'Dados', 'Confirmar'];

function fmtCurrency(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

export default function Booking() {
  const [step, setStep]                 = useState(0);
  const [services, setServices]         = useState([]);
  const [selectedServices, setSelectedServices] = useState([]); // array de service objects
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [form, setForm]                 = useState({ name: '', phone: '' });
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [error, setError]               = useState('');

  const today = new Date().toISOString().split('T')[0];

  const totalPrice    = selectedServices.reduce((s, sv) => s + sv.price, 0);
  const totalDuration = selectedServices.reduce((s, sv) => s + sv.duration, 0);

  useEffect(() => {
    getServices().then((r) => setServices(r.data)).catch(() => {});
  }, []);

  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
    // Se mudou os serviços, limpa slots para recarregar
    setSelectedTime('');
    setAvailableSlots([]);
  };

  const loadSlots = async (date) => {
    if (!date || totalDuration === 0) return;
    setSlotsLoading(true);
    try {
      const r = await getAvailableSlots(date, totalDuration);
      setAvailableSlots(r.data.available || []);
    } catch { setAvailableSlots([]); }
    finally { setSlotsLoading(false); }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setSelectedTime('');
    if (date) loadSlots(date);
  };

  // Recarrega slots quando volta para step 2 (caso serviços tenham mudado)
  const goToStep = (n) => {
    if (n === 2 && selectedDate) loadSlots(selectedDate);
    setStep(n);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
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
    setStep(0); setSelectedServices([]); setSelectedDate('');
    setSelectedTime(''); setAvailableSlots([]);
    setForm({ name: '', phone: '' }); setSuccess(false);
    setBookedAppointment(null); setError('');
  };

  if (success) {
    const apptServices = bookedAppointment.services?.map((as) => as.service) || [];
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <p className="text-blue-500 text-4xl font-bold mb-2">✓</p>
          <h2 className="text-3xl font-bold text-white mb-1">Agendado.</h2>
          <p className="text-[#555] text-sm mb-8">Te esperamos no horário marcado.</p>
          <div className="card p-6 space-y-4 mb-6">
            <div>
              <p className="text-[#444] text-xs mb-2">Serviços</p>
              <div className="space-y-1">
                {apptServices.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-white">{s.name}</span>
                    <span className="text-[#555]">{fmtCurrency(s.price)}</span>
                  </div>
                ))}
              </div>
            </div>
            <SummaryRow label="Data"     value={new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} />
            <SummaryRow label="Horário"  value={selectedTime} accent />
            <SummaryRow label="Duração"  value={`${bookedAppointment.totalDuration} min`} />
            <SummaryRow label="Nome"     value={bookedAppointment.clientName} />
            <div className="border-t border-[#1E1E1E] pt-4">
              <SummaryRow label="Total" value={fmtCurrency(bookedAppointment.price)} accent large />
            </div>
          </div>
          <button onClick={reset} className="btn-primary w-full py-3 text-sm">
            Fazer outro agendamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] px-6 py-16">
      <div className="max-w-lg mx-auto">

        <div className="mb-10">
          <p className="section-label mb-3">Barbearia Avance · Ryann França</p>
          <h1 className="text-3xl font-bold text-white">Agendar horário</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`h-[2px] flex-1 transition-all duration-300 ${i === 0 ? 'hidden' : i <= step ? 'bg-blue-600' : 'bg-[#1E1E1E]'}`} />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-200 ${
                i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-[#1A1A1A] text-[#333] border border-[#252525]'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Step 0 — Serviços (multi-select) */}
        {step === 0 && (
          <div>
            <p className="text-[#555] text-sm mb-2">Selecione um ou mais serviços</p>
            <p className="text-[#333] text-xs mb-6">Toque para marcar ou desmarcar</p>
            <div className="divide-y divide-[#1A1A1A] border border-[#1A1A1A] rounded-2xl overflow-hidden mb-5">
              {services.map((s) => {
                const selected = !!selectedServices.find((sv) => sv.id === s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s)}
                    className={`w-full px-5 py-4 text-left flex items-center justify-between transition-colors ${
                      selected ? 'bg-blue-950/60' : 'hover:bg-[#111111]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        selected ? 'border-blue-500 bg-blue-600' : 'border-[#333]'
                      }`}>
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

            {/* Resumo dos serviços selecionados */}
            {selectedServices.length > 0 && (
              <div className="card p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[#555] text-xs">{selectedServices.length} serviço{selectedServices.length !== 1 ? 's' : ''} selecionado{selectedServices.length !== 1 ? 's' : ''}</p>
                  <p className="text-[#444] text-xs">{totalDuration} min no total</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[#555] text-sm">Total</p>
                  <p className="text-white font-bold text-lg">{fmtCurrency(totalPrice)}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(1)}
              disabled={selectedServices.length === 0}
              className="btn-primary w-full py-3 text-sm disabled:opacity-20 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Step 1 — Data */}
        {step === 1 && (
          <div>
            <p className="text-[#555] text-sm mb-1">
              {selectedServices.map((s) => s.name).join(' + ')}
            </p>
            <p className="text-[#333] text-xs mb-6">{totalDuration} min · {fmtCurrency(totalPrice)}</p>
            <div className="card p-5">
              <label className="text-[#444] text-xs block mb-2">Data do agendamento</label>
              <input type="date" min={today} value={selectedDate} onChange={handleDateChange} className="input-field" />
            </div>
            <StepNav onBack={() => setStep(0)} onNext={() => goToStep(2)} disableNext={!selectedDate} />
          </div>
        )}

        {/* Step 2 — Horário */}
        {step === 2 && (
          <div>
            <p className="text-[#555] text-sm mb-1">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
            <p className="text-[#333] text-xs mb-6">Mostrando horários com {totalDuration} min disponíveis</p>
            {slotsLoading ? (
              <div className="card p-10 flex justify-center">
                <div className="w-5 h-5 border-2 border-[#222] border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-[#444] text-sm">Sem horários disponíveis nesta data para a duração selecionada.</p>
              </div>
            ) : (
              <div className="card p-5">
                <p className="text-[#333] text-xs mb-4">{availableSlots.length} horários disponíveis</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                        selectedTime === slot
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#1A1A1A] border border-[#252525] text-[#666] hover:text-white hover:border-[#333]'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} disableNext={!selectedTime} />
          </div>
        )}

        {/* Step 3 — Dados */}
        {step === 3 && (
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
            <StepNav onBack={() => setStep(2)} onNext={() => setStep(4)} disableNext={!form.name || !form.phone} />
          </div>
        )}

        {/* Step 4 — Confirmar */}
        {step === 4 && (
          <div>
            <p className="text-[#555] text-sm mb-6">Revise antes de confirmar</p>
            <div className="card p-5 space-y-4 mb-5">
              <div>
                <p className="text-[#444] text-xs mb-2">Serviços</p>
                <div className="space-y-1.5">
                  {selectedServices.map((s) => (
                    <div key={s.id} className="flex justify-between text-sm">
                      <span className="text-white">{s.name}</span>
                      <span className="text-[#555]">{fmtCurrency(s.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <SummaryRow label="Data"    value={new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')} />
              <SummaryRow label="Horário" value={`${selectedTime} (${totalDuration} min)`} accent />
              <SummaryRow label="Nome"    value={form.name} />
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
              <button onClick={() => setStep(3)} className="flex-1 bg-[#111] hover:bg-[#161616] border border-[#1E1E1E] text-[#888] py-3 rounded-xl text-sm transition-all">
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

function SummaryRow({ label, value, accent, large }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[#444] text-sm">{label}</span>
      <span className={`font-medium ${accent ? 'text-blue-500' : 'text-white'} ${large ? 'text-lg font-bold' : 'text-sm'}`}>
        {value}
      </span>
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
