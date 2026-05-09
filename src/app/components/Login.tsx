import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

// Componente de página de login
export function Login({ onGoToRegister }: { onGoToRegister: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login } = useAuth();

  // Função para processar o formulário de login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await login(email, password);
    } catch (error: any) {
      console.error('Erro no login:', error);
      const mensagem = error?.message || 'Email ou senha inválidos. Verifique suas credenciais.';
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        {/* Cabeçalho com logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 mb-2">SOSTickect</h1>
          <p className="text-gray-600">Sistema de Gestão de Suporte</p>
        </div>

        {/* Formulário de login */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo de email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="seu@email.com"
              required
            />
          </div>

          {/* Campo de senha */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{erro}</span>
            </div>
          )}

          {/* Botão de submeter */}
          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <p className="text-gray-500">
            Não tem uma conta?{' '}
            <button 
              onClick={onGoToRegister}
              className="text-indigo-600 font-bold hover:underline"
            >
              Cadastre-se agora
            </button>
          </p>
        </div>

        {/* Instruções de demonstração */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-2">Contas de demonstração:</p>
          <div className="text-xs text-blue-700 space-y-1">
            <p>Admin: admin@sostickect.pt</p>
            <p>Técnico: tecnico@sostickect.pt</p>
            <p>Cliente: cliente@sostickect.pt</p>
            <p className="mt-2 italic">Senha: qualquer valor</p>
          </div>
        </div>
      </div>
    </div>
  );
}
