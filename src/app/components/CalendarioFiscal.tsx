import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, Loader2 } from 'lucide-react';
import { clientesService, fiscalService } from '../services/api';

export function CalendarioFiscal() {
  const [alertas, setAlertas] = useState<any>({ vencidas: [], proximas: [], pendentes: 0 });
  const [obrigacoes, setObrigacoes] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [a, o] = await Promise.all([
        fiscalService.alertas(),
        fiscalService.obrigacoes(),
      ]);
      setAlertas(a?.data || a || { vencidas: [], proximas: [], pendentes: 0 });
      const lista = Array.isArray(o) ? o : (o?.results || o?.data || []);
      setObrigacoes(Array.isArray(lista) ? lista : []);
    } catch { /* mantém */ }
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = obrigacoes.filter((o) => {
    const t = busca.trim().toLowerCase();
    return !t || (o.observacoes || '').toLowerCase().includes(t) || (o.categoria_nome || '').toLowerCase().includes(t);
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <CalendarDays className="w-7 h-7 text-indigo-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendário Fiscal</h2>
          <p className="text-sm text-gray-500">Obrigações, prazos e alertas por cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
          <p className="text-xs font-black text-red-500 uppercase flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Vencidas</p>
          <p className="text-3xl font-black text-red-700">{alertas.vencidas?.length || 0}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <p className="text-xs font-black text-amber-500 uppercase">Próximas</p>
          <p className="text-3xl font-black text-amber-700">{alertas.proximas?.length || 0}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <p className="text-xs font-black text-indigo-500 uppercase">Pendentes</p>
          <p className="text-3xl font-black text-indigo-700">{alertas.pendentes || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar por cliente, categoria ou texto..."
            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
        </div>
        {carregando ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Responsável</th></tr>
            </thead>
            <tbody>
              {filtradas.map((o: any) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-bold">{o.cliente_nome}</td>
                  <td className="px-4 py-3">{o.categoria_nome}</td>
                  <td className="px-4 py-3">{o.data_vencimento}</td>
                  <td className="px-4 py-3">{o.estado_execucao} {o.vencida && <span className="text-red-600 font-bold">(vencida)</span>}</td>
                  <td className="px-4 py-3">{o.responsavel_nome || '—'}</td>
                </tr>
              ))}
              {filtradas.length === 0 && <tr><td className="px-4 py-12 text-center text-gray-500" colSpan={5}>Sem obrigações.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
