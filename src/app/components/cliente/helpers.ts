import type { Empresa, Intervencao } from '../../types/api';

export const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  aberto: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Aberto' },
  em_andamento: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Em Atendimento' },
  resolvido: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Resolvido' },
  fechado: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400', label: 'Fechado' },
  concluido: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Concluído' },
};

export const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  baixa: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Baixa' },
  media: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Média' },
  alta: { bg: 'bg-orange-50', text: 'text-orange-600', label: 'Alta' },
  urgente: { bg: 'bg-red-50', text: 'text-red-600', label: 'Urgente' },
};

export function statusStyle(status?: string) {
  return STATUS_STYLES[status || 'aberto'] || STATUS_STYLES.aberto;
}

export function priorityStyle(prioridade?: string) {
  return PRIORITY_STYLES[prioridade || 'media'] || PRIORITY_STYLES.media;
}

export function iniciais(nome?: string) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-fuchsia-500',
];

export function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function formatarHoraCurta(data?: string | null) {
  if (!data) return '';
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return '';
  const agora = new Date();
  const msDia = 24 * 60 * 60 * 1000;
  const diffDias = Math.floor(
    (new Date(agora.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / msDia
  );

  if (diffDias === 0) return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  if (diffDias === 1) return 'Ontem';
  if (diffDias < 7) return d.toLocaleDateString('pt-PT', { weekday: 'short' });
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export interface UltimaMensagem {
  texto: string;
  autor?: string;
  data?: string;
  deCliente: boolean;
}

export function ultimaMensagem(intervencao: Intervencao, nomeUsuario?: string): UltimaMensagem {
  const comentarios = intervencao.comentarios || intervencao.comentario || [];
  if (comentarios.length > 0) {
    const ultimo = comentarios[comentarios.length - 1];
    return {
      texto: ultimo.texto || '',
      autor: ultimo.usuario_nome,
      data: ultimo.data_criacao,
      deCliente: ultimo.usuario_nome === nomeUsuario,
    };
  }
  return {
    texto: intervencao.descricao || '',
    autor: intervencao.cliente_nome,
    data: intervencao.data_abertura,
    deCliente: true,
  };
}

export function totalComentarios(intervencao: Intervencao) {
  return Number(intervencao.total_comentarios ?? intervencao.comentarios?.length ?? intervencao.comentario?.length ?? 0);
}

export function totalAnexos(intervencao: Intervencao) {
  return Number(intervencao.total_anexos ?? intervencao.anexos?.length ?? 0);
}

// Rótulo de "Categoria" do atendimento, a partir do tipo de contrato/intervenção já existente (sem novo campo).
export function categoriaLabel(tipo?: string) {
  if (!tipo) return 'Geral';
  return tipo
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

export function nomeEmpresa(empresa?: string | Empresa | null) {
  if (!empresa) return '';
  if (typeof empresa === 'string') return empresa;
  return String(empresa.nome || empresa.Email_empresa || 'Empresa');
}

// "Última atualização" derivada localmente (não existe campo dedicado no backend):
// o mais recente entre último comentário, última mudança de estado e datas de execução/abertura.
export function ultimaAtualizacao(intervencao: Intervencao): string | undefined {
  const comentarios = intervencao.comentarios || intervencao.comentario || [];
  const historico = intervencao.historico_status || [];
  const candidatos = [
    comentarios.length ? comentarios[comentarios.length - 1]?.data_criacao : undefined,
    historico.length ? historico[historico.length - 1]?.data_criacao : undefined,
    intervencao.data_conclusao,
    intervencao.data_fim_intervencao,
    intervencao.data_abertura,
  ];

  const datas = candidatos
    .filter(Boolean)
    .map((data) => new Date(data as string).getTime())
    .filter((tempo) => !Number.isNaN(tempo));

  if (!datas.length) return undefined;
  return new Date(Math.max(...datas)).toISOString();
}

export function detectarTipoAnexo(url: string): 'imagem' | 'pdf' | 'video' | 'outro' {
  const semQuery = (url || '').split('?')[0].split('#')[0].toLowerCase();
  const ext = semQuery.split('.').pop() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext)) return 'imagem';
  if (ext === 'pdf') return 'pdf';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (semQuery.includes('/image/')) return 'imagem';
  if (semQuery.includes('/video/')) return 'video';
  if (semQuery.includes('.pdf')) return 'pdf';
  return 'outro';
}

// Indicador de "não lida" é puramente local (não há rastreamento de leitura no backend):
// guarda em localStorage quantos comentários já foram vistos por intervenção.
const CHAVE_VISTOS = 'sosticket_cliente_conversas_vistas';

function lerVistos(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CHAVE_VISTOS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isNaoLida(intervencao: Intervencao): boolean {
  const vistos = lerVistos();
  const visto = vistos[intervencao.id] ?? 0;
  return totalComentarios(intervencao) > visto;
}

export function marcarComoVista(intervencao: Intervencao) {
  try {
    const vistos = lerVistos();
    vistos[intervencao.id] = totalComentarios(intervencao);
    localStorage.setItem(CHAVE_VISTOS, JSON.stringify(vistos));
  } catch {
    // localStorage indisponível — indicador de não lida é só cosmético, seguro ignorar
  }
}

// Handoff simples entre o Dashboard e a tela de Intervenções para abrir uma conversa específica.
const CHAVE_SELECAO = 'sosticket_cliente_intervencao_selecionada';

export function definirIntervencaoSelecionada(id: string) {
  try { localStorage.setItem(CHAVE_SELECAO, id); } catch { /* ignore */ }
}

export function consumirIntervencaoSelecionada(): string | null {
  try {
    const id = localStorage.getItem(CHAVE_SELECAO);
    if (id) localStorage.removeItem(CHAVE_SELECAO);
    return id;
  } catch {
    return null;
  }
}

export const EMOJIS_RAPIDOS = [
  '😀', '😂', '🙂', '😉', '😍', '🤔', '😅', '😢',
  '👍', '👎', '🙏', '👏', '💪', '🔥', '✅', '❌',
  '⚠️', '📎', '📄', '📷', '⏰', '💬', '🎉', '❤️',
];
