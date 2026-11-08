// Cliente da "API WhatsApp - Simples" (FastAPI + Evolution API / Electrosoft).
// Especificação: doc_apiWhat.txt (OpenAPI 3.1).
//
//  - Receber: Electrosoft -> POST /webhook -> SQLite -> WS /ws -> frontend
//  - Enviar:  frontend -> POST /api/enviar | /api/enviar-media | /api/enviar-cloudinary
//  - Ler:     GET /api/contatos, /api/conversas, /api/mensagens/...

const DEFAULT_WHATSAPP_API_URL = 'http://localhost:8000';

export const WHATSAPP_API_URL = (
  import.meta.env?.VITE_WHATSAPP_API_URL || DEFAULT_WHATSAPP_API_URL
).replace(/\/+$/, '');

export const WHATSAPP_WS_URL = (
  import.meta.env?.VITE_WHATSAPP_WS_URL || `${WHATSAPP_API_URL.replace(/^http/i, 'ws')}/ws`
);

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

  const numero = limparNumero(str(m.numero, m.remoteJid, key.remoteJid, m.contato_numero, m.from, m.to) ?? numeroPadrao);
  const data = dataIso(m.data ?? m.data_hora ?? m.created_at ?? m.criado_em ?? m.timestamp ?? m.messageTimestamp ?? m.recebida_em);

  return {
    id: str(m.id, key.id, m.message_id) ?? `${numero}-${data ?? ''}-${Math.random().toString(36).slice(2, 8)}`,
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
  const ultima = isObj(c.ultima_mensagem) ? c.ultima_mensagem : isObj(c.lastMessage) ? c.lastMessage : null;
  return {
    numero: limparNumero(str(c.numero, c.remoteJid, c.id, c.jid, c.telefone) ?? ''),
    nome: str(c.nome, c.pushName, c.name, c.push_name),
    ultimaMensagem: ultima ? textoMensagem(ultima) : str(c.ultima_mensagem, c.ultimaMensagem, c.ultimo_texto, c.texto),
    ultimaData: dataIso(
      ultima?.data ?? ultima?.timestamp ?? ultima?.messageTimestamp ??
      c.ultima_data ?? c.ultimaData ?? c.atualizado_em ?? c.updated_at ?? c.data,
    ),
    naoLidas: Number(c.nao_lidas ?? c.naoLidas ?? c.unreadCount ?? 0) || 0,
    raw: v,
  };
}

export function normalizarEventoWS(payload: unknown): EventoWS {
  const d: Obj = isObj(payload) ? payload : {};
  const event = str(d.event, d.evento, d.type) ?? 'desconhecido';

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

  let resposta: Response;
  try {
    resposta = await fetch(`${WHATSAPP_API_URL}${caminho}`, { ...init, headers });
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
  /** GET / — estado + ligadosWS */
  async estado(): Promise<EstadoApi> {
    const raw = await pedido<Obj>('/');
    const ligados = Number(raw?.ligadosWS ?? raw?.ligados_ws);
    return { ok: true, ligadosWS: Number.isFinite(ligados) ? ligados : undefined, raw };
  },

  /** POST /api/enviar */
  enviar(dados: EnviarRequest) {
    return pedido('/api/enviar', {
      method: 'POST',
      body: JSON.stringify({ numero: limparNumero(dados.numero), texto: dados.texto }),
    });
  },

  /** POST /api/enviar-media — media em base64 ou url pública */
  enviarMedia(dados: EnviarMediaRequest) {
    return pedido('/api/enviar-media', {
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

  /** POST /api/enviar-cloudinary — multipart: numero, ficheiro, caption? */
  enviarCloudinary(numero: string, ficheiro: File, caption?: string | null) {
    const form = new FormData();
    form.append('numero', limparNumero(numero));
    form.append('ficheiro', ficheiro, ficheiro.name);
    if (caption) form.append('caption', caption);
    return pedido('/api/enviar-cloudinary', { method: 'POST', body: form });
  },

  /** GET /api/conversas */
  async conversas(): Promise<Contato[]> {
    return lista(await pedido('/api/conversas')).map(normalizarContato).filter((c) => c.numero);
  },

  /** GET /api/mensagens/recebidas */
  async mensagensRecebidas(): Promise<Mensagem[]> {
    return lista(await pedido('/api/mensagens/recebidas')).map((m) => normalizarMensagem(m));
  },

  /** GET /api/mensagens/recebidas/{numero} */
  async mensagensRecebidasPorNumero(numero: string): Promise<Mensagem[]> {
    return lista(await pedido(`/api/mensagens/recebidas/${seg(numero)}`)).map((m) => normalizarMensagem(m, limparNumero(numero)));
  },

  /** GET /api/mensagens — directamente da Evolution */
  async mensagens(): Promise<Mensagem[]> {
    return lista(await pedido('/api/mensagens')).map((m) => normalizarMensagem(m));
  },

  /** GET /api/mensagens/{numero} — directamente da Evolution */
  async mensagensPorNumero(numero: string): Promise<Mensagem[]> {
    return lista(await pedido(`/api/mensagens/${seg(numero)}`)).map((m) => normalizarMensagem(m, limparNumero(numero)));
  },

  /** GET /api/contatos */
  async listarContatos(): Promise<Contato[]> {
    return lista(await pedido('/api/contatos')).map(normalizarContato).filter((c) => c.numero);
  },

  /** GET /api/contatos/{numero} */
  async selecionarContato(numero: string): Promise<Contato> {
    const raw = await pedido(`/api/contatos/${seg(numero)}`);
    return normalizarContato(isObj(raw) && isObj(raw.contato) ? raw.contato : raw);
  },

  /** POST /api/contatos */
  criarContato(dados: ContatoCreate) {
    return pedido('/api/contatos', {
      method: 'POST',
      body: JSON.stringify({ numero: limparNumero(dados.numero), nome: dados.nome || null }),
    });
  },

  /** PUT /api/contatos/{numero} */
  alterarContato(numero: string, dados: ContatoUpdate) {
    return pedido(`/api/contatos/${seg(numero)}`, {
      method: 'PUT',
      body: JSON.stringify({ nome: dados.nome || null }),
    });
  },

  /** DELETE /api/contatos/{numero} */
  apagarContato(numero: string) {
    return pedido(`/api/contatos/${seg(numero)}`, { method: 'DELETE' });
  },

  /** GET /api/contatos/{numero}/mensagens — histórico guardado no SQLite */
  async mensagensDoContato(numero: string): Promise<Mensagem[]> {
    return lista(await pedido(`/api/contatos/${seg(numero)}/mensagens`)).map((m) => normalizarMensagem(m, limparNumero(numero)));
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
