import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Menu, Search, X, LayoutGrid, MessageSquare, FileText, User, LogOut } from 'lucide-react';
import type { Usuario } from '../../types/api';
import { nomeEmpresa } from './helpers';
import './cliente-fonts.css';

const ABAS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'intervencoes', label: 'Atendimentos', icon: MessageSquare },
  { id: 'contratos', label: 'Contratos', icon: FileText },
  { id: 'perfil', label: 'Perfil', icon: User },
] as const;

// Permite que uma tela filha (ex.: conversa em tela cheia) esconda temporariamente
// o cabeçalho/barra de abas do shell, replicando a navegação nativa dos mockups.
const ClienteChromeContext = createContext<{ ocultarChrome: (v: boolean) => void }>({
  ocultarChrome: () => {},
});

export function useClienteChrome() {
  return useContext(ClienteChromeContext);
}

export function ClienteShell({
  usuario, paginaAtual, onNavigate, onLogout, children,
}: {
  usuario: Usuario | null;
  paginaAtual: string;
  onNavigate: (pagina: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [chromeOculto, setChromeOculto] = useState(false);

  const irPara = (pagina: string) => {
    onNavigate(pagina);
    setDrawerAberto(false);
  };

  const ocultarChrome = useCallback((v: boolean) => setChromeOculto(v), []);

  return (
    <div className="cliente-pwa cliente-font-body min-h-screen flex flex-col bg-[#f7f9fb]">
      {/* Header */}
      {!chromeOculto && (
        <header className="sticky top-0 z-40 bg-[#f7f9fb]/80 backdrop-blur-md border-b border-[#e5e7eb]">
          <div className="h-14 px-4 flex items-center justify-between">
            <button
              onClick={() => setDrawerAberto(true)}
              className="p-2 -ml-2 text-[#630ed4] hover:bg-[#ede0ff] rounded-full transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="cliente-font-heading text-lg font-bold text-[#630ed4]">SOS Ticket</h1>
            <button
              onClick={() => onNavigate('intervencoes')}
              className="p-2 -mr-2 text-[#630ed4] hover:bg-[#ede0ff] rounded-full transition-colors"
              aria-label="Pesquisar atendimentos"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* Conteúdo */}
      <main className={`flex-1 overflow-y-auto ${chromeOculto ? '' : 'pb-24'}`}>
        <ClienteChromeContext.Provider value={{ ocultarChrome }}>{children}</ClienteChromeContext.Provider>
      </main>

      {/* Barra de abas fixa */}
      {!chromeOculto && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-md border-t border-[#e5e7eb] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-around">
            {ABAS.map((aba) => {
              const Icon = aba.icon;
              const ativo = paginaAtual === aba.id || paginaAtual.startsWith(`${aba.id}_`);
              return (
                <button
                  key={aba.id}
                  onClick={() => onNavigate(aba.id)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all ${
                    ativo ? 'bg-[#7c3aed] text-white' : 'text-[#4a4455]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{aba.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Drawer do menu hambúrguer */}
      {drawerAberto && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerAberto(false)} />
          <div className="relative w-72 max-w-[80vw] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-6 bg-gradient-to-br from-[#7c3aed] to-[#630ed4] text-white">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold mb-3">
                {(usuario?.nome || 'C').substring(0, 1).toUpperCase()}
              </div>
              <p className="font-bold cliente-font-heading">{usuario?.nome || 'Cliente'}</p>
              <p className="text-xs text-white/80 mt-0.5">{nomeEmpresa(usuario?.empresa) || usuario?.email}</p>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {ABAS.map((aba) => {
                const Icon = aba.icon;
                const ativo = paginaAtual === aba.id || paginaAtual.startsWith(`${aba.id}_`);
                return (
                  <button
                    key={aba.id}
                    onClick={() => irPara(aba.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      ativo ? 'bg-[#ede0ff] text-[#630ed4] font-semibold' : 'text-[#191c1e] hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{aba.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-semibold">Sair</span>
              </button>
            </div>
            <button
              onClick={() => setDrawerAberto(false)}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
