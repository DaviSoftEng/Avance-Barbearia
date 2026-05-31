import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { label: 'Serviços',    href: '/#servicos'    },
  { label: 'Sobre',       href: '/#sobre'       },
  { label: 'Localização', href: '/#localizacao' },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location]);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled || !isHome
        ? 'border-b border-[#1A1A1A] bg-[#0A0A0A]/98 backdrop-blur-xl'
        : 'border-b border-transparent bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <img
            src="/logo.jpeg"
            alt="Avance"
            className="h-7 w-7 rounded-full object-cover transition-opacity duration-200 group-hover:opacity-80"
          />
          <span className="text-white font-semibold text-sm tracking-tight">
            Barbearia <span className="text-blue-500">Avance</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="btn-ghost">
              {l.label}
            </a>
          ))}

          <div className="w-px h-4 bg-[#1E1E1E] mx-1" />

          {user ? (
            <>
              <Link to="/admin" className="btn-ghost">Painel</Link>
              <button onClick={() => { signOut(); navigate('/'); }} className="btn-ghost hover:text-red-400">
                Sair
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-ghost">Entrar</Link>
          )}

          <Link to="/meu-agendamento" className="btn-ghost">Meu horário</Link>
          <Link to="/agendar" className="btn-primary ml-2 px-5 py-2 text-sm">
            Agendar
          </Link>
        </div>

        {/* Mobile: hamburger + agendar */}
        <div className="flex md:hidden items-center gap-3">
          <Link to="/agendar" className="btn-primary px-4 py-2 text-sm">
            Agendar
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-[#666] hover:text-white transition-colors p-1"
            aria-label="Menu"
          >
            <div className="space-y-1.5">
              <span className={`block h-px w-5 bg-current transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-px w-5 bg-current transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
              <span className={`block h-px w-5 bg-current transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden border-t border-[#1A1A1A] bg-[#0A0A0A] transition-all duration-300 overflow-hidden ${open ? 'max-h-80' : 'max-h-0'}`}>
        <div className="px-6 py-4 space-y-1">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="block py-2.5 text-[#666] hover:text-white text-sm transition-colors">
              {l.label}
            </a>
          ))}
          <Link to="/meu-agendamento" className="block py-2.5 text-[#666] hover:text-white text-sm transition-colors">Meu horário</Link>
          <div className="h-px bg-[#1A1A1A] my-3" />
          {user ? (
            <>
              <Link to="/admin" className="block py-2.5 text-[#666] hover:text-white text-sm transition-colors">Painel</Link>
              <button onClick={() => { signOut(); navigate('/'); }} className="block py-2.5 text-[#444] hover:text-red-400 text-sm transition-colors w-full text-left">Sair</button>
            </>
          ) : (
            <Link to="/login" className="block py-2.5 text-[#666] hover:text-white text-sm transition-colors">Entrar</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
