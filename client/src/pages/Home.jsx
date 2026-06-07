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

function fmtCurrency(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

const IMAGE_FALLBACK = {
  'infantil':                          '/cortes/infantil.jpeg',
  'sobrancelha':                       '/cortes/sobrancelha.jpeg',
  'pigmentação':                       '/cortes/pigmentacao.jpeg',
  'acabamento + pigmentação':          '/cortes/acabamento-pigmentacao.jpeg',
  'barba':                             '/cortes/barba.jpeg',
  'corte':                             '/cortes/corte.jpeg',
  'corte + cavanhaque e pigmentação':  '/cortes/corte-cavanhaque-pigmentacao.jpeg',
  'corte + pigmentação':               '/cortes/corte-pigmentacao.jpeg',
  'corte + barba':                     '/cortes/corte-barba.jpeg',
  'corte + barba e sobrancelha':       '/cortes/corte-barba-sobrancelha.jpeg',
  'corte + nevou':                     '/cortes/corte-nevou.jpeg',
  'corte + reflexo':                   '/cortes/corte-reflexo.jpeg',
  'corte + vermelhou':                 '/cortes/corte-vermelhou.jpeg',
};

function resolveImage(s) {
  return s.image || IMAGE_FALLBACK[s.name?.toLowerCase()] || null;
}

// Dados de contato — preencha whatsapp e email quando tiver
const CONTACT = {
  whatsapp: '',                 // só números com DDI/DDD, ex: '5521999999999'
  email: '',                    // ex: 'contato@barbeariaavance.com'
  instagram: 'barbearia.avance',
  addressLine1: 'R. Tupinambás, 16 — Heliópolis',
  addressLine2: 'Belford Roxo · RJ, 26140-330',
  mapsUrl: 'https://maps.google.com/?q=R.+Tupinambás,+16,+Heliópolis,+Belford+Roxo,+RJ',
};

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
  const [galleryOpen, setGalleryOpen]     = useState(false);
  const [detailService, setDetailService] = useState(null);

  useEffect(() => {
    getServices().then((r) => setServices(r.data)).catch(() => {});
    getBusinessHours().then((r) => setBusinessHours(r.data)).catch(() => {});
  }, []);

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-screen -mt-[73px] flex flex-col justify-between overflow-hidden">
        {/* Fundo: foto da barbearia com efeito de vidro fosco */}
        <div className="absolute inset-0 z-0">
          <img src="/fundo.png" alt="" className="w-full h-full object-cover scale-105 blur-[2px]" />
          {/* Vidro fosco (escurece e dá o efeito translúcido) */}
          <div className="absolute inset-0 backdrop-blur-[3px] bg-[#0A0A0A]/70" />
          {/* Degradê para fundir com o resto da página e dar contraste ao texto */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-[#0A0A0A]/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/70 via-transparent to-transparent" />
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-36 pb-16 flex flex-col justify-between min-h-screen">
          <div className="relative">
            <p className="section-label mb-8" style={{ animation: 'fadeInUp 0.7s ease 0.1s both' }}>
              Barbearia Avance · Ryann França
            </p>
            <h1
              className="text-[clamp(3rem,8vw,6.5rem)] font-bold leading-[0.92] tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]"
              style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}
            >
              Estilo,<br />Autoestima &<br />
              <span className="text-blue-500">Confiança.</span>
            </h1>
            <p className="text-white/70 text-lg mt-10 max-w-md leading-relaxed" style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.35s both' }}>
              Agendamento online para quem valoriza o próprio tempo. Escolha o horário, apareça, saia impecável.
            </p>
            <div className="flex items-center gap-5 mt-10" style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.45s both' }}>
              <Link to="/agendar" className="btn-primary px-7 py-3.5 text-sm relative overflow-hidden group">
                <span className="relative z-10">Agendar agora</span>
                <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </Link>
              <a href="#sobre" className="text-white/60 hover:text-white text-sm transition-colors duration-200">
                Conheça o barbeiro ↓
              </a>
            </div>
          </div>

          <div className="relative flex items-end justify-between mt-20 border-t border-white/10 pt-8" style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.55s both' }}>
            <div className="flex gap-10 sm:gap-12">
              {[['Heliópolis', 'Belford Roxo · RJ'], ['Seg a Sáb', 'Com hora marcada'], ['Online', 'Agende em segundos']].map(([v, l]) => (
                <div key={l}>
                  <p className="text-white font-bold text-lg sm:text-2xl">{v}</p>
                  <p className="text-white/45 text-xs mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <img src="/logo.jpeg" alt="Avance" className="h-14 w-14 rounded-full object-cover opacity-70 border border-white/10" />
          </div>
        </div>
      </section>

      {/* ── SERVIÇOS ── */}
      <SectionDivider />
      <section id="servicos">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <Reveal className="text-center max-w-xl mx-auto mb-12">
            <p className="section-label mb-4">O que fazemos</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Serviços que <span className="text-blue-500">valorizam você</span>
            </h2>
            <p className="text-[#555] mt-5 leading-relaxed">
              Do corte clássico ao degradê moderno. Escolha, agende e apareça.
            </p>
          </Reveal>

          <Reveal delay="reveal-delay-1">
            {services.length > 0 ? (
              <ServicesCarousel services={services} onOpen={setDetailService} />
            ) : (
              <p className="text-[#222] text-center">Carregando...</p>
            )}
          </Reveal>

          {services.length > 0 && (
            <div className="text-center mt-10">
              <button
                onClick={() => setGalleryOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#1E1E1E] text-[#888] hover:text-white hover:border-[#333] transition-all text-sm"
              >
                Ver todos os serviços
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 5l5 5-5 5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── SOBRE ── */}
      <SectionDivider />
      <section id="sobre">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Foto */}
            <Reveal>
              <div className="relative aspect-[3/4] max-w-sm mx-auto lg:mx-0 rounded-2xl overflow-hidden bg-[#111111] border border-[#1E1E1E]">
                <img
                  src="/barbeiro.png"
                  alt="Ryann França"
                  className="w-full h-full object-cover object-top"
                />

                {/* Degradê + assinatura sobre a foto */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-5 left-5">
                  <p className="text-white font-semibold">Ryann França</p>
                  <p className="text-blue-400 text-xs tracking-wide">Barbeiro · Avance</p>
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
                A Barbearia Avance nasceu da crença de que cuidar da aparência é, antes de tudo, um ato de respeito próprio. Ryann França percebeu que muitos homens deixam isso de lado no dia a dia — e criou um espaço onde você para, é bem atendido e sai se sentindo no seu melhor.
              </p>
              <p className="text-[#444] leading-relaxed mb-8 text-sm">
                Com 2 anos de ofício e dedicação em cada atendimento, Ryann une técnica e atenção genuína ao cliente. Aqui não é só corte de cabelo — é o momento da semana que você reserva pra si mesmo.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  'Cortes modernos e degradês',
                  'Acabamento na navalha e alinhamento',
                  'Pontual e atencioso com cada cliente',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10.5l3.5 3.5L15 6" />
                    </svg>
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
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  Abrir no Google Maps
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
      <footer className="border-t border-[#141414] bg-[#080808]">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

            {/* Marca */}
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo.jpeg" alt="Avance" className="h-8 w-8 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="text-white font-semibold">Barbearia <span className="text-blue-500">Avance</span></span>
              </div>
              <p className="text-[#555] text-sm leading-relaxed max-w-xs">
                Estilo, autoestima e confiança em cada corte. Agende online e saia impecável.
              </p>
            </div>

            {/* Links rápidos */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Navegação</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#servicos" className="text-[#555] hover:text-white transition-colors">Serviços</a></li>
                <li><a href="#sobre" className="text-[#555] hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#localizacao" className="text-[#555] hover:text-white transition-colors">Localização</a></li>
                <li><Link to="/agendar" className="text-[#555] hover:text-white transition-colors">Agendamento</Link></li>
                <li><Link to="/meu-agendamento" className="text-[#555] hover:text-white transition-colors">Meu horário</Link></li>
              </ul>
            </div>

            {/* Contato */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Contato</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href={CONTACT.mapsUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2.5 text-[#555] hover:text-white transition-colors">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                    <span>{CONTACT.addressLine1}<br />{CONTACT.addressLine2}</span>
                  </a>
                </li>
                {CONTACT.whatsapp && (
                  <li>
                    <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-[#555] hover:text-white transition-colors">
                      <svg className="w-4 h-4 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.578-.985z" /></svg>
                      WhatsApp
                    </a>
                  </li>
                )}
                {CONTACT.email && (
                  <li>
                    <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2.5 text-[#555] hover:text-white transition-colors break-all">
                      <svg className="w-4 h-4 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8 6 8-6" /></svg>
                      {CONTACT.email}
                    </a>
                  </li>
                )}
                <li>
                  <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-[#555] hover:text-white transition-colors">
                    <svg className="w-4 h-4 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                    @{CONTACT.instagram}
                  </a>
                </li>
              </ul>
            </div>

            {/* Horário */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Horário</h4>
              <ul className="space-y-2 text-sm">
                {groupHours(businessHours).map(({ days, hours, open }) => (
                  <li key={days} className="flex flex-col">
                    <span className="text-[#777]">{days}</span>
                    <span className={open ? 'text-[#aaa]' : 'text-[#3a3a3a]'}>{hours}</span>
                  </li>
                ))}
                {businessHours.length === 0 && <li className="text-[#333]">—</li>}
              </ul>
            </div>

          </div>

          <div className="border-t border-[#141414] mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[#333] text-xs">© {new Date().getFullYear()} Barbearia Avance · Ryann França — Todos os direitos reservados.</span>
            <span className="text-[#222] text-xs">Heliópolis · Belford Roxo — RJ</span>
          </div>
        </div>
      </footer>

      {/* Modais de serviços */}
      {galleryOpen && (
        <ServicesGalleryModal
          services={services}
          onClose={() => setGalleryOpen(false)}
          onOpen={(s) => { setGalleryOpen(false); setDetailService(s); }}
        />
      )}
      {detailService && (
        <ServiceDetailModal service={detailService} onClose={() => setDetailService(null)} />
      )}
    </>
  );
}

/* ─── Ícones ─────────────────────────────────────────────────────────────── */
function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="7.25" />
      <path strokeLinecap="round" d="M10 6v4l2.5 1.5" />
    </svg>
  );
}
function ScissorsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 7.5L20 18M8.5 16.5L20 6" />
    </svg>
  );
}

/* ─── Card de serviço (reutilizado no carrossel e na galeria) ────────────── */
function ServiceCard({ s, onOpen }) {
  return (
    <button
      onClick={() => onOpen(s)}
      className="group/card relative w-full text-left rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:border-blue-500/40 hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-300"
    >
      {/* Foto */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {/* Placeholder base */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#161616] to-[#0c0c0c]">
          <ScissorsIcon className="w-10 h-10 text-[#262626]" />
        </div>
        {resolveImage(s) && (
          <img
            src={resolveImage(s)}
            alt={s.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover/card:scale-105"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        {/* Funde a base da foto com o painel de vidro */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Painel de vidro com infos */}
      <div className="relative px-4 py-3.5 border-t border-white/10 bg-white/[0.02] backdrop-blur-md">
        <p className="text-white font-semibold leading-snug line-clamp-2 min-h-[2.6em]">{s.name}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {s.price > 0
            ? <span className="text-blue-400 font-bold">{fmtCurrency(s.price)}</span>
            : <span className="text-blue-400 font-semibold text-sm">{s.description || 'Consultar'}</span>}
          <span className="text-[#888] text-xs flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> {s.duration} min</span>
        </div>
      </div>

      {/* Brilho premium no hover */}
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 group-hover/card:ring-blue-500/25 transition-all duration-300" />
    </button>
  );
}

/* ─── Carrossel contínuo (esteira girando em loop) ───────────────────────── */
function ServicesCarousel({ services, onOpen }) {
  // Duplica a lista para o loop ser perfeito (translada exatamente 50%)
  const loop = [...services, ...services];
  // Velocidade constante: ~6s por card
  const duration = Math.max(services.length * 6, 18);

  return (
    <div className="group relative overflow-hidden">
      {/* Fades nas bordas para o efeito de esteira */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-[#0A0A0A] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-[#0A0A0A] to-transparent" />

      <div
        className="flex w-max animate-marquee group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${duration}s` }}
      >
        {loop.map((s, i) => (
          <div key={`${s.id}-${i}`} className="shrink-0 w-[58%] sm:w-[280px] lg:w-[260px] mr-4">
            <ServiceCard s={s} onOpen={onOpen} />
          </div>
        ))}
      </div>

      <p className="text-center text-[#333] text-xs mt-4">Passe o mouse para pausar · toque em um serviço para ver detalhes</p>
    </div>
  );
}

/* ─── Galeria completa (modal) ───────────────────────────────────────────── */
function ServicesGalleryModal({ services, onClose, onOpen }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 py-6" onClick={onClose}>
      <div className="bg-[#0c0c0c] border border-[#1E1E1E] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between sticky top-0 bg-[#0c0c0c] z-10">
          <div>
            <p className="section-label mb-1">Catálogo completo</p>
            <h3 className="text-white font-bold text-lg">Todos os serviços</h3>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {services.map((s) => (
            <ServiceCard key={s.id} s={s} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Detalhe de um serviço (modal) ──────────────────────────────────────── */
function ServiceDetailModal({ service, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 py-6" onClick={onClose}>
      <div className="bg-[#0c0c0c] border border-[#1E1E1E] rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-[16/10] bg-gradient-to-br from-[#161616] to-[#0c0c0c]">
          <div className="absolute inset-0 flex items-center justify-center"><ScissorsIcon className="w-12 h-12 text-[#262626]" /></div>
          {resolveImage(service) && (
            <img src={resolveImage(service)} alt={service.name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white flex items-center justify-center hover:bg-black/70 transition-all text-xl leading-none">×</button>
        </div>
        <div className="p-6">
          <h3 className="text-white font-bold text-xl">{service.name}</h3>
          <p className="text-[#666] text-sm mt-2 leading-relaxed">{service.description}</p>
          <div className="flex items-center gap-5 mt-4">
            {service.price > 0
              ? <span className="text-blue-400 font-bold text-2xl">{fmtCurrency(service.price)}</span>
              : <span className="text-blue-400 font-semibold text-lg">A partir de 5 anos</span>}
            <span className="text-[#888] text-sm flex items-center gap-1.5"><ClockIcon className="w-4 h-4" /> {service.duration} min</span>
          </div>
          <Link to={`/agendar?servico=${service.id}`} className="btn-primary w-full py-3 text-sm text-center block mt-6">
            Agendar este serviço
          </Link>
        </div>
      </div>
    </div>
  );
}
