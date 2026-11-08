import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { Cliente, Empresa } from '../types/api';
import { clientesService, empresasService } from '../services/api';

function listaDe(response: any): Cliente[] {
  const lista = Array.isArray(response) ? response : (response?.results || response?.data || []);
  return Array.isArray(lista) ? lista : [];
}

export function EmpresaClientes({
  empresaId,
  onNavigate,
}: {
  empresaId: string;
  onNavigate?: (pagina: string) => void;
}) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [emp, cli] = await Promise.all([
        empresasService.obterPorId(empresaId),
        clientesService.listar({ empresa: empresaId } as any),
      ]);
      setEmpresa(emp);
      setClientes(listaDe(cli));
    } catch {
      setClientes([]);
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const cli = await clientesService.listar({ empresa: empresaId, search: busca || undefined } as any);
        setClientes(listaDe(cli));
      } catch { /* mantém */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [busca, empresaId]);

  const filtrados = clientes.filter((c) => {
    const t = busca.trim().toLowerCase();
    return !t || (c.nome || '').toLowerCase().includes(t) || (c.email || '').includes(t) || (c.telefone || '').includes(t);
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate?.('empresas')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes de {empresa?.nome || ''}</h2>
          <p className="text-sm text-gray-500">{clientes.length} utilizadores nesta empresa</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar nome, email ou telefone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {carregando ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : filtrados.length === 0 ? (
          <p className="p-12 text-center text-gray-500 text-sm">Sem clientes nesta empresa.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Acções</th></tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={String(c.id)} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-bold text-gray-800">{c.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3">{c.telefone || '—'}</td>
                  <td className="px-4 py-3">{(c as any).status || 'activo'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => onNavigate?.('clientes')} className="text-xs font-bold text-indigo-600 hover:underline">Editar</button>
                    <button onClick={() => onNavigate?.('intervencoes')} className="text-xs font-bold text-emerald-600 hover:underline">Tickets</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
