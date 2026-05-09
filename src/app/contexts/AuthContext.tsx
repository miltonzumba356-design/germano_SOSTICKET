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

// Provider do contexto de autenticação
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Verifica se há token salvo ao carregar a aplicação
  useEffect(() => {
    const carregarUsuario = async () => {
      const tokenSalvo = localStorage.getItem('auth_token');

      if (tokenSalvo) {
        setToken(tokenSalvo);

        try {
          // Busca perfil do usuário usando o token
          const perfil = await authService.getProfile();

          if (perfil) {
            setUsuario({
              id: perfil.id,
              nome: perfil.nome,
              email: perfil.email,
              perfil: perfil.perfil,
              telefone: perfil.telefone,
              avatar_url: perfil.avatar_url,
            });
          }
        } catch (error) {
          console.error('Erro ao carregar perfil:', error);
          // Se falhar, limpa o token inválido
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          setToken(null);
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

      setToken(response.access_token);

      // A resposta do login já contém os dados do usuário
      if (response.usuario) {
        setUsuario({
          id: response.usuario.id,
          nome: response.usuario.nome,
          email: response.usuario.email,
          perfil: response.usuario.perfil,
          telefone: response.usuario.telefone,
          avatar_url: response.usuario.avatar_url,
        });
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
