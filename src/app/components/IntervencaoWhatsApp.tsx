import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bookmark, CheckCheck, FileText, Loader2, Mic, Paperclip, RefreshCw, Send, Square, Wifi, WifiOff, X } from 'lucide-react';
import type { Intervencao } from '../types/api';
import { clientesService, respostasRapidasService } from '../services/api';
import {
  Mensagem,
  WHATSAPP_WS_URL,
  WhatsAppApiError,
  ficheiroParaBase64,
  ligarWhatsAppWS,
  limparNumero,
  mediatypeDe,
  whatsappService,
} from '../services/whatsappApi';
import { useRealtimeTranslation } from '../hooks/useRealtimeTranslation';
import { ControleTraducao } from './cliente/ClienteIntervencoesView';
import { Languages } from 'lucide-react';

/** Normaliza um telefone para o formato da Evolution (indicativo + número, só dígitos). */
export function numeroWhatsApp(telefone?: string | null): string {
  let n = limparNumero(telefone || '');
  if (n.startsWith('00')) n = n.slice(2);
  // Números angolanos sem indicativo (9 dígitos a começar por 9)
  if (/^9\d{8}$/.test(n)) n = `244${n}`;
  return n;
}

/** Compara dois números tolerando formatos/indicativos (usa os ultimos 9 digitos). */
function mesmoNumero(a?: string | null, b?: string | null) {
  const na = numeroWhatsApp(a);
  const nb = numeroWhatsApp(b);
  if (!na || !nb) return false;
  return na === nb || na.slice(-9) === nb.slice(-9);
}

function mensagemErro(erro: unknown, fallback: string) {
  if (erro instanceof WhatsAppApiError) return erro.message;
  if (erro instanceof Error) return erro.message;
  return fallback;
}

