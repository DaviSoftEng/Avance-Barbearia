import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getServices, getBusinessHours } from '../services/api';
import { useInView } from '../hooks/useInView';

function Reveal({ children, className = '', delay = '' }) {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} className={`reveal ${delay} ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Agrupa dias consecutivos com mesmo horário em faixas (ex: Seg–Sex)
function groupHours(hours) {
  if (!hours?.length) return [];
  const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const groups = [];
  let cur = null;
  for (const h of sorted) {
    if (cur && cur.isOpen === h.isOpen && cur.openTime === h.openTime && cur.closeTime === h.closeTime) {
      cur.endDay = h.dayOfWeek;
    } else {
      if (cur) groups.push(cur);
      cur = { startDay: h.dayOfWeek, endDay: h.dayOfWeek, isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime };
    }
  }
  if (cur) groups.push(cur);
  return groups.map((g) => ({
    days:  g.startDay === g.endDay ? DAYS_FULL[g.startDay] : `${DAYS_FULL[g.startDay]} a ${DAYS_FULL[g.endDay]}`,
    hours: g.isOpen ? `${g.openTime} – ${g.closeTime}` : 'Fechado',
    open:  g.isOpen,
  }));
}

function SectionDivider() {
  return <div className="border-t border-[#1A1A1A]" />;
}

export default function Home() {
  const [services, setServices]     = useState([]);
  const [businessHours, setBusinessHours] = useState([]);
  const [cursor, setCursor]         = useState(true);

  useEffect(() => {
    getServices().then((r) => setServices(r.data)).catch(() => {});
    getBusinessHours().then((r) => setBusinessHours(r.data)).catch(() => {});
    const t = setInterval(() => setCursor((c) => !c), 600);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col justify-between px-6 pt-28 pb-16 max-w-6xl mx-auto overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] animate-breathe" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-blue-800/5 blur-[80px] animate-breathe" style={{ animationDelay: '2.5s' }} />

        <div className="relative">
          <p className="section-label mb-8" style={{ animation: 'fadeInUp 0.7s ease 0.1s both' }}>
            Barbearia Avance · Ryann França
          </p>
          <h1
            className="text-[clamp(3rem,8vw,6.5rem)] font-bold leading-[0.92] tracking-tight text-white"
            style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}
          >
            Estilo,<br />Autoestima &<br />
            <span className="shimmer-text">Confiança!</span>
            <span className={`inline-block w-[4px] h-[0.85em] bg-blue-500 ml-2 align-middle rounded-sm transition-opacity ${cursor ? 'opacity-100' : 'opacity-0'}`} />
          </h1>
          <p className="text-[#555] text-lg mt-10 max-w-md leading-relaxed" style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.35s both' }}>
            Agendamento online para quem valoriza o próprio tempo. Escolha o horário, apareça, saia impecável.
          </p>
          <div className="flex items-center gap-5 mt-10" style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.45s both' }}>
            <Link to="/agendar" className="btn-primary px-7 py-3.5 text-sm relative overflow-hidden group">
              <span className="relative z-10">Agendar agora</span>
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </Link>
            <a href="#sobre" className="text-[#444] hover:text-white text-sm transition-colors duration-200">
              Conheça o barbeiro ↓
            </a>
          </div>
        </div>

        <div className="relative flex items-end justify-between mt-20 border-t border-[#1A1A1A] pt-8" style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.55s both' }}>
          <div className="flex gap-12">
            {[['100+', 'Clientes atendidos'], ['2 anos', 'De dedicação'], ['5.0★', 'Avaliação média']].map(([v, l]) => (
              <div key={l}>
                <p className="text-white font-bold text-2xl">{v}</p>
                <p className="text-[#333] text-xs mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <img src="/logo.jpeg" alt="Avance" className="h-14 w-14 rounded-full object-cover opacity-40 animate-float" />
        </div>
      </section>

      {/* ── SOBRE ── */}
      <SectionDivider />
      <section id="sobre">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Foto */}
            <Reveal>
              <div className="relative">
                {/* Troque o src abaixo pela foto real do Ryann */}
                <div className="relative aspect-[3/4] max-w-sm mx-auto lg:mx-0 rounded-2xl overflow-hidden bg-[#111111] border border-[#1E1E1E]">
                  <img
                    src="/barbeiro.png"
                    alt="Ryann França"
                    className="w-full h-full object-cover object-top"
                  />

                  {/* Overlay gradiente na foto */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/60 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Badge flutuante */}
                <div className="absolute -bottom-4 -right-4 lg:right-0 bg-[#111] border border-[#1E1E1E] rounded-2xl px-5 py-3 animate-float" style={{ animationDelay: '1s' }}>
                  <p className="text-white font-bold text-xl">2</p>
                  <p className="text-[#444] text-xs">anos de ofício</p>
                </div>
              </div>
            </Reveal>

            {/* Texto */}
            <Reveal delay="reveal-delay-2">
              <p className="section-label mb-5">Quem sou eu</p>
              <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
                Ryann<br />França
              </h2>
              <p className="text-[#555] leading-relaxed mb-4">
                Com 2 anos de barbearia, o Ryann construiu uma clientela fiel pelo que entrega na cadeira: corte limpo, acabamento preciso e um atendimento que respeita o seu tempo e o seu estilo.
              </p>
              <p className="text-[#444] leading-relaxed mb-8 text-sm">
                Cada detalhe importa aqui — do alinhamento à navalha. Você agenda, chega e sai exatamente como queria.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  'Cortes modernos e degradês',
                  'Acabamento na navalha e alinhamento',
                  'Pontual e atencioso com cada cliente',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="text-blue-500 mt-0.5 shrink-0 text-sm">✓</span>
                    <span className="text-[#666] text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <Link to="/agendar" className="btn-primary inline-block px-6 py-3 text-sm">
                Agendar com Ryann
              </Link>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ── SERVIÇOS ── */}
      <SectionDivider />
      <section id="servicos">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            <Reveal>
              <p className="section-label mb-5">O que fazemos</p>
              <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                Serviços e<br />preços
              </h2>
              <p className="text-[#444] mt-5 leading-relaxed text-sm">
                Cada serviço pensado para valorizar o seu estilo. Sem pressa, sem descuido.
              </p>
              <Link to="/agendar" className="btn-primary inline-block mt-8 px-6 py-3 text-sm">
                Reservar horário
              </Link>
            </Reveal>

            <Reveal delay="reveal-delay-1">
              {services.length > 0 ? (
                <div>
                  {services.map((s, i) => (
                    <div
                      key={s.id}
                      className="relative flex items-center justify-between py-5 border-b border-[#1A1A1A] group cursor-default overflow-hidden"
                      style={{ transitionDelay: `${i * 40}ms` }}
                    >
                      <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-blue-600 origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-300 rounded-full" />
                      <span className="absolute inset-0 bg-blue-600/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300 -mx-3 rounded-xl" />
                      <div className="relative pl-0 group-hover:pl-4 transition-all duration-300">
                        <p className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors duration-300">{s.name}</p>
                        <p className="text-[#333] text-xs mt-0.5 group-hover:text-[#555] transition-colors duration-300">{s.duration} min</p>
                      </div>
                      <p className="relative text-blue-500 font-bold text-lg group-hover:text-blue-400 transition-colors duration-300">
                        R${s.price.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#222]">Carregando...</p>
              )}
            </Reveal>

          </div>
        </div>
      </section>

      {/* ── LOCALIZAÇÃO ── */}
      <SectionDivider />
      <section id="localizacao">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            <Reveal>
              <p className="section-label mb-5">Onde estamos</p>
              <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-8">
                Localização
              </h2>

              <div className="space-y-6">
                <div>
                  <p className="text-[#333] text-xs uppercase tracking-wider mb-2">Endereço</p>
                  <a
                    href="https://maps.google.com/?q=R.+Tupinambás,+16,+Heliópolis,+Belford+Roxo,+RJ"
                    target="_blank" rel="noreferrer"
                    className="text-white font-medium hover:text-blue-400 transition-colors block"
                  >
                    R. Tupinambás, 16 — Heliópolis
                  </a>
                  <p className="text-[#555] text-sm mt-0.5">Belford Roxo — RJ, 26140-330</p>
                </div>

                <div className="h-px bg-[#1A1A1A]" />

                <div>
                  <p className="text-[#333] text-xs uppercase tracking-wider mb-2">Contato</p>
                  <a href="https://instagram.com/barbearia.avance" target="_blank" rel="noreferrer"
                    className="text-[#555] text-sm hover:text-blue-400 transition-colors mt-0.5 block">
                    @barbearia.avance
                  </a>
                </div>

                <div className="h-px bg-[#1A1A1A]" />

                <div>
                  <p className="text-[#333] text-xs uppercase tracking-wider mb-3">Horários</p>
                  {groupHours(businessHours).map(({ days, hours, open }) => (
                    <div key={days} className="flex justify-between py-2.5 border-b border-[#141414]">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-blue-500' : 'bg-[#222]'}`} />
                        <span className="text-[#555] text-sm">{days}</span>
                      </div>
                      <span className={`text-sm font-medium ${open ? 'text-white' : 'text-[#2a2a2a]'}`}>{hours}</span>
                    </div>
                  ))}
                  {businessHours.length === 0 && (
                    <p className="text-[#222] text-sm">Carregando...</p>
                  )}
                </div>
              </div>
            </Reveal>

            {/* Mapa + foto */}
            <Reveal delay="reveal-delay-2">
              <div className="space-y-3">
                {/* Foto da fachada — coloque fachada.jpg em client/public/ */}
                <div className="relative rounded-2xl overflow-hidden border border-[#1E1E1E] bg-[#0e0e0e]">
                  <img
                    src="/fachada.jpg"
                    alt="Barbearia Avance — Fachada"
                    className="w-full h-56 object-cover"
                    onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                  />
                </div>

                {/* Mapa */}
                <div className="relative rounded-2xl overflow-hidden border border-[#1E1E1E] aspect-video bg-[#0e0e0e]">
                  <iframe
                    src="https://maps.google.com/maps?q=Barbearia+Avance+R+Tupinambas+16+Heliopolis+Belford+Roxo+RJ&output=embed&hl=pt-BR&z=16"
                    className="w-full h-full border-0 grayscale"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Localização da Barbearia Avance"
                  />
                  <div className="absolute inset-0 bg-blue-900/10 pointer-events-none" />
                </div>

                <a
                  href="https://maps.google.com/?q=R.+Tupinambás,+16,+Heliópolis,+Belford+Roxo,+RJ"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm border border-[#1E1E1E] text-[#555] rounded-xl hover:text-white hover:border-[#333] transition-all"
                >
                  📍 Abrir no Google Maps
                </a>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <SectionDivider />
      <section>
        <Reveal>
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="relative rounded-3xl border border-[#1E1E1E] p-10 sm:p-14 overflow-hidden hover:border-blue-600/20 transition-colors duration-500 group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-blue-600/0 group-hover:from-blue-600/[0.04] group-hover:to-transparent transition-all duration-700 pointer-events-none rounded-3xl" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
                <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight max-w-sm">
                  Pronto para<br /><span className="text-blue-500">agendar?</span>
                </h2>
                <div className="shrink-0">
                  <p className="text-[#333] text-sm mb-4">Sem ligação. Sem espera. Só estilo.</p>
                  <Link to="/agendar" className="btn-primary inline-block px-8 py-3.5 text-sm">
                    Agendar agora
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#141414]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Avance" className="h-6 w-6 rounded-full object-cover opacity-60" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div>
              <span className="text-[#2a2a2a] text-sm">
                Barbearia <span className="text-blue-600">Avance</span> — Ryann França
              </span>
              <p className="text-[#1e1e1e] text-xs">R. Tupinambás, 16 · Heliópolis · Belford Roxo — RJ</p>
            </div>
          </div>
          <span className="text-[#222] text-xs">© {new Date().getFullYear()} Todos os direitos reservados.</span>
        </div>
      </footer>
    </>
  );
}
