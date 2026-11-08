// Cliente WhatsApp via Suporte API (Django/DRF).
//  - Receber: Electrosoft -> POST /api/v1/webhook/whatsapp (Django) -> Conversa/Mensagem -> WS ws/whatsapp/ -> frontend
//  - Enviar:  frontend -> POST /api/v1/whatsapp/enviar | /enviar-media | /enviar-cloudinary (JWT)
//  - Ler:     GET /api/v1/whatsapp/conversas, /api/v1/whatsapp/mensagens

function normalizeDjangoBase(value: string) {
  const baseUrl = value.replace(/\/+$/, '');
  if (baseUrl.endsWith('/api/v1')) return baseUrl;
  if (baseUrl.endsWith('/api')) return `${baseUrl}/v1`;
  return `${baseUrl}/api/v1`;
}

const RAW_API_BASE_URL = import.meta.env?.VITE_API_URL || '/api';
const DJANGO_API_BASE_URL = normalizeDjangoBase(RAW_API_BASE_URL);

// VITE_WHATSAPP_API_URL (legado, FastAPI localhost) é ignorado: usa o Django.
export const WHATSAPP_API_URL = `${DJANGO_API_BASE_URL}/whatsapp`;

// Host do backend em produção (o proxy do Vercel não encaminha WebSocket).
const WS_HOST_PRODUCAO = 'suportapi-production-e15c.up.railway.app';

function resolverWsUrl(): string {
  const envUrl = import.meta.env?.VITE_WHATSAPP_WS_URL;
  if (envUrl) return envUrl;

  // API absoluta (ex.: VITE_API_URL=https://api...) -> deriva o ws do mesmo host
  if (/^https?:\/\//i.test(DJANGO_API_BASE_URL)) {
    return `${DJANGO_API_BASE_URL.replace(/^http/i, 'ws').replace(/\/api\/v1$/, '')}/ws/whatsapp/`;
  }

  // API relativa (proxy /api do Vercel): o WS tem de ir direto ao backend
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `wss://${WS_HOST_PRODUCAO}/ws/whatsapp/`;
  }

  const origem = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
  return `${origem.replace(/^http/i, 'ws')}/ws/whatsapp/`;
}

export const WHATSAPP_WS_URL = resolverWsUrl();

export class WhatsAppApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = 'WhatsAppApiError';
    this.status = status;
    this.data = data;
  }
}

// ---------- Tipos de pedido (components.schemas) ----------

export interface EnviarRequest {
  numero: string;
  texto: string;
}

export interface EnviarMediaRequest {
  numero: string;
  /** base64 do ficheiro (alternativa a `url`) */
  media?: string | null;
  url?: string | null;
  mediatype?: 'image' | 'video' | 'audio' | 'document' | string;
  mimetype?: string;
  fileName?: string;
  caption?: string | null;
}

export interface ContatoCreate {
  numero: string;
  nome?: string | null;
}

export interface ContatoUpdate {
  nome?: string | null;
}

// ---------- Tipos normalizados (as respostas não têm schema na doc) ----------

export interface Contato {
  numero: string;
  nome: string | null;
  ultimaMensagem?: string | null;
  ultimaData?: string | null;
  naoLidas?: number;
  raw: unknown;
}

export interface Mensagem {
  id: string;
  numero: string;
  texto: string;
  fromMe: boolean;
  data: string | null;
  tipo?: string | null;
  mediaUrl?: string | null;
  raw: unknown;
}

export interface EstadoApi {
  ok: boolean;
  ligadosWS?: number;
  raw: unknown;
}

export type EventoWS =
  | { event: 'messages.upsert'; contato: Contato | null; mensagem: Mensagem | null; raw: unknown }
  | { event: 'connection.update'; state: string | null; raw: unknown }
  | { event: string; raw: unknown };

// ---------- Normalização tolerante ----------

type Obj = Record<string, any>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

