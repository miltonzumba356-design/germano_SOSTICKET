const DEFAULT_CONCILIACAO_API_URL = 'https://api-conselho-production.up.railway.app';

const CONCILIACAO_API_URL = (
  import.meta.env?.VITE_CONCILIACAO_API_URL || DEFAULT_CONCILIACAO_API_URL
).replace(/\/+$/, '');

export class ConciliacaoApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = 'ConciliacaoApiError';
    this.status = status;
    this.data = data;
  }
}

export type StatusConciliacao = 'conciliado' | 'pendente' | 'divergencia';

export interface Lancamento {
  data: string;
  descricao: string;
  debito?: string;
  credito?: string;
  documento?: string | null;
  referencia?: string | null;
  origem?: string;
}

export interface MatchResult {
  erp?: Lancamento | null;
  banco?: Lancamento | null;
  score_data: number;
  score_valor: number;
  score_descricao: number;
  score_documento: number;
  score_total: number;
  status: StatusConciliacao;
  sugestao?: string | null;
}

export interface ItemAjusteReconciliacao {
  data: string;
  descricao: string;
  valor: string;
}

export interface SeccaoReconciliacao {
  numero: number;
  label: string;
  sinal: string;
  itens: ItemAjusteReconciliacao[];
  total: string;
}

export interface ReconciliacaoBancaria {
  saldo_banco: string;
  debitado_banco_nao_creditado_livros: SeccaoReconciliacao;
  creditado_banco_nao_debitado_livros: SeccaoReconciliacao;
  debitado_livros_nao_creditado_banco: SeccaoReconciliacao;
  creditado_livros_nao_debitado_banco: SeccaoReconciliacao;
  saldo_financeiro: string;
  saldo_contabilistico: string;
  diferenca: string;
}

export interface RelatorioConciliacao {
  id?: number | null;
  saldo_banco: string;
  saldo_erp: string;
  conciliados: number;
  pendentes: number;
  divergencias: number;
  total_lancamentos: number;
  diferenca: string;
  percentual_conciliacao: number;
  detalhes: MatchResult[];
  analise_deepseek?: string | null;
  sugestoes: string[];
  reconciliacao_bancaria?: ReconciliacaoBancaria | null;
}

export interface ConciliacaoResumo {
  id: number;
  data: string;
  erp: string | null;
  extrato: string | null;
  total: number;
  conciliados: number;
  pendentes: number;
  divergencias: number;
  percentual: number;
  saldo_erp: string;
  saldo_banco: string;
  diferenca: string;
}

export interface ListaConciliacoes {
  total: number;
  conciliacoes: ConciliacaoResumo[];
}

export interface ConciliacaoDetalhe {
  id: number;
  data: string;
  erp: string | null;
  extrato: string | null;
  total_lancamentos: number;
  conciliados: number;
  pendentes: number;
  divergencias: number;
  percentual: number;
  saldo_erp: string;
  saldo_banco: string;
  diferenca: string;
  sugestoes: string[];
  analise_deepseek?: string | null;
  detalhes?: string | null;
}

export interface OcrResponse {
  motor: string;
  texto_extraido: string;
  registos: Record<string, unknown>[];
}

export interface AnaliseTextoResponse {
  registos: Record<string, unknown>[];
}

export interface HealthResponse {
  status: string;
  versao: string;
  deepseek_configurado: boolean;
  modelo: string;
  banco: string;
  ocr_disponivel: Record<string, unknown>;
}

async function parseResponse(response: Response) {
  if (response.status === 204) return undefined;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text || undefined;
}

function errorMessage(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;

  if (Array.isArray(data.detail)) {
    const messages = data.detail.map((item: any) => item?.msg).filter(Boolean);
    if (messages.length) return messages.join(' ');
  }
  if (typeof data.detail === 'string') return data.detail;

  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${CONCILIACAO_API_URL}${path}`, options);
  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ConciliacaoApiError(
      response.status,
      errorMessage(data, `Erro ${response.status} ao comunicar com a API de conciliação.`),
      data
    );
  }

  return data as T;
}

export const conciliacaoService = {
  health: () => request<HealthResponse>('/api/v1/health'),

  conciliar: (erp: File, extrato: File, usarDeepseek = true) => {
    const formData = new FormData();
    formData.append('erp', erp);
    formData.append('extrato', extrato);
    formData.append('usar_deepseek', String(usarDeepseek));

    return request<RelatorioConciliacao>('/api/v1/conciliar', {
      method: 'POST',
      body: formData,
    });
  },

  listar: (limite = 20) =>
    request<ListaConciliacoes>(`/api/v1/conciliacoes?limite=${encodeURIComponent(limite)}`),

  obterPorId: (id: number) => request<ConciliacaoDetalhe>(`/api/v1/conciliacoes/${id}`),

  ocrImagem: (imagem: File, usarDeepseek = true) => {
    const formData = new FormData();
    formData.append('imagem', imagem);
    formData.append('usar_deepseek', String(usarDeepseek));

    return request<OcrResponse>('/api/v1/ocr', {
      method: 'POST',
      body: formData,
    });
  },

  analisarTexto: (texto: string) => {
    const body = new URLSearchParams();
    body.append('texto', texto);

    return request<AnaliseTextoResponse>('/api/v1/analisar-texto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  },
};
