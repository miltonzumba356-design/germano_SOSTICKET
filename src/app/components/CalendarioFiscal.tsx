import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Building2, CalendarDays, Loader2, Plus, X } from 'lucide-react';
import { clientesService, empresasService, fiscalService, tecnicosService } from '../services/api';

export function CalendarioFiscal() {
  const [alertas, setAlertas] = useState<any>({ vencidas: [], proximas: [], pendentes: 0 });
  const [obrigacoes, setObrigacoes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [empresasMap, setEmpresasMap] = useState<Record<string, any>>({});
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ cliente: '', categoria: '', periodicidade: 'mensal', data_vencimento: '', responsavel: '' });

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const a = await fiscalService.alertas();
      setAlertas(a?.data || a || { vencidas: [], proximas: [], pendentes: 0 });
      const o: any = await fiscalService.obrigacoes();
      const lista = Array.isArray(o) ? o : (o?.results || o?.data || []);
      setObrigacoes(Array.isArray(lista) ? lista : []);
      try {
        const cats: any = await fiscalService.categorias();
        setCategorias(Array.isArray(cats) ? cats : (cats?.results || cats?.data || []));
      } catch { setCategorias([]); }
      try {
        const cl: any = await clientesService.listar({ limit: 200 } as any);
        setClientes(Array.isArray(cl) ? cl : (cl?.results || cl?.data || []));
      } catch { setClientes([]); }
      try {
        const te: any = await tecnicosService.listar({ limit: 100 } as any);
        setTecnicos(Array.isArray(te) ? te : (te?.results || te?.data || []));
      } catch { setTecnicos([]); }
      try {
        const em: any = await empresasService.listar({ limit: 100 } as any);
        const le = Array.isArray(em) ? em : (em?.results || em?.data || []);
        setEmpresasMap(Object.fromEntries((Array.isArray(le) ? le : []).map((e: any) => [e.id, e])));
      } catch { /* sem fotos */ }
    } catch { /* mantém */ }
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = obrigacoes.filter((o) => {
    const t = busca.trim().toLowerCase();
    return !t || (o.observacoes || '').toLowerCase().includes(t) || (o.categoria_nome || '').toLowerCase().includes(t) || (o.cliente_nome || '').toLowerCase().includes(t);
  });

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    await fiscalService.criarObrigacao({
      cliente: form.cliente, categoria: form.categoria, periodicidade: form.periodicidade,
      data_vencimento: form.data_vencimento,
      ...(form.responsavel ? { responsavel: form.responsavel } : {}),
    });
    setNovo(false);
    carregar();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-7 h-7 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Calendário Fiscal</h2>
            <p className="text-sm text-gray-500">Obrigações, prazos e alertas por cliente</p>
          </div>
        </div>
        <button onClick={() => setNovo(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm">
          <Plus className="w-4 h-4" /> Nova Obrigação
        </button>
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
              <tr><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Responsável</th></tr>
            </thead>
            <tbody>
              {filtradas.map((o: any) => {
                const cli = clientes.find((c: any) => {
                  const eid = typeof c.empresa === 'string' ? c.empresa : c.empresa?.id;
                  return c.nome === o.cliente_nome;
                }) as any;
                const emp = cli?.empresa && typeof cli.empresa === 'object' ? cli.empresa : empresasMap[cli?.empresa] || null;
                const foto = (emp as any)?.avatar_url as string | undefined;
                return (
                  <tr key={o.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {foto ? <img src={foto} alt="" className="w-9 h-9 rounded-xl object-cover" /> : <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Building2 className="w-5 h-5" /></span>}
                        <div><p className="font-bold text-gray-800">{o.cliente_nome}</p><p className="text-xs text-gray-500">{emp?.nome || ''}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{o.categoria_nome}</td>
                    <td className="px-4 py-3">{o.data_vencimento}</td>
                    <td className="px-4 py-3">{o.estado_execucao} {o.vencida && <span className="text-red-600 font-bold">(vencida)</span>}</td>
                    <td className="px-4 py-3">{o.responsavel_nome || '—'}</td>
                  </tr>
                );
              })}
              {filtradas.length === 0 && <tr><td className="px-4 py-12 text-center text-gray-500" colSpan={5}>Sem obrigações.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {novo && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <form onSubmit={criar} className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-bold">Nova Obrigação</h3><button type="button" onClick={() => setNovo(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button></div>
            <select required value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Cliente...</option>{clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
            <select required value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Categoria...</option>{categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
            <select value={form.periodicidade} onChange={(e) => setForm({ ...form, periodicidade: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="unica">Única</option><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select>
            <input type="date" required value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <select value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Responsável (opcional)...</option>{tecnicos.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select>
            <button className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm">Salvar</button>
          </form>
        </div>
      )}
    </div>
  );
}