function str(...valores: unknown[]): string | null {
  for (const v of valores) {
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return null;
}

/** "244923000000@s.whatsapp.net" -> "244923000000" */
export function limparNumero(valor: unknown): string {
  const s = str(valor) ?? '';
  return s.split('@')[0].replace(/[^\d]/g, '') || s;
}

function dataIso(valor: unknown): string | null {
  if (valor == null || valor === '') return null;
  if (typeof valor === 'number' || /^\d+$/.test(String(valor))) {
    const n = Number(valor);
    // Evolution usa segundos; aceita também milissegundos
    const d = new Date(n < 1e12 ? n * 1000 : n);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(String(valor));
  return Number.isNaN(d.getTime()) ? String(valor) : d.toISOString();
}

/** Extrai uma lista de um payload que pode vir como array ou embrulhado. */
function lista(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (isObj(payload)) {
    for (const chave of ['dados', 'data', 'results', 'items', 'contatos', 'conversas', 'mensagens', 'messages', 'records']) {
      const v = payload[chave];
      if (Array.isArray(v)) return v;
      if (isObj(v)) {
        const interno = lista(v);
        if (interno.length) return interno;
      }
    }
  }
  return [];
}

function textoMensagem(m: Obj): string {
  const msg = isObj(m.message) ? m.message : {};
  return (
    str(
      m.texto,
      m.text,
      m.conteudo,
      m.body,
      typeof m.mensagem === 'string' ? m.mensagem : null,
      msg.conversation,
      msg.extendedTextMessage?.text,
      msg.imageMessage?.caption,
      msg.videoMessage?.caption,
      msg.documentMessage?.caption,
      msg.documentMessage?.fileName,
      m.caption,
    ) ?? ''
  );
}

function tipoMensagem(m: Obj): string | null {
  const explicito = str(m.tipo, m.type, m.messageType, m.mediatype);
  if (explicito) return explicito;
  const msg = isObj(m.message) ? m.message : null;
  if (!msg) return null;
  const chave = Object.keys(msg).find((k) => k.endsWith('Message'));
  return chave ? chave.replace(/Message$/, '') : null;
}

export function normalizarMensagem(v: unknown, numeroPadrao = ''): Mensagem {
  const m: Obj = isObj(v) ? v : { texto: String(v ?? '') };
  const key: Obj = isObj(m.key) ? m.key : {};
  const direcao = str(m.direcao, m.direction, m.origem)?.toLowerCase();
  const fromMe =
    typeof m.fromMe === 'boolean' ? m.fromMe :
    typeof m.from_me === 'boolean' ? m.from_me :
    typeof key.fromMe === 'boolean' ? key.fromMe :
    typeof m.enviada === 'boolean' ? m.enviada :
    direcao ? ['saida', 'saída', 'out', 'outgoing', 'enviada', 'sent'].includes(direcao) :
    false;

  const numero = limparNumero(str(m.numero, m.remoteJid, key.remoteJid, m.contato_numero, m.from, m.to, (m as Obj).conversa_numero) ?? numeroPadrao);
  const data = dataIso(m.data ?? m.data_hora ?? m.data_criacao ?? m.created_at ?? m.criado_em ?? m.timestamp ?? m.messageTimestamp ?? m.recebida_em);

  return {
    id: str(m.id, m.wa_id, key.id, m.message_id) ?? `${numero}-${data ?? ''}-${Math.random().toString(36).slice(2, 8)}`,
    numero,
    texto: textoMensagem(m),
    fromMe,
    data,
    tipo: tipoMensagem(m),
    mediaUrl: str(m.mediaUrl, m.media_url, m.url, m.message?.imageMessage?.url),
    raw: v,
  };
}

export function normalizarContato(v: unknown): Contato {
  const c: Obj = isObj(v) ? v : { numero: v };
  const ultima = isObj(c.ultima_mensagem) ? c.ultima_mensagem : isObj(c.lastMessage) ? c.lastMessage : isObj(c.ultimaMensagem) ? c.ultimaMensagem : null;
  // Django ConversaSerializer: numero, nome, ultima_mensagem (texto), ultima_mensagem_em, nao_lidas
  return {
    numero: limparNumero(str(c.numero, c.remoteJid, c.id, c.jid, c.telefone) ?? ''),
    nome: str(c.nome, c.pushName, c.name, c.push_name),
    ultimaMensagem: ultima ? textoMensagem(ultima) : str(c.ultima_mensagem, c.ultimaMensagem, c.ultimo_texto, c.texto),
    ultimaData: dataIso(
      ultima?.data ?? ultima?.timestamp ?? ultima?.messageTimestamp ??
      c.ultima_mensagem_em ?? c.ultima_data ?? c.ultimaData ?? c.atualizado_em ?? c.updated_at ?? c.data ?? c.data_actualizacao,
    ),
    naoLidas: Number(c.nao_lidas ?? c.naoLidas ?? c.unreadCount ?? 0) || 0,
    raw: v,
  };
}

export function normalizarEventoWS(payload: unknown): EventoWS {
  const d: Obj = isObj(payload) ? payload : {};
  const event = str(d.event, d.evento, d.type) ?? 'desconhecido';

  // Django Channels (apps/sistema): payload plano {conversa_id, numero, nome, texto, direcao, enviado_por, data_hora}
  if (!d.event && (d.numero || d.texto) && (d.direcao || d.conversa_id)) {
    const contato = normalizarContato({ numero: limparNumero(d.numero), nome: d.nome });
    const mensagem = normalizarMensagem({ ...d, numero: limparNumero(d.numero), data_hora: d.data_hora }, contato.numero);
    return { event: 'messages.upsert', contato, mensagem, raw: payload };
  }

  if (event === 'messages.upsert') {
    const contato = d.contato ? normalizarContato(d.contato) : null;
    const msgRaw = d.mensagem ?? d.message ?? d.data;
    const mensagem = msgRaw ? normalizarMensagem(msgRaw, contato?.numero) : null;
    if (contato && mensagem && !mensagem.numero) mensagem.numero = contato.numero;
    return { event, contato, mensagem, raw: payload };
  }

  if (event === 'connection.update') {
    const dados: Obj = isObj(d.data) ? d.data : d;
    return { event, state: str(dados.state, dados.estado, dados.status), raw: payload };
  }

  return { event, raw: payload };
}

// ---------- Pedidos HTTP ----------

async function lerResposta(resposta: Response) {
  const tipo = resposta.headers.get('content-type') || '';
  if (tipo.includes('application/json')) return resposta.json().catch(() => null);
  const texto = await resposta.text().catch(() => '');
  return texto || null;
}

function mensagemDeErro(data: unknown, status: number) {
  if (isObj(data)) {
    const detail = data.detail;
    // FastAPI HTTPValidationError: { detail: [{ loc, msg, type }] }
    if (Array.isArray(detail)) {
      return detail
        .map((e: Obj) => `${Array.isArray(e.loc) ? e.loc.filter((p: unknown) => p !== 'body').join('.') : ''}: ${e.msg}`.replace(/^: /, ''))
        .join('; ');
    }
    const msg = str(detail, data.erro, data.error, data.message, data.mensagem);
    if (msg) return msg;
  }
  if (typeof data === 'string' && data.trim()) return data.slice(0, 300);
  if (status === 0) return 'Não foi possível contactar a API WhatsApp.';
  return `Erro ${status} na API WhatsApp.`;
}

async function pedido<T = unknown>(caminho: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');
  const token = localStorage.getItem('auth_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Django router (DRF) exige "/" final; os path() /enviar* não levam.
  const ehPathRouter = caminho.startsWith("/conversas") || caminho.startsWith("/mensagens");
  let caminhoFinal = caminho;
  if (ehPathRouter) {
    const [p, q = ""] = caminho.split("?");
    if (!p.endsWith("/")) caminhoFinal = `${p}/${q ? `?${q}` : ""}`;
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${WHATSAPP_API_URL}${caminhoFinal}`, { ...init, headers });
  } catch (erro) {
    throw new WhatsAppApiError(0, mensagemDeErro(null, 0), erro);
  }

  const data = await lerResposta(resposta);
  if (!resposta.ok) throw new WhatsAppApiError(resposta.status, mensagemDeErro(data, resposta.status), data);

  // A API pode devolver 200 com { erro: ... } quando a Evolution falha
  if (isObj(data) && (data.ok === false || data.sucesso === false) && (data.erro || data.error)) {
    throw new WhatsAppApiError(resposta.status, mensagemDeErro(data, resposta.status), data);
  }
  return data as T;
}

const seg = (numero: string) => encodeURIComponent(limparNumero(numero));

async function conversaIdPorNumero(numero: string): Promise<string | null> {
  const n = limparNumero(numero);
  const sufixo = n.slice(-9);
  const cruzar = (arr: any[]) =>
    arr.find((x: any) => limparNumero(String((x as Obj).numero ?? '')) === n) ||
    arr.find((x: any) => limparNumero(String((x as Obj).numero ?? '')).slice(-9) === sufixo);

  // 1) filtro exacto no servidor
  const direto: any = cruzar(lista(await pedido(`/conversas?numero=${encodeURIComponent(n)}&limit=50`)));
  if (direto?.id) return String(direto.id);

  // 2) formatos diferentes (indicativo/9 dígitos): procura na lista completa
  const todas: any = cruzar(lista(await pedido('/conversas?limit=200')));
  return todas?.id ? String(todas.id) : null;
}

/** Converte um File para base64 puro (sem prefixo data:). */
export function ficheiroParaBase64(ficheiro: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).replace(/^data:[^,]*,/, ''));
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(ficheiro);
  });
}

export function mediatypeDe(mimetype: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
}

export const whatsappService = {
  /** ping via conversas (Django não tem GET /) */
  async estado(): Promise<EstadoApi> {
    try {
      await pedido('/conversas?limit=1');
      return { ok: true, raw: 'ok' };
    } catch (e) {
      throw e;
    }
  },

  /** POST /enviar */
  enviar(dados: EnviarRequest) {
    return pedido('/enviar', {
      method: 'POST',
      body: JSON.stringify({ numero: limparNumero(dados.numero), texto: dados.texto }),
    });
  },

  /** POST /enviar-media — media em base64 ou url pública */
  enviarMedia(dados: EnviarMediaRequest) {
    return pedido('/enviar-media', {
      method: 'POST',
      body: JSON.stringify({
        mediatype: 'document',
        mimetype: 'application/pdf',
        fileName: 'documento.pdf',
        ...dados,
        numero: limparNumero(dados.numero),
      }),
    });
  },

  /** POST /enviar-cloudinary - multipart: numero, ficheiro, caption? */
  enviarCloudinary(numero: string, ficheiro: File, caption?: string | null) {
    const form = new FormData();
    form.append('numero', limparNumero(numero));
    form.append('ficheiro', ficheiro, ficheiro.name);
    if (caption) form.append('caption', caption);
    return pedido('/enviar-cloudinary', { method: 'POST', body: form });
  },

  /** POST /enviar-audio - nota de voz gravada no browser (multipart) */
  enviarAudio(numero: string, ficheiro: File) {
    const form = new FormData();
    form.append('numero', limparNumero(numero));
    form.append('ficheiro', ficheiro, ficheiro.name);
    return pedido('/enviar-audio', { method: 'POST', body: form });
  },

  /** GET /conversas */
  async conversas(): Promise<Contato[]> {
    return lista(await pedido('/conversas?limit=200')).map(normalizarContato).filter((c) => c.numero);
  },

  /** GET /mensagens (guardadas no Django - todas) */
  async mensagensRecebidas(): Promise<Mensagem[]> {
    return lista(await pedido('/mensagens?limit=300')).map((m) => normalizarMensagem(m));
  },

  /** GET /mensagens?conversa={uuid} (por número) */
  async mensagensRecebidasPorNumero(numero: string): Promise<Mensagem[]> {
    const n = limparNumero(numero);
    const id = await conversaIdPorNumero(n);
    if (!id) return [];
    return lista(await pedido(`/mensagens?conversa=${encodeURIComponent(id)}&limit=300`)).map((m) => normalizarMensagem(m, n));
  },

  /** (compat FastAPI) — no Django lê do banco local */
  async mensagens(): Promise<Mensagem[]> {
    return this.mensagensRecebidas();
  },

  async mensagensPorNumero(numero: string): Promise<Mensagem[]> {
    return this.mensagensRecebidasPorNumero(numero);
  },

  /** GET /conversas (contatos = conversas no Django) */
  async listarContatos(): Promise<Contato[]> {
    return this.conversas();
  },

  /** GET /conversas?numero= */
  async selecionarContato(numero: string): Promise<Contato> {
    const n = limparNumero(numero);
    const raw: any = await pedido(`/conversas?numero=${encodeURIComponent(n)}`);
    const arr = lista(raw);
    const achado = arr.find((x: any) => limparNumero(String((x as Obj).numero ?? '')) === n);
    if (!achado) throw new WhatsAppApiError(404, 'Contato não encontrado.', raw);
    return normalizarContato(achado);
  },

  /** POST /conversas */
  criarContato(dados: ContatoCreate) {
    return pedido('/conversas', {
      method: 'POST',
      body: JSON.stringify({ numero: limparNumero(dados.numero), nome: dados.nome || null }),
    });
  },

  /** PUT /conversas/{uuid} (resolve o uuid pelo número) */
  async alterarContato(numero: string, dados: ContatoUpdate) {
    const id = await conversaIdPorNumero(numero);
    if (!id) throw new WhatsAppApiError(404, 'Contato não encontrado.', null);
    return pedido(`/conversas/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nome: dados.nome || null }),
    });
  },

  /** DELETE /conversas/{uuid} */
  async apagarContato(numero: string) {
    const id = await conversaIdPorNumero(numero);
    if (!id) throw new WhatsAppApiError(404, 'Contato não encontrado.', null);
    return pedido(`/conversas/${id}`, { method: 'DELETE' });
  },

  /** Histórico por número (via conversas → mensagens) */
  async mensagensDoContato(numero: string): Promise<Mensagem[]> {
    return this.mensagensRecebidasPorNumero(numero);
  },
};

