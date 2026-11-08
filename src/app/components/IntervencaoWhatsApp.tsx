import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCheck, FileText, Loader2, Paperclip, RefreshCw, Send, Wifi, WifiOff, X } from 'lucide-react';
import type { Intervencao } from '../types/api';
import { clientesService } from '../services/api';
import {
  Mensagem,
  WhatsAppApiError,
  ficheiroParaBase64,
  ligarWhatsAppWS,
  limparNumero,
  mediatypeDe,
  whatsappService,
} from '../services/whatsappApi';

/** Normaliza um telefone para o formato da Evolution (indicativo + número, só dígitos). */
export function numeroWhatsApp(telefone?: string | null): string {
  let n = limparNumero(telefone || '');
  if (n.startsWith('00')) n = n.slice(2);
  // Números angolanos sem indicativo (9 dígitos a começar por 9)
  if (/^9\d{8}$/.test(n)) n = `244${n}`;
  return n;
}

function mensagemErro(erro: unknown, fallback: string) {
  if (erro instanceof WhatsAppApiError) return erro.message;
  if (erro instanceof Error) return erro.message;
  return fallback;
}

function ordenar(lista: Mensagem[]) {
  const vistos = new Set<string>();
  return lista
    .filter((m) => (vistos.has(m.id) ? false : (vistos.add(m.id), true)))
    .sort((a, b) => (a.data ? Date.parse(a.data) : 0) - (b.data ? Date.parse(b.data) : 0));
}

function dataHora(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Telefone do cliente da intervenção: objecto embutido -> lista já carregada -> GET /clientes/{id}. */
async function resolverTelefone(intervencao: Intervencao, clientes: any[]): Promise<string> {
  const embutido = typeof intervencao.cliente === 'object' && intervencao.cliente ? (intervencao.cliente as any).telefone : null;
  if (embutido) return embutido;
  const daLista = clientes.find((c) => c.id === intervencao.cliente_id)?.telefone;
  if (daLista) return daLista;
  if (intervencao.cliente_id) {
    const cliente = await clientesService.obterPorId(intervencao.cliente_id).catch(() => null);
    if (cliente?.telefone) return cliente.telefone;
  }
  return '';
}

interface Props {
  intervencao: Intervencao;
  clientes?: any[];
}

/** Chat WhatsApp de uma intervenção: resolve o telefone do cliente (API SOSTicket) e abre a conversa (API WhatsApp). */
export function IntervencaoWhatsApp({ intervencao, clientes = [] }: Props) {
  const [numero, setNumero] = useState('');
  const [resolvendo, setResolvendo] = useState(true);
  const [numeroManual, setNumeroManual] = useState('');

  useEffect(() => {
    let activo = true;
    setResolvendo(true);
    setNumero('');
    resolverTelefone(intervencao, clientes)
      .then((tel) => activo && setNumero(numeroWhatsApp(tel)))
      .finally(() => activo && setResolvendo(false));
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervencao.id, intervencao.cliente_id]);

  if (resolvendo) {
    return <div className="flex justify-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  if (!numero) {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); setNumero(numeroWhatsApp(numeroManual)); }}
        className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3"
      >
        <p className="text-sm font-medium text-amber-800">
          O cliente <b>{intervencao.cliente_nome || ''}</b> não tem telefone registado. Indique o número WhatsApp para esta conversa
          (ou actualize o telefone no registo do cliente).
        </p>
        <div className="flex gap-2">
          <input
            value={numeroManual}
            onChange={(e) => setNumeroManual(e.target.value)}
            placeholder="244923000000"
            inputMode="tel"
            className="flex-1 px-4 py-3 rounded-xl border border-amber-200 bg-white text-sm"
          />
          <button type="submit" className="px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">
            Abrir
          </button>
        </div>
      </form>
    );
  }

  return <ChatWhatsApp numero={numero} titulo={intervencao.cliente_nome} />;
}

interface ChatProps {
  numero: string;
  titulo?: string | null;
  /** esconde a barra verde (quando o contentor já mostra o contacto) */
  semCabecalho?: boolean;
  /** ocupa a altura toda do contentor */
  preencher?: boolean;
}

