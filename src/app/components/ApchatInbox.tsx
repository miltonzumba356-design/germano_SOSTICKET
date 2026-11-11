import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  FileText,
  Film,
  Loader2,
  MessageSquare,
  Mic,
  Music,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Ticket,
  User,
  X,
} from 'lucide-react';
import type { Cliente, Intervencao } from '../types/api';
import { clientesService, intervencoesService } from '../services/api';
import { useRealtimeTranslation } from '../hooks/useRealtimeTranslation';
import { ControleTraducao } from './cliente/ClienteIntervencoesView';
import { TranscricaoAudio } from './TranscricaoAudio';

// apchat — chat interno com o mesmo modelo do WhatsApp:
// lista de clientes à esquerda + conversa à direita + criar ticket na conversa.

function listaDe(resp: any): any[] {
  const l = Array.isArray(resp) ? resp : resp?.data?.results || resp?.results || resp?.data || [];
  return Array.isArray(l) ? l : [];
}

function comentariosDe(i: any): any[] {
  const c = i?.comentarios || i?.comentario || [];
  return Array.isArray(c) ? c : [];
}

function horaCurta(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

function horaMensagem(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function iniciais(texto: string) {
  return (
    texto
      .replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '#'
  );
}

function nomeEmpresa(empresa?: string | { nome?: string; Email_empresa?: string } | null) {
  if (!empresa) return '';
  if (typeof empresa === 'string') return empresa;
  return empresa.nome || empresa.Email_empresa || '';
}

function extensaoDe(anexo: any) {
  const nome = String(anexo?.nome_arquivo || anexo?.nome || '');
  if (/\.[a-z0-9]{2,5}$/i.test(nome)) return nome.toLowerCase();
  const url = String(anexo?.url || '');
  // Cloudinary entrega por /raw/download?...&format=png
  const m = url.match(/[?&]format=([a-z0-9]{2,5})/i);
  if (m) return `x.${m[1].toLowerCase()}`;
  return url.toLowerCase().split('?')[0];
}

function tipoAnexo(anexo: any) {
  const alvo = extensaoDe(anexo);
  // Gravações de voz chegam como .webm — o nome diz que é áudio.
  if (/\.webm$/.test(alvo) && /nota-de-voz|voz|voice|audio/i.test(String(anexo?.nome_arquivo || anexo?.nome || ''))) return 'audio';
  if (/\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/.test(alvo)) return 'imagem';
  if (/\.(mp4|webm|mov|avi|mkv|m4v)$/.test(alvo)) return 'video';
  if (/\.(mp3|wav|ogg|oga|m4a|aac|opus|weba|amr|3gp)$/.test(alvo)) return 'audio';
  if (/\.pdf$/.test(alvo)) return 'pdf';
  return 'outro';
}

function nomeAnexo(a: any) {
  const bruto = String(
    a?.nome_arquivo || a?.nome || String(a?.url || '').split('/').pop() || 'Ficheiro',
  );
  // Remove o prefixo UUID e o sufixo aleatório do Cloudinary.
  return bruto
    .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i, '')
    .replace(/_([a-z0-9]{6})(\.[a-z0-9]{2,5})$/i, '$2') || bruto;
}

function rotuloAnexo(a: any) {
  const bruto = nomeAnexo(a);
  if (tipoAnexo(a) === 'audio' && /nota-de-voz|voz|voice/i.test(bruto)) return 'Nota de voz';
  return bruto;
}

// Anexo dentro da conversa, na posição cronológica correcta.
function BolhaAnexo({
  anexo,
  onAbrir,
  intervencaoId,
  autoTranslate,
  targetLanguage,
  translateText,
}: {
  anexo: any;
  onAbrir: (v: { url: string; nome: string; tipo: string }) => void;
  intervencaoId?: string;
  autoTranslate?: boolean;
  targetLanguage?: string;
  translateText?: (texto: string, de: string, para: string) => Promise<string>;
}) {
  const tipo = tipoAnexo(anexo);
  const nome = nomeAnexo(anexo);
  const hora = horaMensagem(anexo.data_criacao);
  const abrir = () => onAbrir({ url: anexo.url, nome, tipo });

  if (tipo === 'imagem') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[260px]">
          <button
            type="button"
            onClick={abrir}
            className="block rounded-2xl overflow-hidden border border-black/5 shadow-sm bg-white hover:opacity-95 transition-opacity"
            title={nome}
          >
            <img src={anexo.url} alt={nome} className="block max-h-[300px] w-auto object-cover" />
          </button>
          <p className="text-[10px] text-right mt-1 text-gray-500">{hora}</p>
        </div>
      </div>
    );
  }

  if (tipo === 'audio') {
    return (
      <div className="flex justify-end">
        <div className="w-full sm:w-[320px] p-2.5 rounded-2xl rounded-br-md bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Music className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-gray-700 truncate">{rotuloAnexo(anexo)}</p>
              <p className="text-[10px] text-gray-400 uppercase">Áudio · toca aqui</p>
            </div>
            <a
              href={anexo.url}
              target="_blank"
              rel="noreferrer"
              title="Abrir noutro separador"
              className="p-1.5 rounded-lg text-gray-400 hover:text-theme-primary hover:bg-gray-50"
            >
              <Paperclip className="w-4 h-4" />
            </a>
          </div>
          <audio src={anexo.url} controls preload="metadata" className="w-full h-9" />
          {intervencaoId && anexo?.id && translateText && (
            <TranscricaoAudio
              intervencaoId={intervencaoId}
              anexo={{ id: String(anexo.id), transcricao: anexo.transcricao, idioma_transcricao: anexo.idioma_transcricao }}
              autoTranslate={!!autoTranslate}
              targetLanguage={targetLanguage || 'pt'}
              translateText={translateText}
            />
          )}
          <p className="text-[10px] text-right mt-1 text-gray-400">{hora}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={abrir}
        className="flex items-center gap-2.5 max-w-[280px] p-2.5 pr-3 rounded-2xl rounded-br-md bg-white border border-gray-100 shadow-sm hover:border-theme-primary transition-colors text-left"
        title={nome}
      >
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            tipo === 'video'
              ? 'bg-purple-50 text-purple-500'
              : tipo === 'pdf'
              ? 'bg-red-50 text-red-500'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {tipo === 'video' ? (
            <Film className="w-5 h-5" />
          ) : tipo === 'pdf' ? (
            <FileText className="w-5 h-5" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-bold text-gray-700 truncate">{nome}</span>
          <span className="block text-[10px] text-gray-400 uppercase">
            {tipo} · abrir · {hora}
          </span>
        </span>
      </button>
    </div>
  );
}

// Fundo suave do chat (estilo WhatsApp), com um padrão discreto.
const FUNDO_CHAT: CSSProperties = {
  backgroundColor: '#f4f1ec',
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'%3E%3Cg fill='%23000000' fill-opacity='0.035'%3E%3Ccircle cx='12' cy='12' r='2'/%3E%3Ccircle cx='48' cy='24' r='1.6'/%3E%3Ccircle cx='30' cy='44' r='2'/%3E%3Ccircle cx='60' cy='58' r='1.6'/%3E%3Ccircle cx='8' cy='60' r='1.6'/%3E%3C/g%3E%3C/svg%3E\")",
  backgroundSize: '72px 72px',
};

interface Props {
  usuarioNome?: string;
  onTicketCriado?: () => void;
  intervaloListaMs?: number;
  intervaloConversaMs?: number;
}

interface ModalTicket {
  titulo: string;
  descricao: string;
  prioridade: string;
  aGuardar: boolean;
  erro: string | null;
}

export function ApchatInbox({
  usuarioNome,
  onTicketCriado,
  intervaloListaMs = 15_000,
  intervaloConversaMs = 10_000,
}: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pesquisa, setPesquisa] = useState('');

  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [detalhe, setDetalhe] = useState<Intervencao | null>(null);
  const [carregandoConversa, setCarregandoConversa] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [modalTicket, setModalTicket] = useState<ModalTicket | null>(null);
  const [visualizador, setVisualizador] = useState<{ url: string; nome: string; tipo: string } | null>(null);
  const [gravando, setGravando] = useState(false);
  const [segundosGravacao, setSegundosGravacao] = useState(0);
  const [erroAudio, setErroAudio] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, any[]>>({});
  const fimRef = useRef<HTMLDivElement>(null);
  const inputAnexoRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksAudioRef = useRef<Blob[]>([]);
  const timerGravacaoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tradução em tempo real com Deepseek (apchat)
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
  const traducoesPedidasRef = useRef<Set<string>>(new Set());

  const chaveTraducao = (texto?: string) => `${language.code}:${texto || ''}`;

  useEffect(() => {
    if (!autoTranslate || !detalhe) return;

    const textos = [
      detalhe.descricao,
      ...((detalhe.comentarios || []) as any[]).map((c) => c.texto),
    ].filter((t): t is string => typeof t === 'string' && t.trim().length > 0);

    textos.forEach((texto) => {
      const chave = chaveTraducao(texto);
      if (traducoesPedidasRef.current.has(chave)) return;
      traducoesPedidasRef.current.add(chave);

      translateText(texto, 'auto', language.code)
        .then((traduzido) => {
          if (traduzido && traduzido !== texto) {
            setTraducoes((prev) => ({ ...prev, [chave]: traduzido }));
          }
        })
        .catch(() => {
          traducoesPedidasRef.current.delete(chave);
        });
    });
  }, [autoTranslate, language.code, detalhe, translateText]);

  const carregarLista = async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const [respClientes, respIntervencoes] = await Promise.all([
        clientesService.listar({ limit: 100 } as any),
        intervencoesService.listar({ limit: 100 }),
      ]);
      setClientes(listaDe(respClientes));
      setIntervencoes(listaDe(respIntervencoes));
      setErro(null);
    } catch (e: any) {
      if (!silencioso) setErro(e?.message || 'Falha ao carregar o apchat.');
    } finally {
      if (!silencioso) setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLista();
    const timer = setInterval(() => carregarLista(true), intervaloListaMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervaloListaMs]);

  // A lista de atendimentos não traz comentários: busca o detalhe de cada um
  // para mostrar a última mensagem e o contador na lista de clientes.
  const chaveIdsAtendimentos = intervencoes
    .map((i) => i.id)
    .filter(Boolean)
    .slice(0, 40)
    .join('|');

  useEffect(() => {
    const ids = chaveIdsAtendimentos ? chaveIdsAtendimentos.split('|') : [];
    if (ids.length === 0) return;

    let cancelado = false;
    const buscar = async () => {
      const resultados = await Promise.allSettled(
        ids.map((id) => intervencoesService.obterPorId(id)),
      );
      if (cancelado) return;
      setPreviews((prev) => {
        const novo = { ...prev };
        resultados.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            novo[ids[idx]] = comentariosDe(r.value as any);
          }
        });
        return novo;
      });
    };

    buscar();
    const timer = setInterval(buscar, 45_000);
    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [chaveIdsAtendimentos]);

  // cliente_id -> atendimento mais recente
  const intervencaoPorCliente = useMemo(() => {
    const mapa = new Map<string, Intervencao>();
    const ordenadas = [...intervencoes].sort((a, b) =>
      String(b.data_abertura || '').localeCompare(String(a.data_abertura || '')),
    );
    for (const i of ordenadas) {
      if (i.cliente_id && !mapa.has(i.cliente_id)) mapa.set(i.cliente_id, i);
    }
    return mapa;
  }, [intervencoes]);

  const intervencaoSelecionada = clienteSel ? intervencaoPorCliente.get(clienteSel.id) || null : null;

  const carregarConversa = async (intervencaoId: string, silencioso = false) => {
    if (!silencioso) setCarregandoConversa(true);
    try {
      const d = await intervencoesService.obterPorId(intervencaoId);
      setDetalhe(d);
      setPreviews((prev) => ({ ...prev, [intervencaoId]: comentariosDe(d) }));
    } catch {
      // silencioso
    } finally {
      if (!silencioso) setCarregandoConversa(false);
    }
  };

  // Ao mudar de cliente, carrega a conversa do atendimento mais recente.
  useEffect(() => {
    if (!intervencaoSelecionada) {
      setDetalhe(null);
      return;
    }
    carregarConversa(intervencaoSelecionada.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervencaoSelecionada?.id]);

  // Actualiza a conversa aberta a cada X segundos.
  useEffect(() => {
    if (!detalhe?.id) return;
    const timer = setInterval(() => carregarConversa(detalhe.id, true), intervaloConversaMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalhe?.id, intervaloConversaMs]);

  // Scroll para a última mensagem.
  useEffect(() => {
    if (detalhe) fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [detalhe?.comentarios?.length, detalhe?.id]);

  const linhas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();

    return clientes
      .map((cliente) => {
        const intervencao = intervencaoPorCliente.get(cliente.id);
        const coms = (intervencao && previews[intervencao.id]) || comentariosDe(intervencao);
        const ultimo = coms[coms.length - 1];
        return { cliente, intervencao, coms, ultimo };
      })
      .filter(({ cliente, intervencao, ultimo }) => {
        if (!termo) return true;
        return [
          cliente.nome,
          cliente.email,
          cliente.telefone,
          nomeEmpresa(cliente.empresa as any),
          intervencao?.numero,
          intervencao?.titulo,
          ultimo?.texto,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(termo);
      })
      .sort((a, b) => {
        const da = a.ultimo?.data_criacao || a.intervencao?.data_abertura || '';
        const db = b.ultimo?.data_criacao || b.intervencao?.data_abertura || '';
        if (da && db) return String(db).localeCompare(String(da));
        if (da) return -1;
        if (db) return 1;
        return String(a.cliente.nome || '').localeCompare(String(b.cliente.nome || ''));
      });
  }, [clientes, intervencaoPorCliente, previews, pesquisa]);

  const totalComMensagens = linhas.filter((l) => l.coms.length > 0).length;
  const comentarios = detalhe?.comentarios || [];

  // Mensagens e anexos intercalados pela ordem real da conversa.
  const timeline = useMemo(() => {
    const itens: Array<{ tipo: 'descricao' | 'mensagem' | 'anexo'; id: string; data?: string | null; dado: any }> = [];

    if (detalhe?.descricao) {
      itens.push({
        tipo: 'descricao',
        id: `descricao-${detalhe.id}`,
        data: detalhe.data_abertura,
        dado: detalhe,
      });
    }

    for (const c of detalhe?.comentarios || []) {
      itens.push({
        tipo: 'mensagem',
        id: String(c.id || `m-${c.data_criacao}-${String(c.texto || '').slice(0, 12)}`),
        data: c.data_criacao,
        dado: c,
      });
    }

    for (const a of detalhe?.anexos || []) {
      itens.push({
        tipo: 'anexo',
        id: String(a.id || `a-${a.url}`),
        data: a.data_criacao,
        dado: a,
      });
    }

    return itens.sort((x, y) => String(x.data || '').localeCompare(String(y.data || '')));
  }, [detalhe]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!detalhe || !texto.trim() || enviando) return;
    setEnviando(true);
    try {
      await intervencoesService.adicionarComentario(detalhe.id, {
        texto: texto.trim(),
        visivel_cliente: true,
      });
      setTexto('');
      await carregarConversa(detalhe.id, true);
      carregarLista(true);
    } catch {
      // silencioso
    } finally {
      setEnviando(false);
    }
  };

  const enviarAnexo = async (file?: File | null) => {
    if (!detalhe || !file || enviandoAnexo) return;
    setEnviandoAnexo(true);
    try {
      await intervencoesService.carregarAnexo(detalhe.id, file);
      await carregarConversa(detalhe.id, true);
    } catch {
      // silencioso
    } finally {
      setEnviandoAnexo(false);
      if (inputAnexoRef.current) inputAnexoRef.current.value = '';
    }
  };

  // ── Gravação de áudio (nota de voz) ─────────────────────────
  const iniciarGravacao = async () => {
    setErroAudio(null);
    if (!detalhe) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErroAudio('Este navegador não suporta gravação de áudio.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksAudioRef.current = [];

      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksAudioRef.current.push(ev.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksAudioRef.current, { type: mr.mimeType || 'audio/webm' });
        chunksAudioRef.current = [];
        if (blob.size > 0) {
          const ext = (mr.mimeType || '').includes('ogg') ? 'ogg' : 'webm';
          const file = new File([blob], `audio-${Date.now()}.${ext}`, {
            type: blob.type || 'audio/webm',
          });
          await enviarAnexo(file);
        }
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setGravando(true);
      setSegundosGravacao(0);
      timerGravacaoRef.current = setInterval(() => setSegundosGravacao((s) => s + 1), 1000);
    } catch {
      setErroAudio('Não foi possível aceder ao microfone. Autoriza o microfone no navegador.');
    }
  };

  const pararGravacao = (cancelar = false) => {
    if (timerGravacaoRef.current) {
      clearInterval(timerGravacaoRef.current);
      timerGravacaoRef.current = null;
    }
    const mr = mediaRecorderRef.current;
    if (mr) {
      if (cancelar) {
        chunksAudioRef.current = [];
        mr.onstop = null;
        mr.stream.getTracks().forEach((t) => t.stop());
        mr.stop();
      } else {
        mr.stop();
      }
    }
    mediaRecorderRef.current = null;
    setGravando(false);
  };

  // Limpa gravação pendente ao desmontar.
  useEffect(() => {
    return () => {
      if (timerGravacaoRef.current) clearInterval(timerGravacaoRef.current);
      const mr = mediaRecorderRef.current;
      if (mr) {
        mr.stream.getTracks().forEach((t) => t.stop());
        try { mr.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  const abrirModalTicket = () => {
    if (!clienteSel) return;
    const ultimo = comentarios[comentarios.length - 1];
    setModalTicket({
      titulo: ultimo?.texto ? String(ultimo.texto).slice(0, 80) : '',
      descricao: ultimo?.texto ? String(ultimo.texto) : '',
      prioridade: 'media',
      aGuardar: false,
      erro: null,
    });
  };

  const criarTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalTicket || !clienteSel) return;
    if (!modalTicket.titulo.trim() || !modalTicket.descricao.trim()) return;

    setModalTicket((m) => m && { ...m, aGuardar: true, erro: null });
    try {
      await intervencoesService.criar({
        titulo: modalTicket.titulo.trim(),
        descricao: modalTicket.descricao.trim(),
        cliente_id: clienteSel.id,
        prioridade: modalTicket.prioridade,
      });
      setModalTicket(null);
      await carregarLista(true);
      onTicketCriado?.();
    } catch (err: any) {
      setModalTicket((m) =>
        m && { ...m, aGuardar: false, erro: err?.message || 'Não foi possível criar o ticket.' },
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* Barra de estado */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold bg-indigo-50 text-theme-primary">
          <MessageSquare className="w-3.5 h-3.5" />
          Chat interno
        </span>
        <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
          {clientes.length} clientes
        </span>
        <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
          {totalComMensagens} com mensagens
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid md:grid-cols-[340px_1fr] h-[640px] min-h-0">
          {/* ── Lista de clientes ─────────────────────────────── */}
          <aside className={`${clienteSel ? 'hidden md:flex' : 'flex'} flex-col min-h-0 border-r border-gray-100`}>
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-theme-primary" />
                    apchat
                  </h3>
                  <p className="text-[11px] text-gray-500">Todos os clientes, como no WhatsApp</p>
                </div>
                <button
                  type="button"
                  onClick={() => carregarLista()}
                  disabled={carregando}
                  title="Actualizar"
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-theme-primary transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  placeholder="Buscar cliente, empresa ou telefone..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-theme-primary focus:ring-0 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {carregando ? (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium">A carregar clientes...</span>
                </div>
              ) : erro ? (
                <div className="m-3 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{erro}</span>
                </div>
              ) : linhas.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
                  <User className="w-8 h-8 text-gray-300" />
                  <p className="text-sm font-bold text-gray-700">
                    {pesquisa ? 'Nenhum cliente encontrado' : 'Sem clientes'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {pesquisa ? 'Tenta outro nome ou telefone.' : 'Os clientes aparecem aqui.'}
                  </p>
                </div>
              ) : (
                linhas.map(({ cliente, intervencao, coms, ultimo }) => {
                  const activo = clienteSel?.id === cliente.id;
                  return (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => setClienteSel(cliente)}
                      className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-gray-50 transition-colors ${
                        activo ? 'bg-indigo-50/70' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-theme-primary flex items-center justify-center font-black text-xs flex-shrink-0">
                        {iniciais(cliente.nome || 'Cliente')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {cliente.nome || 'Cliente'}
                          </p>
                          <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">
                            {horaCurta(ultimo?.data_criacao || intervencao?.data_abertura)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {ultimo ? (
                            <>
                              <span className="font-semibold text-gray-600">{ultimo.usuario_nome}:</span>{' '}
                              {ultimo.texto}
                            </>
                          ) : intervencao ? (
                            <span className="italic text-gray-400">Sem mensagens · #{intervencao.numero}</span>
                          ) : (
                            <span className="italic text-gray-400">Sem atendimento</span>
                          )}
                        </p>
                      </div>
                      {coms.length > 0 && (
                        <span className="text-[10px] font-black text-theme-primary bg-indigo-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                          {coms.length}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Conversa ──────────────────────────────────────── */}
          <section className={`${clienteSel ? 'flex' : 'hidden md:flex'} flex-col min-h-0 bg-gray-50`}>
            {!clienteSel ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                <div className="w-16 h-16 rounded-3xl bg-white border border-gray-100 shadow-sm text-theme-primary flex items-center justify-center">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-800">apchat</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Seleciona um cliente à esquerda para ver a conversa interna.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Cabeçalho da conversa */}
                <header className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setClienteSel(null)}
                    className="md:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-theme-primary flex items-center justify-center font-black text-xs flex-shrink-0">
                    {iniciais(clienteSel.nome || 'Cliente')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-gray-900 truncate">{clienteSel.nome || 'Cliente'}</p>
                    <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-gray-500">
                      {nomeEmpresa(clienteSel.empresa as any) && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3" /> {nomeEmpresa(clienteSel.empresa as any)}
                        </span>
                      )}
                      {clienteSel.telefone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {clienteSel.telefone}
                        </span>
                      )}
                      {intervencaoSelecionada && (
                        <span className="font-bold text-theme-primary">#{intervencaoSelecionada.numero}</span>
                      )}
                    </div>
                  </div>
                  <ControleTraducao
                    compact
                    language={language}
                    setLanguage={setLanguage}
                    supportedLanguages={supportedLanguages}
                    autoTranslate={autoTranslate}
                    setAutoTranslate={setAutoTranslate}
                    deepseekConfigured={deepseekConfigured}
                  />
                  <button
                    type="button"
                    onClick={abrirModalTicket}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold shadow-sm hover:bg-theme-primary-hover transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Criar ticket
                  </button>
                </header>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3" style={FUNDO_CHAT}>
                  {!intervencaoSelecionada ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                      <Ticket className="w-8 h-8 text-gray-300" />
                      <div>
                        <p className="text-sm font-bold text-gray-700">Sem atendimento</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Cria um ticket para começar a conversa com este cliente.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={abrirModalTicket}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-primary text-white text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-theme-primary-hover transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Criar ticket
                      </button>
                    </div>
                  ) : carregandoConversa ? (
                    <div className="h-full flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-medium">A carregar conversa...</span>
                    </div>
                  ) : timeline.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                      <MessageSquare className="w-8 h-8 text-gray-300" />
                      <p className="text-sm font-bold text-gray-700">Ainda não há mensagens</p>
                      <p className="text-xs text-gray-500">Escreve a primeira mensagem para este cliente.</p>
                    </div>
                  ) : (
                    timeline.map((item) => {
                      // Anexos aparecem na posição cronológica, como no WhatsApp.
                      if (item.tipo === 'anexo') {
                        return (
                          <BolhaAnexo
                            key={item.id}
                            anexo={item.dado}
                            onAbrir={setVisualizador}
                            intervencaoId={detalhe?.id}
                            autoTranslate={autoTranslate}
                            targetLanguage={language.code}
                            translateText={translateText}
                          />
                        );
                      }

                      // Primeira mensagem: a descrição do ticket.
                      if (item.tipo === 'descricao') {
                        return (
                          <div key={item.id} className="flex justify-start">
                            <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-white text-gray-800 border border-gray-100/80 shadow">
                              <p className="text-[10px] font-black uppercase tracking-wide text-theme-primary mb-0.5">
                                Solicitação inicial
                              </p>
                              <p className="text-sm font-medium whitespace-pre-wrap break-words">
                                {item.dado.descricao}
                              </p>
                              {autoTranslate && traducoes[chaveTraducao(item.dado.descricao)] && (
                                <p className="mt-2 pt-2 border-t border-gray-200 text-[13px] text-gray-600 whitespace-pre-wrap break-words">
                                  <span className="block text-[9px] font-bold uppercase tracking-widest text-theme-primary/70 mb-0.5">
                                    Tradução · Deepseek
                                  </span>
                                  {traducoes[chaveTraducao(item.dado.descricao)]}
                                </p>
                              )}
                              <p className="text-[10px] mt-1 text-right text-gray-400">
                                {horaMensagem(item.data)}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      const com = item.dado;
                      const meu = !!usuarioNome && com.usuario_nome === usuarioNome;
                      return (
                        <div key={item.id} className={`flex ${meu ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow ${
                              meu
                                ? 'bg-gradient-to-br from-theme-primary to-indigo-600 text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-100/80 rounded-bl-md'
                            }`}
                          >
                            {!meu && (
                              <p className="text-[10px] font-black uppercase tracking-wide text-theme-primary mb-0.5">
                                {com.usuario_nome || 'Equipa'}
                              </p>
                            )}
                            <p className="text-sm font-medium whitespace-pre-wrap break-words">{com.texto}</p>
                            {autoTranslate && traducoes[chaveTraducao(com.texto)] && (
                              <p
                                className={`mt-2 pt-2 border-t text-[13px] whitespace-pre-wrap break-words ${
                                  meu ? 'border-white/25 text-white/90' : 'border-gray-200 text-gray-600'
                                }`}
                              >
                                <span className={`block text-[9px] font-bold uppercase tracking-widest mb-0.5 ${meu ? 'text-white/70' : 'text-theme-primary/70'}`}>
                                  Tradução · Deepseek
                                </span>
                                {traducoes[chaveTraducao(com.texto)]}
                              </p>
                            )}
                            <p
                              className={`text-[10px] mt-1 text-right ${
                                meu ? 'text-indigo-200' : 'text-gray-400'
                              }`}
                            >
                              {horaMensagem(com.data_criacao)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={fimRef} />
                </div>

                {/* Composer */}
                {intervencaoSelecionada && (
                  <form onSubmit={enviar} className="border-t border-gray-100 bg-white">
                    {erroAudio && (
                      <p className="px-4 pt-2 text-[11px] font-medium text-red-600">{erroAudio}</p>
                    )}

                    {gravando ? (
                      <div className="p-3 flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                        <span className="text-sm font-bold text-red-600 tabular-nums">
                          A gravar{' '}
                          {String(Math.floor(segundosGravacao / 60)).padStart(2, '0')}:
                          {String(segundosGravacao % 60).padStart(2, '0')}
                        </span>
                        <div className="flex-1" />
                        <button
                          type="button"
                          onClick={() => pararGravacao(true)}
                          title="Cancelar"
                          className="p-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => pararGravacao(false)}
                          className="inline-flex items-center gap-2 px-4 py-3 bg-theme-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-theme-primary-hover transition-colors"
                        >
                          <Send className="w-4 h-4" /> Enviar áudio
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 flex items-center gap-2">
                        <input
                          ref={inputAnexoRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => enviarAnexo(e.target.files?.[0])}
                        />
                        <button
                          type="button"
                          onClick={() => inputAnexoRef.current?.click()}
                          disabled={enviandoAnexo}
                          title="Anexar ficheiro (foto, áudio, documento)"
                          className="p-3 text-gray-500 hover:text-theme-primary hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {enviandoAnexo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                        </button>
                        <input
                          type="text"
                          value={texto}
                          onChange={(e) => setTexto(e.target.value)}
                          placeholder="Escreve uma mensagem..."
                          className="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
                        />
                        {texto.trim() ? (
                          <button
                            type="submit"
                            disabled={enviando}
                            className="p-3 bg-theme-primary text-white rounded-xl hover:bg-theme-primary-hover shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={iniciarGravacao}
                            disabled={enviandoAnexo}
                            title="Gravar áudio"
                            className="p-3 bg-theme-primary text-white rounded-xl hover:bg-theme-primary-hover shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                          >
                            <Mic className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* Visualizador de fotos, vídeos, áudio e documentos */}
      {visualizador && (
        <div
          className="fixed inset-0 bg-black/85 z-[95] flex items-center justify-center p-4"
          onClick={() => setVisualizador(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 mb-3 text-white">
              <p className="text-sm font-bold truncate">{visualizador.nome}</p>
              <button
                type="button"
                onClick={() => setVisualizador(null)}
                className="p-2 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {visualizador.tipo === 'imagem' ? (
              <img
                src={visualizador.url}
                alt={visualizador.nome}
                className="max-h-[75vh] w-auto mx-auto rounded-2xl shadow-2xl"
              />
            ) : visualizador.tipo === 'video' ? (
              <video
                src={visualizador.url}
                controls
                autoPlay
                className="max-h-[75vh] w-full rounded-2xl bg-black shadow-2xl"
              />
            ) : visualizador.tipo === 'audio' ? (
              <div className="bg-white rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-3 text-gray-700">
                  <span className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Music className="w-6 h-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{visualizador.nome}</p>
                    <p className="text-[11px] text-gray-400 uppercase">Áudio</p>
                  </div>
                </div>
                <audio src={visualizador.url} controls autoPlay className="w-full" />
              </div>
            ) : visualizador.tipo === 'pdf' ? (
              <iframe
                src={visualizador.url}
                title={visualizador.nome}
                className="w-full h-[75vh] rounded-2xl bg-white shadow-2xl"
              />
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center space-y-3">
                <FileText className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-sm text-gray-600">Pré-visualização não disponível para este ficheiro.</p>
                <a
                  href={visualizador.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block px-4 py-2 rounded-xl bg-theme-primary text-white text-sm font-bold"
                >
                  Abrir ficheiro
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal criar ticket */}
      {modalTicket && clienteSel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Criar ticket desta conversa</h3>
              <button
                type="button"
                onClick={() => !modalTicket.aGuardar && setModalTicket(null)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={criarTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Cliente
                </label>
                <div className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 text-gray-700 font-medium">
                  {clienteSel.nome || 'Cliente'}
                  {clienteSel.telefone ? ` (${clienteSel.telefone})` : ''}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Título *
                </label>
                <input
                  value={modalTicket.titulo}
                  onChange={(e) => setModalTicket({ ...modalTicket, titulo: e.target.value })}
                  required
                  placeholder="Resumo do pedido"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Descrição *
                </label>
                <textarea
                  value={modalTicket.descricao}
                  onChange={(e) => setModalTicket({ ...modalTicket, descricao: e.target.value })}
                  rows={5}
                  required
                  placeholder="Detalhes do pedido"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Prioridade
                </label>
                <select
                  value={modalTicket.prioridade}
                  onChange={(e) => setModalTicket({ ...modalTicket, prioridade: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>

              {modalTicket.erro && (
                <p className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" /> {modalTicket.erro}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalTicket(null)}
                  disabled={modalTicket.aGuardar}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalTicket.aGuardar}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-theme-primary text-white text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-theme-primary-hover disabled:opacity-60"
                >
                  {modalTicket.aGuardar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Criar ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