function ordenar(lista: Mensagem[]) {
  const vistos = new Set<string>();
  return lista
    .filter((m) => {
      // chave estavel: id do servidor -> wa_id -> texto+direcao+minuto
      const minuto = m.data ? m.data.slice(0, 16) : '';
      const chave = m.id || `${m.numero}|${m.fromMe ? 'out' : 'in'}|${m.texto}|${minuto}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
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

  // Traducao em tempo real (Deepseek) e transcricao de audios (Whisper).
  const {
    language,
    setLanguage,
    translateText,
    autoTranslate,
    setAutoTranslate,
    supportedLanguages,
    deepseekConfigured,
  } = useRealtimeTranslation('sk-6c52be78ffeb4bde8d5066b4ac90a439');
  const [traducoes, setTraducoes] = useState<Record<string, string>>({});
  const [transcricoes, setTranscricoes] = useState<Record<string, { texto: string; idioma: string }>>({});
  const pedidosTraducaoRef = useRef<Set<string>>(new Set());
  const pedidosTranscricaoRef = useRef<Set<string>>(new Set());

  const chaveTraducao = (id: string) => `${language.code}:${id}`;
  const chaveTraducaoAudio = (id: string) => `${language.code}:audio:${id}`;

  // Traduz o texto de cada mensagem (Deepseek).
  useEffect(() => {
    if (!autoTranslate) return;
    mensagens.forEach((m) => {
      const texto = (m.texto || '').trim();
      if (!texto) return;
      const chave = chaveTraducao(m.id);
      if (pedidosTraducaoRef.current.has(chave)) return;
      pedidosTraducaoRef.current.add(chave);
      translateText(texto, 'auto', language.code)
        .then((traduzido) => {
          if (traduzido && traduzido !== texto) {
            setTraducoes((prev) => ({ ...prev, [chave]: traduzido }));
          }
        })
        .catch(() => {
          pedidosTraducaoRef.current.delete(chave);
        });
    });
  }, [autoTranslate, language.code, mensagens, translateText]);

  const transcreverAudio = useCallback(async (mensagem: Mensagem) => {
    if (!mensagem.id) return;
    const chave = mensagem.id;
    if (pedidosTranscricaoRef.current.has(chave)) return;
    pedidosTranscricaoRef.current.add(chave);
    try {
      const resultado = await whatsappService.transcrever(chave);
      if (resultado.texto) {
        setTranscricoes((prev) => ({
          ...prev,
          [chave]: { texto: resultado.texto, idioma: resultado.idioma },
        }));
      }
    } catch {
      pedidosTranscricaoRef.current.delete(chave);
    }
  }, []);

  // Com a traducao ligada, transcreve os audios automaticamente.
  useEffect(() => {
    if (!autoTranslate) return;
    mensagens.forEach((m) => {
      const ehAudio = m.tipo === 'audio' || /\.(mp3|ogg|m4a|wav|opus|webm)(\?|$)/i.test(m.mediaUrl || '');
      if (!ehAudio) return;
      if (m.transcricao || transcricoes[m.id]) return;
      void transcreverAudio(m);
    });
  }, [autoTranslate, mensagens, transcricoes, transcreverAudio]);

  // Traduz as transcricoes dos audios (Deepseek).
  useEffect(() => {
    if (!autoTranslate) return;
    const todas: Record<string, { texto: string; idioma: string }> = { ...transcricoes };
    mensagens.forEach((m) => {
      if (m.transcricao) {
        todas[m.id] = { texto: m.transcricao, idioma: m.idiomaTranscricao || '' };
      }
    });
    Object.entries(todas).forEach(([id, info]) => {
      if (!info.texto) return;
      const chave = chaveTraducaoAudio(id);
      if (pedidosTraducaoRef.current.has(chave)) return;
      pedidosTraducaoRef.current.add(chave);
      translateText(info.texto, info.idioma || 'auto', language.code)
        .then((traduzido) => {
          if (traduzido && traduzido !== info.texto) {
            setTraducoes((prev) => ({ ...prev, [chave]: traduzido }));
          }
        })
        .catch(() => {
          pedidosTraducaoRef.current.delete(chave);
        });
    });
  }, [autoTranslate, language.code, mensagens, transcricoes, translateText]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [wsLigado, setWsLigado] = useState(false);

  const [texto, setTexto] = useState('');
  const [anexo, setAnexo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [templates, setTemplates] = useState<{ titulo: string; texto: string }[]>([]);
  const [mostrarTemplates, setMostrarTemplates] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [segundosGravacao, setSegundosGravacao] = useState(0);

  const fimRef = useRef<HTMLDivElement>(null);
  const ficheiroRef = useRef<HTMLInputElement>(null);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const cronometroRef = useRef<number | null>(null);
  const numeroRef = useRef('');
  numeroRef.current = numero;

  useEffect(() => {
    setMensagens([]);
  }, [numero]);


  const carregar = useCallback(async (alvo: string, silencioso = false) => {
    if (!alvo) return;
    if (!silencioso) {
      setCarregando(true);
      setErro(null);
    }
    try {
      // Histórico guardado pelo webhook (Django) — uma só leitura
      const lista = await whatsappService.mensagensRecebidasPorNumero(alvo).catch(() => [] as Mensagem[]);
      if (numeroRef.current === alvo) setMensagens(ordenar(lista));
    } catch (e) {
      if (!silencioso && numeroRef.current === alvo) setErro(mensagemErro(e, 'Não foi possível carregar as mensagens WhatsApp.'));
    } finally {
      if (!silencioso && numeroRef.current === alvo) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (numero) carregar(numero);
  }, [numero, carregar]);

  // Tempo real: só mensagens deste número
  useEffect(() => {
    if (!numero) return;
    const ligacao = ligarWhatsAppWS({
      onEstado: (ligado) => {
        setWsLigado(ligado);
        // ao (re)ligar, recupera o que passou enquanto esteve offline
        if (ligado) carregar(numeroRef.current, true);
      },
      onEvento: (evento) => {
        if (evento.event !== 'messages.upsert' || !('mensagem' in evento) || !evento.mensagem) return;
        const alvo = evento.mensagem.numero || evento.contato?.numero;
        if (alvo && mesmoNumero(alvo, numeroRef.current)) {
          setMensagens((lista) => ordenar([...lista, evento.mensagem as Mensagem]));
        }
      },
    });
    return () => ligacao.fechar();
  }, [numero]);

  // Rede de segurança: actualiza sempre a cada 10s (o WS pode ligar e nao receber nada,
  // ex.: webhook tratado por outro processo/instancia). Mantem o chat coerente.
  useEffect(() => {
    if (!numero) return;
    const id = window.setInterval(() => carregar(numero, true), 10000);
    return () => window.clearInterval(id);
  }, [numero, carregar]);

  // Ao voltar ao separador, recarrega (o browser suspende o WS em segundo plano)
  useEffect(() => {
    if (!numero) return;
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') carregar(numeroRef.current, true);
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [numero, carregar]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [mensagens]);

  const pararCronometro = useCallback(() => {
    if (cronometroRef.current !== null) {
      window.clearInterval(cronometroRef.current);
      cronometroRef.current = null;
    }
    setSegundosGravacao(0);
  }, []);

  const iniciarGravacao = async () => {
    if (gravando || enviando || !numero) return;
    setErroEnvio(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const candidatos = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mime = candidatos.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || '';
      const gravador = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      pedacosRef.current = [];

      gravador.ondataavailable = (ev) => {
        if (ev.data.size > 0) pedacosRef.current.push(ev.data);
      };

      gravador.onstop = async () => {
        const tipo = gravador.mimeType || mime || 'audio/webm';
        const blob = new Blob(pedacosRef.current, { type: tipo });
        pedacosRef.current = [];
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (blob.size < 1200) return; // gravação demasiado curta

        const extensao = tipo.includes('ogg') ? 'ogg' : tipo.includes('mp4') ? 'm4a' : 'webm';
        const ficheiro = new File([blob], `audio-${Date.now()}.${extensao}`, { type: tipo });
        setEnviando(true);
        try {
          await whatsappService.enviarAudio(numero, ficheiro);
          // recarrega do servidor: evita bolha local + eco do WebSocket (duplicado)
          await carregar(numeroRef.current, true);
        } catch (erroAudio) {
          setErroEnvio(mensagemErro(erroAudio, 'Falha ao enviar o áudio.'));
        } finally {
          setEnviando(false);
        }
      };

      gravador.start();
      gravadorRef.current = gravador;
      setGravando(true);
      setSegundosGravacao(0);
      cronometroRef.current = window.setInterval(() => setSegundosGravacao((s) => s + 1), 1000);
    } catch {
      setErroEnvio('Não foi possível aceder ao microfone. Verifica as permissões do browser.');
    }
  };

  const pararGravacao = (cancelar = false) => {
    pararCronometro();
    setGravando(false);
    const gravador = gravadorRef.current;
    gravadorRef.current = null;
    if (!gravador) return;
    if (cancelar) {
      gravador.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        pedacosRef.current = [];
      };
    }
    if (gravador.state !== 'inactive') gravador.stop();
  };

  useEffect(() => () => {
    if (cronometroRef.current !== null) window.clearInterval(cronometroRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

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
      // Sem "eco" local: o backend já gravou a mensagem, recarrega para evitar duplicados
      // (o evento do WebSocket traz a mesma mensagem e criaria uma segunda bolha)
      setTexto('');
      setAnexo(null);
      if (ficheiroRef.current) ficheiroRef.current.value = '';
      await carregar(numero, true);
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
          <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-1.5 py-0.5">
            <ControleTraducao
              compact
              language={language}
              setLanguage={setLanguage}
              supportedLanguages={supportedLanguages}
              autoTranslate={autoTranslate}
              setAutoTranslate={setAutoTranslate}
              deepseekConfigured={deepseekConfigured}
            />
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold" title={`${wsLigado ? 'Mensagens em tempo real' : 'A ligar ao tempo real...'} — ${WHATSAPP_WS_URL}`}>
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

              {/* Traducao Deepseek do texto da mensagem */}
              {autoTranslate && traducoes[chaveTraducao(m.id)] && (
                <p className="mt-1.5 pt-1.5 border-t border-black/10 text-[12px] whitespace-pre-wrap break-words text-violet-700">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-violet-500 mb-0.5">
                    Traducao · Deepseek
                  </span>
                  {traducoes[chaveTraducao(m.id)]}
                </p>
              )}

              {/* Transcricao Whisper do audio + traducao */}
              {(() => {
                const ehAudio = m.tipo === 'audio' || /\.(mp3|ogg|m4a|wav|opus|webm)(\?|$)/i.test(m.mediaUrl || '');
                if (!ehAudio) return null;
                const transcricao = m.transcricao || transcricoes[m.id]?.texto || '';
                const idioma = m.idiomaTranscricao || transcricoes[m.id]?.idioma || '';
                const traducaoAudio = traducoes[chaveTraducaoAudio(m.id)];
                return (
                  <div className="mt-1.5 space-y-1.5">
                    {transcricao ? (
                      <div className="rounded-lg bg-gray-50 border border-gray-200 px-2 py-1.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
                          Transcricao · Whisper{idioma ? ` (${idioma})` : ''}
                        </p>
                        <p className="text-[12px] leading-snug text-gray-700 whitespace-pre-wrap break-words">
                          {transcricao}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void transcreverAudio(m)}
                        className="text-[10px] font-black uppercase tracking-wide text-emerald-700 hover:text-emerald-800"
                      >
                        Transcrever audio
                      </button>
                    )}
                    {traducaoAudio && (
                      <div className="rounded-lg bg-violet-50 border border-violet-100 px-2 py-1.5">
                        <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-violet-500 mb-0.5">
                          <Languages className="w-3 h-3" />
                          Traducao · Deepseek
                        </p>
                        <p className="text-[12px] leading-snug text-violet-900 whitespace-pre-wrap break-words">
                          {traducaoAudio}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
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
        {mostrarTemplates && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden max-h-48 overflow-y-auto">
            <p className="px-3 py-2 text-[11px] font-black text-gray-400 uppercase">Respostas rápidas</p>
            {templates.length ? templates.map((t, i) => (
              <button key={i} type="button" onClick={() => { setTexto(t.texto); setMostrarTemplates(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 border-t border-gray-50">
                <span className="font-bold text-xs text-emerald-700">{t.titulo}</span>
                <span className="block text-xs text-gray-500 truncate">{t.texto}</span>
              </button>
            )) : <p className="px-3 pb-3 text-xs text-gray-500">Sem templates (cria em Respostas Rápidas)</p>}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={ficheiroRef} type="file" className="hidden" onChange={(e) => setAnexo(e.target.files?.[0] || null)} />
          <button type="button" onClick={() => ficheiroRef.current?.click()} className="p-3 rounded-xl hover:bg-gray-100 text-gray-500" aria-label="Anexar ficheiro">
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => (gravando ? pararGravacao(false) : iniciarGravacao())}
            disabled={enviando || !numero}
            className={`p-3 rounded-xl disabled:opacity-50 ${gravando ? 'bg-red-600 text-white hover:bg-red-700' : 'hover:bg-gray-100 text-gray-500'}`}
            aria-label={gravando ? 'Parar e enviar áudio' : 'Gravar áudio'}
            title={gravando ? 'Parar e enviar áudio' : 'Gravar áudio'}
          >
            {gravando ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button type="button" title="Respostas rápidas"
            onClick={async () => { if (!mostrarTemplates) { try { const r: any = await respostasRapidasService.listar(); setTemplates((Array.isArray(r) ? r : (r?.results || r?.data || [])) as any); } catch { setTemplates([]); } } setMostrarTemplates((v) => !v); }}
            className="p-3 rounded-xl hover:bg-gray-100 text-gray-500" aria-label="Respostas rápidas">
            <Bookmark className="w-5 h-5" />
          </button>
          {gravando ? (
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-sm font-bold text-red-700">
                A gravar {String(Math.floor(segundosGravacao / 60)).padStart(2, '0')}:{String(segundosGravacao % 60).padStart(2, '0')}
              </span>
              <button type="button" onClick={() => pararGravacao(true)} className="ml-auto text-xs font-bold text-gray-600 hover:text-gray-900">
                Cancelar
              </button>
            </div>
          ) : (
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
          )}
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
