import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await login(email, password);
    } catch (error: any) {
      console.error('Erro no login:', error);
      const mensagem = error?.message || 'Credenciais inválidas. Por favor, tente novamente.';
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] font-sans selection:bg-purple-500/30">
      <div className="w-full max-w-[1050px] h-[680px] bg-white rounded-[48px] overflow-hidden flex shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] border border-white/60 mx-4 relative">
        
        {/* Lado Esquerdo: Formulário */}
        <div className="w-full lg:w-[60%] p-14 flex flex-col justify-between relative z-30">
          {/* Logo Estilizada */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#7c3aed] rounded-full shadow-[0_0_15px_rgba(124,58,237,0.3)]"></div>
            <span className="text-slate-900 font-bold tracking-tight text-lg">SOS Contábeis<span className="text-[#7c3aed]">.</span></span>
          </div>

          <div className="space-y-8 relative z-10">
            <div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-3">Portal do Cliente & Equipa</p>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Aceder à conta<span className="text-[#7c3aed]">.</span></h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campo Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Endereço de Email</label>
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent text-slate-900 px-5 py-4 rounded-2xl focus:border-[#7c3aed]/30 focus:bg-white transition-all outline-none text-sm placeholder:text-slate-300 font-medium"
                    placeholder="geral@empresa.com"
                    required
                  />
                  <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#7c3aed] transition-colors" />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Palavra-passe</label>
                  <button type="button" className="text-[10px] font-bold text-[#7c3aed] hover:text-[#630ed4] transition-colors uppercase tracking-tight">Esqueceu a senha?</button>
                </div>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent text-slate-900 px-5 py-4 rounded-2xl focus:border-[#7c3aed]/30 focus:bg-white transition-all outline-none text-sm placeholder:text-slate-300 font-medium"
                    placeholder="••••••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-slate-300" /> : <Eye className="w-4 h-4 text-slate-300" />}
                  </button>
                </div>
              </div>

              {erro && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-bold">{erro}</span>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  className="px-6 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all flex-1"
                >
                  Suporte
                </button>
                <button
                  type="submit"
                  disabled={carregando}
                  className="px-8 py-4 bg-[#7c3aed] text-white rounded-2xl font-black text-sm hover:bg-[#630ed4] disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-[0_10px_20px_rgba(124,58,237,0.15)] flex-[2] flex items-center justify-center gap-2 group"
                >
                  {carregando ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Entrar no Sistema
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-8">
            © 2026 Electro Soft • TODOS OS DIREITOS RESERVADOS
          </div>

          {/* Decoração sutil */}
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#7c3aed]/5 rounded-full blur-[80px]"></div>
        </div>

        {/* Lado Direito: Imagem/Visual com Sobreposição Gradual */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[70%] z-10">
          <div className="absolute inset-0 z-20 bg-gradient-to-r from-white via-white/40 to-transparent"></div>
          <img
            src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=2070"
            className="w-full h-full object-cover grayscale-[5%] brightness-95"
            alt="Suporte Contábil e Fiscal"
          />

          <div className="absolute bottom-12 right-12 z-20">
            <div className="p-6 bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 max-w-xs shadow-xl animate-in slide-in-from-bottom-8 duration-700">
              <p className="text-slate-800 text-xs font-bold leading-relaxed">
                Gestão eficiente de tickets de contabilidade, fiscalidade e auditoria corporativa.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#7c3aed] flex items-center justify-center text-[10px] font-bold text-white shadow-lg">ES</div>
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Electro Soft</span>
              </div>
            </div>
          </div>

          {/* Marca d'água estilizada */}
          <div className="absolute bottom-12 right-12 z-20">
            <div className="flex flex-col items-end opacity-10">
              <span className="text-slate-900 font-black text-5xl tracking-tighter leading-none">SOS</span>
              <span className="text-slate-900 font-black text-5xl tracking-tighter leading-none">ACC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
