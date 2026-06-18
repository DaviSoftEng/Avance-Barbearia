import { useState, useEffect } from 'react';
import { lookupAppointment, getBookingSettings } from '../services/api';
import { maskPhone, isValidBRPhone } from '../utils/phone';

const STATUS = {
  confirmed: { label: 'Confirmado', color: 'text-blue-400' },
  completed: { label: 'Concluído', color: 'text-green-400' },
  no_show:   { label: 'Não compareceu', color: 'text-yellow-400' },
  cancelled: { label: 'Cancelado', color: 'text-[#555]' },
};

function fmtDate(date) {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}
function fmtCurrency(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

export default function MeuAgendamento() {
  const [phone, setPhone] = useState('');
  const [appointments, setAppointments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    getBookingSettings()
      .then((s) => { if (s.data?.whatsapp) setWhatsapp(s.data.whatsapp); })
      .catch(() => {});
  }, []);

  const waCancelUrl = (a) => {
    if (!whatsapp) return null;
    const msg =
      `Olá, Ryann! Preciso cancelar / remarcar meu agendamento.\n\n` +
      `*Nome:* ${a.clientName}\n` +
      `*Data:* ${new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR')}\n` +
      `*Horário:* ${a.time}`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!isValidBRPhone(phone)) { setError('Digite um número válido com DDD (ex: (21) 98035-0062).'); return; }
    setLoading(true);
    setError('');
    setAppointments(null);
    try {
      const r = await lookupAppointment(phone.trim());
      setAppointments(r.data);
    } catch {
      setError('Erro ao buscar agendamentos. Verifique o número e tente novamente.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] px-6 py-16">
      <div className="max-w-lg mx-auto">
        <p className="section-label mb-3">Barbearia Avance · Ryann França</p>
        <h1 className="text-3xl font-bold text-white mb-2">Meu agendamento</h1>
        <p className="text-[#444] text-sm mb-10">Consulte seu horário usando o número de telefone que usou no agendamento. Para cancelar ou remarcar, fale direto com o Ryann.</p>

        <form onSubmit={handleSearch} className="card p-5 space-y-4 mb-6">
          <div>
            <label className="text-[#444] text-xs block mb-2">Telefone / WhatsApp</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="(21) 98035-0062"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              className="input-field"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm disabled:opacity-40">
            {loading ? 'Buscando...' : 'Buscar agendamentos'}
          </button>
        </form>

        {error && (
          <div className="bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {appointments !== null && (
          <div>
            {appointments.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-white font-medium mb-1">Nenhum agendamento encontrado</p>
                <p className="text-[#444] text-sm">Verifique o número informado ou faça um novo agendamento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[#444] text-xs">{appointments.length} agendamento{appointments.length !== 1 ? 's' : ''} encontrado{appointments.length !== 1 ? 's' : ''}</p>
                {appointments.map((a) => (
                  <div key={a.id} className="card p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-semibold capitalize">{fmtDate(a.date)}</p>
                        <p className="text-blue-400 text-2xl font-bold">{a.time}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full bg-[#111] border border-[#1E1E1E] ${STATUS[a.status]?.color}`}>
                        {STATUS[a.status]?.label}
                      </span>
                    </div>

                    <div className="border-t border-[#1A1A1A] pt-4 space-y-2 text-sm">
                      <Row label="Serviço" value={a.services?.map((as) => as.service?.name).filter(Boolean).join(' + ') || '—'} />
                      <Row label="Duração" value={`${a.totalDuration} min`} />
                      <Row label="Valor" value={fmtCurrency(a.price)} accent />
                    </div>

                    {a.status === 'confirmed' && (
                      waCancelUrl(a) ? (
                        <a
                          href={waCancelUrl(a)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2.5 text-sm bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
                        >
                          Cancelar / remarcar com o Ryann
                        </a>
                      ) : (
                        <p className="text-center text-[#555] text-xs">Para cancelar ou remarcar, entre em contato com o Ryann.</p>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-10 text-center">
          <a href="/agendar" className="text-blue-500 text-sm hover:text-blue-400 transition-colors">
            Fazer novo agendamento →
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#444]">{label}</span>
      <span className={`font-medium ${accent ? 'text-blue-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}
