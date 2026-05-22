import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authService } from '../services/api';

// Tipos de usuário conforme a API
type TipoPerfil = 'admin' | 'tecnico' | 'cliente';

// Interface do usuário autenticado
interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: TipoPerfil;
  telefone?: string;
  avatar_url?: string;
}

// Interface do contexto de autenticação
interface AuthContextData {
  usuario: Usuario | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  carregando: boolean;
  register: (dados: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

function normalizarUsuario(dadosUsuario: any, emailFallback?: string): Usuario {
  return {
    id: dadosUsuario?.id || emailFallback || 'temp-id',
    nome: dadosUsuario?.nome || dadosUsuario?.first_name || dadosUsuario?.username || emailFallback?.split('@')[0] || 'Utilizador',
    email: dadosUsuario?.email || emailFallback || '',
    perfil: dadosUsuario?.perfil || dadosUsuario?.role || 'cliente',
    telefone: dadosUsuario?.telefone,
    avatar_url: dadosUsuario?.avatar_url,
  };
}

// Provider do contexto de autenticação
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Verifica se há token salvo ao carregar a aplicação
  useEffect(() => {
    const carregarUsuario = async () => {
      const tokenSalvo = localStorage.getItem('auth_token');
      const usuarioSalvo = localStorage.getItem('auth_user');

      if (tokenSalvo) {
        setToken(tokenSalvo);

        if (usuarioSalvo) {
          try {
            setUsuario(JSON.parse(usuarioSalvo));
          } catch {
            localStorage.removeItem('auth_user');
          }
        }

        try {
          // Busca perfil do usuário usando o token
          const perfil = await authService.getProfile(localStorage.getItem('auth_user_email') || undefined);

          if (perfil) {
            const usuarioNormalizado = normalizarUsuario(perfil);
            setUsuario(usuarioNormalizado);
            localStorage.setItem('auth_user', JSON.stringify(usuarioNormalizado));
            localStorage.setItem('auth_user_email', usuarioNormalizado.email);
          }
        } catch (error) {
          console.error('Erro ao carregar perfil:', error);
          // Se falhar, limpa o token inválido
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_user_email');
          setToken(null);
          setUsuario(null);
        }
      }

      setCarregando(false);
    };

    carregarUsuario();
  }, []);

  // Função de login - chama API /api/v1/auth/login
  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      
      // Extrai o token da resposta
      const tokenRecebido = response.access_token || response.access || response.token || (response.data?.access_token);
      setToken(tokenRecebido);

      // Tenta extrair o usuário da resposta
      let dadosUsuario = response.usuario || response.user || response.profile || response.data?.usuario;

      // Se não houver dados do usuário na resposta do login, busca o perfil explicitamente
      if (!dadosUsuario) {
        try {
          dadosUsuario = await authService.getProfile(email);
        } catch (perfilError) {
          console.error('Login bem sucedido mas falha ao obter perfil:', perfilError);
        }
      }

      if (dadosUsuario) {
        const usuarioNormalizado = normalizarUsuario(dadosUsuario, email);
        setUsuario(usuarioNormalizado);
        localStorage.setItem('auth_user', JSON.stringify(usuarioNormalizado));
        localStorage.setItem('auth_user_email', usuarioNormalizado.email);
      } else {
        // Fallback caso realmente não consiga nada, mas tenha token
        // Isso evita ficar preso na tela de login se o token for válido
        const usuarioFallback = {
          id: 'temp-id',
          nome: email.split('@')[0],
          email: email,
          perfil: 'cliente',
        } as Usuario;
        setUsuario(usuarioFallback);
        localStorage.setItem('auth_user', JSON.stringify(usuarioFallback));
        localStorage.setItem('auth_user_email', email);
      }
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  // Função de logout - chama API /api/v1/auth/logout
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setUsuario(null);
      setToken(null);
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_user_email');
    }
  };

  // Função de cadastro - chama API /api/v1/auth/register
  const register = async (dados: any) => {
    try {
      await authService.register(dados);
      // Opcional: fazer login automático após cadastro
      // await login(dados.email, dados.password);
    } catch (error) {
      console.error('Erro no cadastro:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      token,
      login,
      logout,
      register,
      isAuthenticated: !!usuario,
      carregando,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
