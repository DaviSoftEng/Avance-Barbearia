import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await login(user, password);
      signIn(r.data.token, r.data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Usuário ou senha inválidos');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">

        <div className="mb-8">
          <p className="section-label mb-4">Área restrita</p>
          <h1 className="text-3xl font-bold text-white">Entrar</h1>
          <p className="text-[#444] text-sm mt-1">Painel da Barbearia Avance</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="text-[#444] text-xs block mb-2">Usuário</label>
            <input type="text" value={user} onChange={(e) => setUser(e.target.value)}
              placeholder="ryann" className="input-field" autoComplete="username" required />
          </div>
          <div>
            <label className="text-[#444] text-xs block mb-2">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" className="input-field" autoComplete="current-password" required />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm disabled:opacity-40">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

      </div>
    </div>
  );
}
