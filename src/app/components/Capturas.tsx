import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Search,
  Calendar,
  RefreshCw,
  User,
  AlertCircle,
  Loader2,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image,
} from 'lucide-react';

const SCREENSHOTS_API = 'https://germano-production.up.railway.app';

interface Captura {
  url: string;
  filename: string;
  username: string;
  timestamp?: string;
  date?: string;
}

interface CapturasResponse {
  username: string;
  screenshots: Captura[];
  total?: number;
}

async function buscarCapturas(username: string, data?: string): Promise<Captura[]> {
  const params = new URLSearchParams();
  if (data) params.set('data', data);
  const query = params.toString() ? `?${params.toString()}` : '';
  const url = `${SCREENSHOTS_API}/screenshots/${encodeURIComponent(username)}${query}`;

  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Erro ${res.status} ao buscar capturas de ${username}`);
  }

  const json: CapturasResponse | Captura[] = await res.json();
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object' && 'screenshots' in json) return json.screenshots ?? [];
  return [];
}

function formatarDataHora(valor?: string): string {
  if (!valor) return '—';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return valor;
  return d.toLocaleString('pt-PT');
}

function extrairDataHora(captura: Captura): string {
  return captura.timestamp || captura.date || '';
}

export function Capturas() {
  const [username, setUsername] = useState('');
  const [inputUsername, setInputUsername] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [imagemAmpliada, setImagemAmpliada] = useState<number | null>(null);

  const pesquisar = useCallback(async (user: string, data: string) => {
    const userLimpo = user.trim();
    if (!userLimpo) return;

    setCarregando(true);
    setErro('');
    setCapturas([]);

    try {
      const resultado = await buscarCapturas(userLimpo, data || undefined);
      setCapturas(resultado);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar as capturas.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (username) pesquisar(username, filtroData);
  }, [username, filtroData, pesquisar]);

  const handlePesquisar = (e: React.FormEvent) => {
    e.preventDefault();
    setUsername(inputUsername.trim());
  };

  const irParaAnterior = () =>
    setImagemAmpliada((i) => (i !== null && i > 0 ? i - 1 : i));
  const irParaProxima = () =>
    setImagemAmpliada((i) => (i !== null && i < capturas.length - 1 ? i + 1 : i));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (imagemAmpliada === null) return;
      if (e.key === 'Escape') setImagemAmpliada(null);
      if (e.key === 'ArrowLeft') irParaAnterior();
      if (e.key === 'ArrowRight') irParaProxima();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imagemAmpliada, capturas.length]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Monitor className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Capturas de Ecrã</h1>
            <p className="text-sm text-gray-500">Visualize as capturas registadas por utilizador</p>
          </div>
        </div>
        {username && (
          <button
            onClick={() => pesquisar(username, filtroData)}
            disabled={carregando}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <form onSubmit={handlePesquisar} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              placeholder="Nome de utilizador (ex: domingos)"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="relative sm:w-48">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              placeholder="DD/MM/AAAA"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={!inputUsername.trim() || carregando}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Search className="w-4 h-4" />
            Pesquisar
          </button>
          {(username || filtroData) && (
            <button
              type="button"
              onClick={() => {
                setUsername('');
                setInputUsername('');
                setFiltroData('');
                setCapturas([]);
                setErro('');
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Limpar
            </button>
          )}
        </form>

        {username && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <span>Resultados para:</span>
            <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
              {username}
            </span>
            {filtroData && (
              <>
                <span>·</span>
                <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                  {filtroData}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Estado inicial */}
      {!username && !carregando && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Pesquise por um utilizador</p>
          <p className="text-gray-400 text-sm mt-1">Insira um nome de utilizador para ver as capturas de ecrã</p>
        </div>
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
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{erro}</p>
          </div>
        </div>
      )}

      {/* Sem resultados */}
      {!carregando && !erro && username && capturas.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nenhuma captura encontrada</p>
          <p className="text-gray-400 text-sm mt-1">
            Não existem capturas para <strong>{username}</strong>
            {filtroData ? ` na data ${filtroData}` : ''}
          </p>
        </div>
      )}

      {/* Grid de capturas */}
      {!carregando && capturas.length > 0 && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{capturas.length}</span> captura{capturas.length !== 1 ? 's' : ''} encontrada{capturas.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Galeria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {capturas.map((captura, index) => {
              const dataHora = extrairDataHora(captura);
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all group"
                >
                  {/* Imagem */}
                  <div className="relative bg-gray-100 aspect-video overflow-hidden">
                    <img
                      src={captura.url}
                      alt={captura.filename || `Captura ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '';
                        e.currentTarget.closest('.relative')!.classList.add('img-erro');
                      }}
                    />
                    <button
                      onClick={() => setImagemAmpliada(index)}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all"
                      aria-label="Ampliar imagem"
                    >
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-medium text-gray-800 truncate" title={captura.filename}>
                      {captura.filename || `Captura ${index + 1}`}
                    </p>
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

      {/* Lightbox */}
      {imagemAmpliada !== null && capturas[imagemAmpliada] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImagemAmpliada(null)}
        >
          {/* Fechar */}
          <button
            onClick={() => setImagemAmpliada(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Anterior */}
          {imagemAmpliada > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); irParaAnterior(); }}
              className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Próxima */}
          {imagemAmpliada < capturas.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); irParaProxima(); }}
              className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Imagem */}
          <div
            className="max-w-5xl max-h-[85vh] flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={capturas[imagemAmpliada].url}
              alt={capturas[imagemAmpliada].filename}
              className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            <div className="text-center">
              <p className="text-white text-sm font-medium">
                {capturas[imagemAmpliada].filename || `Captura ${imagemAmpliada + 1}`}
              </p>
              {extrairDataHora(capturas[imagemAmpliada]) && (
                <p className="text-gray-400 text-xs mt-1">
                  {formatarDataHora(extrairDataHora(capturas[imagemAmpliada]))}
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                {imagemAmpliada + 1} / {capturas.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
