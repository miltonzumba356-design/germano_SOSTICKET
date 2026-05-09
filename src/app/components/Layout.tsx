import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminMenu, MenuItem } from '../data/AdminMenu';
import {
  LayoutDashboard,
  Ticket,
  Users,
  UserCog,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  Calendar,
  Clock,
  Building2
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  paginaAtual: string;
  onNavigate: (pagina: string) => void;
}

import { WidgetCronometro } from './WidgetCronometro';

// Componente de layout principal da aplicação
export function Layout({ children, paginaAtual, onNavigate }: LayoutProps) {
  const { usuario, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  // Itens de menu baseados no perfil do usuário
  const getMenuItems = (): MenuItem[] => {
    // ... existing logic
    if (usuario?.perfil === 'admin') {
      return adminMenu;
    }

    const menuComum = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'intervencoes', label: 'Tickets', icon: Ticket },
    ];

    if (usuario?.perfil === 'tecnico') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'intervencoes', label: 'Minhas Intervenções', icon: Ticket },
        { id: 'horas', label: 'Registo de Horas', icon: Clock },
        { id: 'calendario', label: 'Calendário', icon: Calendar },
        { id: 'perfil', label: 'Meu Perfil', icon: UserCog },
      ] as MenuItem[];
    }

    if (usuario?.perfil === 'cliente') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'intervencoes', label: 'Minhas Intervenções', icon: Ticket },
        { id: 'contratos', label: 'Meus Contratos', icon: FileText },
        { id: 'perfil', label: 'Meu Perfil', icon: UserCog },
      ] as MenuItem[];
    }

    return menuComum as MenuItem[];
  };

  const menuItems = getMenuItems();

  return (
    <div className={`min-h-screen bg-gray-50 ${
      usuario?.perfil === 'tecnico' ? 'role-tecnico' : 
      usuario?.perfil === 'cliente' ? 'role-cliente' : 
      'role-admin'
    }`}>
      {/* ... existing header and sidebar ... */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-xl font-bold text-theme-primary">SOSTickect</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{usuario?.nome}</p>
                <p className="text-xs text-gray-500 capitalize">{usuario?.perfil}</p>
              </div>
              <button onClick={logout} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          ${menuAberto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pt-16 lg:pt-0 overflow-y-auto h-[calc(100vh-60px)]
        `}>
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isAtivo = paginaAtual === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMenuAberto(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isAtivo ? 'bg-theme-light text-theme-dark font-medium' : 'text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  {Icon && <Icon className="w-5 h-5" />}
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 sm:hidden mt-4">
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sair</span>
            </button>
          </nav>
        </aside>

        {menuAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setMenuAberto(false)} />
        )}

        <main className="flex-1 p-6 overflow-y-auto h-[calc(100vh-60px)] relative">
          {children}
          {usuario?.perfil === 'tecnico' && <WidgetCronometro />}
        </main>
      </div>
    </div>
  );
}


