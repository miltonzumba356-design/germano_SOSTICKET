import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Building2, CalendarDays, Loader2, Plus, Send, X } from 'lucide-react';
import { clientesService, empresasService, fiscalService, tecnicosService } from '../services/api';

function listaDe(r: any): any[] {
  const l = Array.isArray(r) ? r : (r?.results || r?.data || []);
  return Array.isArray(l) ? l : [];
}

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
  const [novaCat, setNovaCat] = useState(false);
  const [form, setForm] = useState({ cliente: '', categoria: '', periodicidade: 'mensal', data_vencimento: '', responsavel: '' });
  const [catForm, setCatForm] = useState({ nome: '', dias_alerta: 5 });
  const [mes, setMes] = useState(() => new Date());

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const a: any = await fiscalService.alertas();
      setAlertas(a?.data || a || { vencidas: [], proximas: [], pendentes: 0 });
      setObrigacoes(listaDe(await fiscalService.obrigacoes()));
      try { setCategorias(listaDe(await fiscalService.categorias())); } catch { setCategorias([]); }
      try { setClientes(listaDe(await clientesService.listar({ limit: 100 } as any))); } catch { setClientes([]); }
      try { setTecnicos(listaDe(await tecnicosService.listar({ limit: 100 } as any))); } catch { setTecnicos([]); }
      try {
        const em: any = await empresasService.listar({ limit: 100 } as any);
        setEmpresasMap(Object.fromEntries(listaDe(em).map((e: any) => [e.id, e])));
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

  const criarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    await fiscalService.criarCategoria(catForm);
    setNovaCat(false);
    setCatForm({ nome: '', dias_alerta: 5 });
    carregar();
  };

  const alertar = async () => {
    const r: any = await fiscalService.alertarAdmin();
    alert(`Alertas enviados: ${r?.data?.enviados || 0}`);
  };

  // grade do mês
  const ano = mes.getFullYear(), mesIdx = mes.getMonth();
  const dias = new Date(ano, mesIdx + 1, 0).getDate();
  const primeiro = new Date(ano, mesIdx, 1).getDay();
  const porDia: Record<number, any[]> = {};
  filtradas.forEach((o) => {
    const d = new Date(o.data_vencimento + 'T00:00:00');
    if (d.getFullYear() === ano && d.getMonth() === mesIdx) (porDia[d.getDate()] ||= []).push(o);
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-7 h-7 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Calendário Fiscal</h2>
            <p className="text-sm text-gray-500">Obrigações, prazos e alertas por cliente</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={alertar} className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white font-bold text-sm rounded-lg hover:bg-amber-600"><Send className="w-4 h-4" /> Alertar admin (5 dias)</button>
          <button onClick={() => setNovaCat(true)} className="flex items-center gap-2 px-3 py-2 bg-white border font-bold text-sm rounded-lg"><Plus className="w-4 h-4" /> Categoria</button>
          <button onClick={() => setNovo(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm"><Plus className="w-4 h-4" /> Nova Obrigação</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5"><p className="text-xs font-black text-red-500 uppercase flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Vencidas</p><p className="text-3xl font-black text-red-700">{alertas.vencidas?.length || 0}</p></div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5"><p className="text-xs font-black text-amber-500 uppercase">Próximas</p><p className="text-3xl font-black text-amber-700">{alertas.proximas?.length || 0}</p></div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5"><p className="text-xs font-black text-indigo-500 uppercase">Pendentes</p><p className="text-3xl font-black text-indigo-700">{alertas.pendentes || 0}</p></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-gray-800">{mes.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</h3>
          <div className="flex gap-1">
            <button onClick={() => setMes(new Date(ano, mesIdx - 1, 1))} className="px-3 py-1.5 bg-gray-50 rounded-lg text-sm font-bold">‹</button>
            <button onClick={() => setMes(new Date(ano, mesIdx + 1, 1))} className="px-3 py-1.5 bg-gray-50 rounded-lg text-sm font-bold">›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 font-bold mb-1">{['D','S','T','Q','Q','S','S'].map((d, i) => <div key={i}>{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: primeiro }).map((_, i) => <div key={'e'+i} />)}
          {Array.from({ length: dias }).map((_, i) => {
            const dia = i + 1;
            const itens = porDia[dia] || [];
            const hoje = new Date().getDate() === dia && new Date().getMonth() === mesIdx && new Date().getFullYear() === ano;
            return (
              <div key={dia} className={`min-h-[56px] border rounded-lg p-1 text-left ${hoje ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100'}`}>
                <span className={`text-xs font-bold ${hoje ? 'text-indigo-700' : 'text-gray-500'}`}>{dia}</span>
                {itens.map((o) => (<span key={o.id} className={`block truncate text-[10px] px-1 rounded ${o.vencida ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`} title={o.categoria_nome}>{o.categoria_nome}</span>))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..."
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
                const emp = empresasMap[clientes.find((c: any) => c.nome === o.cliente_nome)?.empresa?.id] as any;
                const foto = (emp?.avatar_url || clientes.find((c: any) => c.nome === o.cliente_nome)?.empresa?.avatar_url) as string | undefined;
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

      {novaCat && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <form onSubmit={criarCategoria} className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-bold">Nova Categoria</h3><button type="button" onClick={() => setNovaCat(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button></div>
            <input required value={catForm.nome} onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })} placeholder="Nome (ex: IVA)" className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input type="number" value={catForm.dias_alerta} onChange={(e) => setCatForm({ ...catForm, dias_alerta: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Dias de alerta" />
            <button className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm">Salvar</button>
          </form>
        </div>
      )}

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