/** Conversa WhatsApp de um número: histórico, tempo real (WS) e envio de texto/ficheiros. */
export function ChatWhatsApp({ numero, titulo, semCabecalho, preencher }: ChatProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [wsLigado, setWsLigado] = useState(false);

  const [texto, setTexto] = useState('');
  const [anexo, setAnexo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const fimRef = useRef<HTMLDivElement>(null);
  const ficheiroRef = useRef<HTMLInputElement>(null);
  const numeroRef = useRef('');
  numeroRef.current = numero;

  useEffect(() => {
    setMensagens([]);
  }, [numero]);


  const carregar = useCallback(async (alvo: string) => {
    if (!alvo) return;
    setCarregando(true);
    setErro(null);
    try {
      // Histórico guardado pelo webhook (SQLite) + recebidas; se vazio, vai à Evolution
      const [doContato, recebidas] = await Promise.all([
        whatsappService.mensagensDoContato(alvo).catch(() => [] as Mensagem[]),
        whatsappService.mensagensRecebidasPorNumero(alvo).catch(() => [] as Mensagem[]),
      ]);
      let lista = [...doContato, ...recebidas];
      if (lista.length === 0) lista = await whatsappService.mensagensPorNumero(alvo);
      if (numeroRef.current === alvo) setMensagens(ordenar(lista));
    } catch (e) {
      if (numeroRef.current === alvo) setErro(mensagemErro(e, 'Não foi possível carregar as mensagens WhatsApp.'));
    } finally {
      if (numeroRef.current === alvo) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (numero) carregar(numero);
  }, [numero, carregar]);

  // Tempo real: só mensagens deste número
  useEffect(() => {
    if (!numero) return;
    const ligacao = ligarWhatsAppWS({
      onEstado: setWsLigado,
      onEvento: (evento) => {
        if (evento.event !== 'messages.upsert' || !('mensagem' in evento) || !evento.mensagem) return;
        const alvo = evento.mensagem.numero || evento.contato?.numero;
        if (alvo && numeroWhatsApp(alvo) === numeroRef.current) {
          setMensagens((lista) => ordenar([...lista, evento.mensagem as Mensagem]));
        }
      },
    });
    return () => ligacao.fechar();
  }, [numero]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [mensagens]);

  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    const conteudo = texto.trim();
    if (!numero || enviando || (!conteudo && !anexo)) return;
    setEnviando(true);
    setErroEnvio(null);
    let urlFoto: string | null = null;
    try {
      if (anexo) {
        try {
          const resp: any = await whatsappService.enviarCloudinary(numero, anexo, conteudo || null);
          urlFoto = resp?.cloudinaryUrl || resp?.data?.cloudinaryUrl || null;
        } catch (erroCloud) {
          if (erroCloud instanceof WhatsAppApiError && erroCloud.status === 0) throw erroCloud;
          await whatsappService.enviarMedia({
            numero,
            media: await ficheiroParaBase64(anexo),
            mediatype: mediatypeDe(anexo.type || ''),
            mimetype: anexo.type || 'application/octet-stream',
            fileName: anexo.name,
            caption: conteudo || null,
          });
        }
      } else {
        await whatsappService.enviar({ numero, texto: conteudo });
      }
      setMensagens((lista) => ordenar([...lista, {
        id: `local-${Date.now()}`,
        numero,
        texto: anexo ? (conteudo || '') : conteudo,
        fromMe: true,
        data: new Date().toISOString(),
        tipo: anexo ? mediatypeDe(anexo.type || '') : 'text',
        mediaUrl: urlFoto,
        raw: null,
      } as Mensagem]));
      setTexto('');
      setAnexo(null);
      if (ficheiroRef.current) ficheiroRef.current.value = '';
    } catch (erroEnv) {
      setErroEnvio(mensagemErro(erroEnv, 'Falha ao enviar pelo WhatsApp.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={`flex flex-col overflow-hidden ${preencher ? 'h-full' : 'rounded-2xl border border-gray-100'}`}>
      {!semCabecalho && (
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-emerald-600 text-white">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{titulo || 'Cliente'}</p>
          <p className="text-[11px] text-emerald-100">+{numero}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold" title={wsLigado ? 'Mensagens em tempo real' : 'A ligar ao tempo real...'}>
            {wsLigado ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 opacity-70" />}
            {wsLigado ? 'ao vivo' : '...'}
          </span>
          <button type="button" onClick={() => carregar(numero)} className="p-1.5 rounded-lg hover:bg-white/20" aria-label="Recarregar">
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      )}

      <div className={`${preencher ? 'flex-1 min-h-0' : 'max-h-[400px] min-h-[220px]'} overflow-y-auto px-3 py-3 space-y-2 bg-[#efeae2]`}>
        {carregando && mensagens.length === 0 ? (
          <div className="flex justify-center py-8 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : erro ? (
          <div className="mx-auto max-w-sm rounded-lg bg-white px-4 py-3 text-sm text-red-600 text-center shadow-sm">{erro}</div>
        ) : mensagens.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-8">Sem mensagens WhatsApp com este cliente.</p>
        ) : mensagens.map((m) => (
          <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm text-sm whitespace-pre-wrap break-words ${m.fromMe ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
              {m.tipo && !['text', 'conversation', 'extendedText'].includes(m.tipo) && (
                <span className="flex items-center gap-1 text-xs text-gray-500 mb-1"><FileText className="w-3.5 h-3.5" /> {m.tipo}</span>
              )}
              {m.mediaUrl && /^https?:/i.test(m.mediaUrl) && (
                m.tipo === 'image' || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(m.mediaUrl) ? (
                  <a href={m.mediaUrl} target="_blank" rel="noreferrer"><img src={m.mediaUrl} alt="" className="rounded-md max-h-60 mb-1" /></a>
                ) : m.tipo === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(m.mediaUrl) ? (
                  <video src={m.mediaUrl} controls className="rounded-md max-h-60 w-full mb-1" />
                ) : m.tipo === 'audio' || /\.(mp3|ogg|m4a|wav)(\?|$)/i.test(m.mediaUrl) ? (
                  <audio src={m.mediaUrl} controls className="w-full mb-1" />
                ) : (
                  <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="block text-emerald-700 underline mb-1">Abrir anexo{m.fileName ? ` — ${m.fileName}` : ''}</a>
                )
              )}
              {m.texto || (!m.mediaUrl && <span className="italic text-gray-400">(sem texto)</span>)}
              <span className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-500">
                {dataHora(m.data)}
                {m.fromMe && <CheckCheck className="w-3.5 h-3.5 text-sky-500" />}
              </span>
            </div>
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      <form onSubmit={enviar} className="p-3 border-t border-gray-100 bg-white space-y-2">
        {erroEnvio && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{erroEnvio}</span>
            <button type="button" onClick={() => setErroEnvio(null)} aria-label="Fechar"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {anexo && (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700">
            <Paperclip className="w-4 h-4" />
            <span className="flex-1 truncate">{anexo.name} ({Math.ceil(anexo.size / 1024)} KB)</span>
            <button type="button" onClick={() => { setAnexo(null); if (ficheiroRef.current) ficheiroRef.current.value = ''; }} aria-label="Remover anexo">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={ficheiroRef} type="file" className="hidden" onChange={(e) => setAnexo(e.target.files?.[0] || null)} />
          <button type="button" onClick={() => ficheiroRef.current?.click()} className="p-3 rounded-xl hover:bg-gray-100 text-gray-500" aria-label="Anexar ficheiro">
            <Paperclip className="w-5 h-5" />
          </button>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
            }}
            rows={1}
            placeholder={anexo ? 'Legenda (opcional)' : 'Mensagem WhatsApp...'}
            className="flex-1 resize-none max-h-32 px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-0 text-sm"
          />
          <button
            type="submit"
            disabled={enviando || (!texto.trim() && !anexo)}
            className="p-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            aria-label="Enviar pelo WhatsApp"
          >
            {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>
    </div>
  );
}
