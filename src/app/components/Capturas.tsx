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
  ArrowLeft,
  Trash2,
  AlertTriangle,
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
  // campos opcionais que a API pode ou não devolver
  filename?: string;
  username?: string;
  timestamp?: string;
  date?: string;
}

// ── API helpers ─────────────────────────────────────────────────────────────

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

async function buscarCapturas(username: string, data?: string): Promise<Captura[]> {
  const params = new URLSearchParams({ username });
  if (data) params.set('data', data);
  const res = await fetch(`${SCREENSHOTS_API}/screenshots?${params}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Erro ${res.status} ao buscar capturas de ${username}`);
  }
  const json = await res.json();
  // Resposta: { username, total, images: [...] }
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

// ── Utilitários ──────────────────────────────────────────────────────────────

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
  // public_id = "screenshots/HUNTER_20260624_094524" → "HUNTER_20260624_094524"
  const partes = (c.public_id || '').split('/');
  return partes[partes.length - 1] || c.public_id || 'captura';
}

// ── Componente ───────────────────────────────────────────────────────────────

type ConfirmacaoEliminar =
  | { tipo: 'captura'; captura: Captura }
  | { tipo: 'todas'; username: string };

export function Capturas() {
  // utilizadores
  const [utilizadores, setUtilizadores] = useState<UtilizadorAPI[]>([]);
  const [carregandoUsers, setCarregandoUsers] = useState(true);
  const [erroUsers, setErroUsers] = useState('');
  const [buscaUser, setBuscaUser] = useState('');

  // capturas
  const [userSelecionado, setUserSelecionado] = useState<string | null>(null);
  const [filtroData, setFiltroData] = useState('');
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [carregandoCapturas, setCarregandoCapturas] = useState(false);
  const [erroCapturas, setErroCapturas] = useState('');

  // eliminação
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoEliminar | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [erroEliminar, setErroEliminar] = useState('');

  // lightbox
  const [imagemAmpliada, setImagemAmpliada] = useState<number | null>(null);

  // ── carregamento ──────────────────────────────────────────────────────────

  const carregarUtilizadores = useCallback(async () => {
    setCarregandoUsers(true);
    setErroUsers('');
    try {
      setUtilizadores(await buscarUtilizadores());
    } catch (e: any) {
      setErroUsers(e?.message || 'Não foi possível carregar os utilizadores.');
    } finally {
      setCarregandoUsers(false);
    }
  }, []);

  useEffect(() => { carregarUtilizadores(); }, [carregarUtilizadores]);

  const carregarCapturas = useCallback(async (user: string, data: string) => {
    setCarregandoCapturas(true);
    setErroCapturas('');
    setCapturas([]);
    try {
      setCapturas(await buscarCapturas(user, data || undefined));
    } catch (e: any) {
      setErroCapturas(e?.message || 'Não foi possível carregar as capturas.');
    } finally {
      setCarregandoCapturas(false);
    }
  }, []);

  useEffect(() => {
    if (userSelecionado) carregarCapturas(userSelecionado, filtroData);
  }, [userSelecionado, filtroData, carregarCapturas]);

  // ── navegação ─────────────────────────────────────────────────────────────

  const selecionarUser = (user: string) => {
    setUserSelecionado(user);
    setFiltroData('');
    setImagemAmpliada(null);
  };

  const voltarParaLista = () => {
    setUserSelecionado(null);
    setCapturas([]);
    setErroCapturas('');
    setFiltroData('');
    setImagemAmpliada(null);
  };

  const irParaAnterior = () => setImagemAmpliada((i) => (i !== null && i > 0 ? i - 1 : i));
  const irParaProxima  = () => setImagemAmpliada((i) => (i !== null && i < capturas.length - 1 ? i + 1 : i));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmacao) return; // não navega se modal de confirmação estiver aberto
      if (imagemAmpliada === null) return;
      if (e.key === 'Escape')     setImagemAmpliada(null);
      if (e.key === 'ArrowLeft')  irParaAnterior();
      if (e.key === 'ArrowRight') irParaProxima();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imagemAmpliada, capturas.length, confirmacao]);

  // ── eliminação ────────────────────────────────────────────────────────────

  const confirmarEliminar = (item: ConfirmacaoEliminar) => {
    setErroEliminar('');
    setConfirmacao(item);
  };

  const executarEliminar = async () => {
    if (!confirmacao) return;
    setEliminando(true);
    setErroEliminar('');
    try {
      if (confirmacao.tipo === 'captura') {
        const pid = confirmacao.captura.public_id || confirmacao.captura.filename;
        await eliminarCaptura(pid);
        setCapturas((prev) => prev.filter((c) => c !== confirmacao.captura));
      } else {
        await eliminarTodasCapturas(confirmacao.username);
        setCapturas([]);
      }
      setConfirmacao(null);
      setImagemAmpliada(null);
    } catch (e: any) {
      setErroEliminar(e?.message || 'Erro ao eliminar. Tente novamente.');
    } finally {
      setEliminando(false);
    }
  };

  const utilizadoresFiltrados = utilizadores.filter((u) =>
    extrairUsername(u).toLowerCase().includes(buscaUser.toLowerCase())
  );

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {userSelecionado && (
            <button
              onClick={voltarParaLista}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Monitor className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Capturas de Ecrã</h1>
            <p className="text-sm text-gray-500">
              {userSelecionado
                ? `Capturas de ${userSelecionado}`
                : 'Selecione um utilizador para ver as capturas'}
            </p>
          </div>
        </div>

        {userSelecionado ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => carregarCapturas(userSelecionado, filtroData)}
              disabled={carregandoCapturas}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${carregandoCapturas ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            {capturas.length > 0 && (
              <button
                onClick={() => confirmarEliminar({ tipo: 'todas', username: userSelecionado })}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar todas
              </button>
            )}
            <button
              onClick={voltarParaLista}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="w-4 h-4" />
              Todos os utilizadores
            </button>
          </div>
        ) : (
          <button
            onClick={carregarUtilizadores}
            disabled={carregandoUsers}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${carregandoUsers ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        )}
      </div>

      {/* ── Lista de utilizadores ── */}
      {!userSelecionado && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={buscaUser}
                onChange={(e) => setBuscaUser(e.target.value)}
                placeholder="Filtrar por nome de utilizador..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {buscaUser && (
                <button onClick={() => setBuscaUser('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {erroUsers && (
            <div className="bg-white rounded-xl border border-red-200 p-5">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{erroUsers}</p>
              </div>
            </div>
          )}

          {carregandoUsers && (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">A carregar utilizadores...</p>
            </div>
          )}

          {!carregandoUsers && !erroUsers && (
            utilizadoresFiltrados.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Nenhum utilizador encontrado</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 px-1">
                  <span className="font-semibold text-gray-800">{utilizadoresFiltrados.length}</span> utilizador{utilizadoresFiltrados.length !== 1 ? 'es' : ''} — clique para ver as capturas
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {utilizadoresFiltrados.map((u, i) => {
                    const nome = extrairUsername(u);
                    const email = typeof u.email === 'string' ? u.email : '';
                    return (
                      <button
                        key={i}
                        onClick={() => selecionarUser(nome)}
                        className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                            <User className="w-6 h-6 text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{nome}</p>
                            {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
                          </div>
                        </div>
                        <div className="mt-4">
                          <span className="text-xs text-indigo-500 font-medium group-hover:text-indigo-700">Ver capturas →</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* ── Capturas do utilizador ── */}
      {userSelecionado && (
        <div className="space-y-4">
          {/* Filtro de data */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative sm:w-56">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  placeholder="Filtrar por data DD/MM/AAAA"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              {filtroData && (
                <button
                  onClick={() => setFiltroData('')}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpar data
                </button>
              )}
              <div className="sm:ml-auto flex items-center gap-2 text-sm text-gray-500">
                <span>Utilizador:</span>
                <span className="font-semibold text-gray-900 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  {userSelecionado}
                </span>
              </div>
            </div>
          </div>

          {carregandoCapturas && (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">A carregar capturas de <strong>{userSelecionado}</strong>...</p>
            </div>
          )}

          {erroCapturas && !carregandoCapturas && (
            <div className="bg-white rounded-xl border border-red-200 p-5">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{erroCapturas}</p>
              </div>
            </div>
          )}

          {!carregandoCapturas && !erroCapturas && capturas.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Nenhuma captura encontrada</p>
              <p className="text-gray-400 text-sm mt-1">
                Não existem capturas para <strong>{userSelecionado}</strong>
                {filtroData ? ` na data ${filtroData}` : ''}
              </p>
            </div>
          )}

          {/* Galeria */}
          {!carregandoCapturas && capturas.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 px-1">
                <span className="font-semibold text-gray-900">{capturas.length}</span> captura{capturas.length !== 1 ? 's' : ''} encontrada{capturas.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {capturas.map((captura, index) => {
                  const dataHora = extrairDataHora(captura);
                  const nome = extrairNomeFicheiro(captura);
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
                        {/* Overlay: ampliar + eliminar */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3">
                          <button
                            onClick={() => setImagemAmpliada(index)}
                            className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
                            aria-label="Ampliar"
                          >
                            <ZoomIn className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); confirmarEliminar({ tipo: 'captura', captura }); }}
                            className="p-2 bg-red-500/80 backdrop-blur-sm text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/90"
                            aria-label="Eliminar captura"
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
            </div>
          )}
        </div>
      )}

      {/* ── Lightbox ── */}
      {imagemAmpliada !== null && capturas[imagemAmpliada] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImagemAmpliada(null)}
        >
          <button onClick={() => setImagemAmpliada(null)} className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>

          {/* Eliminar no lightbox */}
          <button
            onClick={(e) => { e.stopPropagation(); confirmarEliminar({ tipo: 'captura', captura: capturas[imagemAmpliada] }); }}
            className="absolute top-4 right-16 p-2 text-white bg-red-600/70 hover:bg-red-600 rounded-lg transition-colors"
            title="Eliminar esta captura"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {imagemAmpliada > 0 && (
            <button onClick={(e) => { e.stopPropagation(); irParaAnterior(); }} className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {imagemAmpliada < capturas.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); irParaProxima(); }} className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
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

      {/* ── Modal de confirmação de eliminação ── */}
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
                  Tem a certeza que pretende eliminar <strong className="text-gray-900">todas as capturas</strong> do utilizador{' '}
                  <strong className="text-gray-900">{confirmacao.username}</strong>?
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
                  {eliminando ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> A eliminar...</>
                  ) : (
                    <><Trash2 className="w-4 h-4" /> Eliminar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
