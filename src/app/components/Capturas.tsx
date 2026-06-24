import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Search,
  Calendar,
  RefreshCw,
  User,
  Users,
  AlertCircle,
  Loader2,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image,
  Trash2,
  AlertTriangle,
  Filter,
} from 'lucide-react';

const SCREENSHOTS_API = 'https://germano-production.up.railway.app';

interface UtilizadorAPI {
  username?: string;
  name?: string;
  email?: string;
  id?: string | number;
  [key: string]: unknown;
}

interface Captura {
  url: string;
  public_id: string;
  created_at?: string;
  width?: number;
  height?: number;
  filename?: string;
  username?: string;
  timestamp?: string;
  date?: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

async function buscarUtilizadores(): Promise<UtilizadorAPI[]> {
  const res = await fetch(`${SCREENSHOTS_API}/users`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Erro ${res.status} ao listar utilizadores`);
  const json = await res.json();
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    const arr = json.users ?? json.data ?? json.results ?? json.items;
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

async function buscarCapturas(username?: string, data?: string): Promise<Captura[]> {
  const params = new URLSearchParams();
  if (username) params.set('username', username);
  if (data)     params.set('data', data);
  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(`${SCREENSHOTS_API}/screenshots${query}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Erro ${res.status} ao buscar capturas`);
  }
  const json = await res.json();
  if (json && typeof json === 'object') {
    const arr = json.images ?? json.screenshots ?? json.data ?? json.results;
    if (Array.isArray(arr)) return arr;
  }
  if (Array.isArray(json)) return json;
  return [];
}

async function eliminarCaptura(public_id: string): Promise<void> {
  const res = await fetch(`${SCREENSHOTS_API}/screenshots/${encodeURIComponent(public_id)}`, {
    method: 'DELETE',
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Erro ${res.status} ao eliminar captura`);
}

async function eliminarTodasCapturas(username?: string): Promise<void> {
  const url = username
    ? `${SCREENSHOTS_API}/screenshots?username=${encodeURIComponent(username)}`
    : `${SCREENSHOTS_API}/screenshots`;
  const res = await fetch(url, { method: 'DELETE', headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Erro ${res.status} ao eliminar capturas`);
}

// ── Utilitários ───────────────────────────────────────────────────────────────

function extrairUsername(u: UtilizadorAPI): string {
  return (u.username ?? u.name ?? u.email ?? String(u.id ?? '')).trim();
}

function formatarDataHora(valor?: string): string {
  if (!valor) return '—';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return valor;
  return d.toLocaleString('pt-PT');
}

function extrairDataHora(c: Captura): string {
  return c.created_at || c.timestamp || c.date || '';
}

function extrairNomeFicheiro(c: Captura): string {
  if (c.filename) return c.filename;
  const partes = (c.public_id || '').split('/');
  return partes[partes.length - 1] || c.public_id || 'captura';
}

// ── Componente ────────────────────────────────────────────────────────────────

type ConfirmacaoEliminar =
  | { tipo: 'captura'; captura: Captura }
  | { tipo: 'todas'; username?: string };

export function Capturas() {
  // utilizadores (para o filtro lateral)
  const [utilizadores, setUtilizadores]     = useState<UtilizadorAPI[]>([]);
  const [buscaUser, setBuscaUser]           = useState('');
  const [painelUsers, setPainelUsers]       = useState(false);

  // filtros activos
  const [userFiltro, setUserFiltro]         = useState<string | undefined>(undefined);
  const [filtroData, setFiltroData]         = useState('');

  // galeria
  const [capturas, setCapturas]             = useState<Captura[]>([]);
  const [carregando, setCarregando]         = useState(true);
  const [erro, setErro]                     = useState('');

  // eliminação
  const [confirmacao, setConfirmacao]       = useState<ConfirmacaoEliminar | null>(null);
  const [eliminando, setEliminando]         = useState(false);
  const [erroEliminar, setErroEliminar]     = useState('');

  // lightbox
  const [imagemAmpliada, setImagemAmpliada] = useState<number | null>(null);

  // ── carregamento automático ──────────────────────────────────────────────

  const carregarCapturas = useCallback(async (user?: string, data?: string) => {
    setCarregando(true);
    setErro('');
    try {
      setCapturas(await buscarCapturas(user, data));
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar as capturas.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // Carrega TUDO ao abrir a página
  useEffect(() => {
    carregarCapturas();
    buscarUtilizadores().then(setUtilizadores).catch(() => {});
  }, [carregarCapturas]);

  // Recarrega quando o filtro muda
  useEffect(() => {
    carregarCapturas(userFiltro, filtroData);
  }, [userFiltro, filtroData, carregarCapturas]);

  // ── lightbox teclado ──────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmacao) return;
      if (imagemAmpliada === null) return;
      if (e.key === 'Escape')     setImagemAmpliada(null);
      if (e.key === 'ArrowLeft')  setImagemAmpliada((i) => (i !== null && i > 0 ? i - 1 : i));
      if (e.key === 'ArrowRight') setImagemAmpliada((i) => (i !== null && i < capturas.length - 1 ? i + 1 : i));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imagemAmpliada, capturas.length, confirmacao]);

  // ── eliminação ────────────────────────────────────────────────────────────

  const executarEliminar = async () => {
    if (!confirmacao) return;
    setEliminando(true);
    setErroEliminar('');
    try {
      if (confirmacao.tipo === 'captura') {
        await eliminarCaptura(confirmacao.captura.public_id);
        setCapturas((prev) => prev.filter((c) => c.public_id !== confirmacao.captura.public_id));
        setImagemAmpliada(null);
      } else {
        await eliminarTodasCapturas(confirmacao.username);
        if (confirmacao.username) {
          setCapturas((prev) => prev.filter((c) => extrairNomeFicheiro(c).split('_')[0] !== confirmacao.username));
        } else {
          setCapturas([]);
        }
      }
      setConfirmacao(null);
    } catch (e: any) {
      setErroEliminar(e?.message || 'Erro ao eliminar. Tente novamente.');
    } finally {
      setEliminando(false);
    }
  };

  const limparFiltros = () => {
    setUserFiltro(undefined);
    setFiltroData('');
    setBuscaUser('');
  };

  const utilizadoresFiltrados = utilizadores.filter((u) =>
    extrairUsername(u).toLowerCase().includes(buscaUser.toLowerCase())
  );

  const temFiltro = !!userFiltro || !!filtroData;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Monitor className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Capturas de Ecrã</h1>
            <p className="text-sm text-gray-500">
              {userFiltro
                ? `A mostrar capturas de ${userFiltro}`
                : 'Todas as capturas registadas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => carregarCapturas(userFiltro, filtroData)}
            disabled={carregando}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          {capturas.length > 0 && (
            <button
              onClick={() => setConfirmacao({ tipo: 'todas', username: userFiltro })}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {userFiltro ? `Eliminar de ${userFiltro}` : 'Eliminar todas'}
            </button>
          )}
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">

          {/* Filtro por utilizador */}
          <div className="relative">
            <button
              onClick={() => setPainelUsers((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                userFiltro
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <User className="w-4 h-4" />
              {userFiltro || 'Utilizador'}
              {userFiltro && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); setUserFiltro(undefined); }}
                  className="ml-1 hover:text-red-200"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
            </button>

            {/* Dropdown de utilizadores */}
            {painelUsers && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      value={buscaUser}
                      onChange={(e) => setBuscaUser(e.target.value)}
                      placeholder="Pesquisar utilizador..."
                      className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <button
                    onClick={() => { setUserFiltro(undefined); setPainelUsers(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${!userFiltro ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}
                  >
                    <Users className="w-4 h-4" />
                    Todos os utilizadores
                  </button>
                  {utilizadoresFiltrados.map((u, i) => {
                    const nome = extrairUsername(u);
                    return (
                      <button
                        key={i}
                        onClick={() => { setUserFiltro(nome); setPainelUsers(false); setBuscaUser(''); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${userFiltro === nome ? 'font-semibold text-indigo-600 bg-indigo-50' : 'text-gray-700'}`}
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        {nome}
                      </button>
                    );
                  })}
                  {utilizadoresFiltrados.length === 0 && (
                    <p className="px-4 py-3 text-sm text-gray-400">Nenhum utilizador encontrado</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filtro por data */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              placeholder="Data DD/MM/AAAA"
              className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-44"
            />
            {filtroData && (
              <button onClick={() => setFiltroData('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Limpar filtros */}
          {temFiltro && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Limpar filtros
            </button>
          )}

          {/* Contador */}
          {!carregando && (
            <span className="ml-auto text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{capturas.length}</span> captura{capturas.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Overlay para fechar dropdown */}
      {painelUsers && (
        <div className="fixed inset-0 z-10" onClick={() => setPainelUsers(false)} />
      )}

      {/* Carregando */}
      {carregando && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">A carregar capturas...</p>
        </div>
      )}

      {/* Erro */}
      {erro && !carregando && (
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{erro}</p>
          </div>
        </div>
      )}

      {/* Sem resultados */}
      {!carregando && !erro && capturas.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nenhuma captura encontrada</p>
          {temFiltro && (
            <button onClick={limparFiltros} className="mt-3 text-sm text-indigo-600 hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Galeria */}
      {!carregando && capturas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {capturas.map((captura, index) => {
            const dataHora = extrairDataHora(captura);
            const nome     = extrairNomeFicheiro(captura);
            return (
              <div
                key={captura.public_id || index}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                <div className="relative bg-gray-100 aspect-video overflow-hidden">
                  <img
                    src={captura.url}
                    alt={nome}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3">
                    <button
                      onClick={() => setImagemAmpliada(index)}
                      className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
                      aria-label="Ampliar"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmacao({ tipo: 'captura', captura }); }}
                      className="p-2 bg-red-500/80 backdrop-blur-sm text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/90"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-xs font-medium text-gray-800 truncate" title={nome}>{nome}</p>
                  {dataHora && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatarDataHora(dataHora)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {imagemAmpliada !== null && capturas[imagemAmpliada] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImagemAmpliada(null)}
        >
          <button onClick={() => setImagemAmpliada(null)} className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmacao({ tipo: 'captura', captura: capturas[imagemAmpliada] }); }}
            className="absolute top-4 right-16 p-2 text-white bg-red-600/70 hover:bg-red-600 rounded-lg transition-colors"
            title="Eliminar esta captura"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {imagemAmpliada > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setImagemAmpliada((i) => i! - 1); }} className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {imagemAmpliada < capturas.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setImagemAmpliada((i) => i! + 1); }} className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          <div className="max-w-5xl max-h-[85vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={capturas[imagemAmpliada].url}
              alt={extrairNomeFicheiro(capturas[imagemAmpliada])}
              className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            <div className="text-center">
              <p className="text-white text-sm font-medium">{extrairNomeFicheiro(capturas[imagemAmpliada])}</p>
              {extrairDataHora(capturas[imagemAmpliada]) && (
                <p className="text-gray-400 text-xs mt-1">{formatarDataHora(extrairDataHora(capturas[imagemAmpliada]))}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">{imagemAmpliada + 1} / {capturas.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      {confirmacao && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 bg-red-600 text-white flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-black text-lg">Confirmar eliminação</p>
                <p className="text-red-100 text-sm">Esta acção é irreversível</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {confirmacao.tipo === 'captura' ? (
                <p className="text-gray-700 text-sm">
                  Tem a certeza que pretende eliminar a captura{' '}
                  <strong className="text-gray-900">{extrairNomeFicheiro(confirmacao.captura)}</strong>?
                </p>
              ) : (
                <p className="text-gray-700 text-sm">
                  Tem a certeza que pretende eliminar{' '}
                  <strong className="text-gray-900">
                    {confirmacao.username ? `todas as capturas de ${confirmacao.username}` : 'todas as capturas'}
                  </strong>?
                </p>
              )}
              {erroEliminar && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{erroEliminar}</span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setConfirmacao(null); setErroEliminar(''); }}
                  disabled={eliminando}
                  className="flex-1 py-3 text-sm font-bold text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executarEliminar}
                  disabled={eliminando}
                  className="flex-1 py-3 text-sm font-black text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {eliminando
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> A eliminar...</>
                    : <><Trash2 className="w-4 h-4" /> Eliminar</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