// ---------- WebSocket (/ws) com reconexão ----------

export interface LigacaoWS {
  fechar: () => void;
}

export function ligarWhatsAppWS(handlers: {
  onEvento: (evento: EventoWS) => void;
  onEstado?: (ligado: boolean) => void;
}): LigacaoWS {
  let ws: WebSocket | null = null;
  let fechado = false;
  let tentativa = 0;
  let timer: number | undefined;

  const ligar = () => {
    if (fechado) return;
    try {
      ws = new WebSocket(WHATSAPP_WS_URL);
    } catch {
      agendar();
      return;
    }

    ws.onopen = () => {
      tentativa = 0;
      handlers.onEstado?.(true);
    };
    ws.onmessage = (e) => {
      try {
        handlers.onEvento(normalizarEventoWS(JSON.parse(e.data)));
      } catch {
        // mensagem não-JSON (ex.: ping) — ignorar
      }
    };
    ws.onclose = () => {
      handlers.onEstado?.(false);
      agendar();
    };
    ws.onerror = () => ws?.close();
  };

  const agendar = () => {
    if (fechado) return;
    const atraso = Math.min(30000, 1000 * 2 ** tentativa++);
    timer = window.setTimeout(ligar, atraso);
  };

  ligar();

  return {
    fechar: () => {
      fechado = true;
      window.clearTimeout(timer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    },
  };
}
