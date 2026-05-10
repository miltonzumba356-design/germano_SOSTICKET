import {
  Cliente,
  ClienteRequest,
  Contrato,
  CronometroState,
  HoraTrabalho,
  InicioSessao,
  Intervencao,
  RespostaPaginada,
  Tecnico,
  Usuario,
} from '../types/api';

const API_PREFIX = '/api/v1';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

function buildQuery(params?: QueryParams) {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  const text = query.toString();
  return text ? `?${text}` : '';
}

function getToken() {
  return localStorage.getItem('auth_token');
}

function persistAuthTokens(response: any) {
  const access = response?.access_token || response?.access || response?.token || response?.data?.access_token || response?.data?.access;
  const refresh = response?.refresh_token || response?.refresh || response?.data?.refresh_token || response?.data?.refresh;

  if (access) localStorage.setItem('auth_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
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

function unwrapResponse<T>(data: any): T {
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T;
  }

  return data as T;
}

function errorMessage(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.message) return data.message;
  if (data.error) return data.error;

  const firstFieldError = Object.values(data).flat().find(Boolean);
  return typeof firstFieldError === 'string' ? firstFieldError : fallback;
}

export async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(errorMessage(data, `Erro ${response.status} ao comunicar com a API.`));
  }

  return unwrapResponse<T>(data);
}

const list = <T>(path: string, params?: QueryParams) =>
  fetchAPI<RespostaPaginada<T>>(`${path}${buildQuery(params)}`);

const create = <T>(path: string, data: unknown) =>
  fetchAPI<T>(path, {
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

const update = <T>(path: string, data: unknown, method: 'PUT' | 'PATCH' = 'PUT') =>
  fetchAPI<T>(path, {
    method,
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export const authService = {
  async login(email: string, password: string): Promise<InicioSessao> {
    const response = await fetchAPI<InicioSessao>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    persistAuthTokens(response);
    return response;
  },

  async logout(): Promise<void> {
    try {
      await fetchAPI<void>('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  },

  async refresh(): Promise<InicioSessao> {
    const refresh = localStorage.getItem('refresh_token');
    const response = await fetchAPI<InicioSessao>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    });
    persistAuthTokens(response);
    return response;
  },

  async register(dados: Partial<Usuario> & { password?: string; empresa?: string }): Promise<Usuario> {
    return create<Usuario>('/auth/register', dados);
  },

  async recuperar(email: string): Promise<{ email: string }> {
    return create<{ email: string }>('/recuperar', { email });
  },

  async resetPassword(new_password: string): Promise<void> {
    return create<void>('/reset-password', { new_password });
  },

  async getProfile(): Promise<Usuario> {
    const response = await fetchAPI<RespostaPaginada<Usuario> | Usuario>('/perfil');
    if (Array.isArray((response as RespostaPaginada<Usuario>).results)) {
      return (response as RespostaPaginada<Usuario>).results![0];
    }
    return response as Usuario;
  },
};

export const clientesService = {
  listar: (params?: QueryParams) => list<Cliente>('/clientes', params),
  obterPorId: (id: string) => fetchAPI<Cliente>(`/clientes/${id}`),
  criar: (dados: ClienteRequest) => create<Cliente>('/clientes', dados),
  atualizar: (id: string, dados: Partial<ClienteRequest>) => update<Cliente>(`/clientes/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<ClienteRequest>) => update<Cliente>(`/clientes/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/clientes/${id}`, { method: 'DELETE' }),
};

export const contratosService = {
  listar: (params?: QueryParams) => list<Contrato>('/contratos', params),
  obterPorId: (id: string) => fetchAPI<Contrato>(`/contratos/${id}`),
  criar: (dados: Partial<Contrato> & { cliente_id: string }) => create<Contrato>('/contratos', dados),
  atualizar: (id: string, dados: Partial<Contrato>) => update<Contrato>(`/contratos/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<Contrato>) => update<Contrato>(`/contratos/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/contratos/${id}`, { method: 'DELETE' }),
};

export const tecnicosService = {
  listar: (params?: QueryParams) => list<Tecnico>('/tecnicos', params),
  obterPorId: (id: string) => fetchAPI<Tecnico>(`/tecnicos/${id}`),
  criar: (dados: Partial<Tecnico> & { password?: string }) => create<Tecnico>('/tecnicos', dados),
  atualizar: (id: string, dados: Partial<Tecnico>) => update<Tecnico>(`/tecnicos/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<Tecnico>) => update<Tecnico>(`/tecnicos/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/tecnicos/${id}`, { method: 'DELETE' }),
};

export const intervencoesService = {
  listar: (params?: QueryParams) => list<Intervencao>('/intervencoes', params),
  obterPorId: (id: string) => fetchAPI<Intervencao>(`/intervencoes/${id}`),
  criar: (dados: {
    titulo: string;
    descricao: string;
    cliente_id: string;
    contrato_id?: string;
    prioridade: string;
    anexos?: File[];
  }) => {
    const formData = new FormData();
    formData.append('titulo', dados.titulo);
    formData.append('descricao', dados.descricao);
    formData.append('cliente_id', dados.cliente_id);
    if (dados.contrato_id) formData.append('contrato_id', dados.contrato_id);
    formData.append('prioridade', dados.prioridade);
    dados.anexos?.forEach((file) => {
      formData.append('anexos', file);
    });
    return create<Intervencao>('/intervencoes', formData);
  },
  atualizar: (id: string, dados: Partial<Intervencao>) => update<Intervencao>(`/intervencoes/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<Intervencao>) => update<Intervencao>(`/intervencoes/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/intervencoes/${id}`, { method: 'DELETE' }),
  adicionarComentario: (id: string, dados: { texto: string; visivel_cliente?: boolean }) =>
    create(`/intervencoes/${id}/comentarios`, dados),
  carregarAnexo: (id: string, dados: { arquivo?: string; url?: string }) =>
    create(`/intervencoes/${id}/anexos`, dados),
  atribuirTecnico: (id: string, tecnico_id: string) =>
    create(`/intervencoes/${id}/atribuir`, { tecnico_id }),
};

export const horasService = {
  listar: (params?: QueryParams) => list<HoraTrabalho>('/horas', params),
  obterPorId: (id: string) => fetchAPI<HoraTrabalho>(`/horas/${id}`),
  criar: (dados: Partial<HoraTrabalho> & { intervencao_id: string }) => create<HoraTrabalho>('/horas', dados),
  atualizar: (id: string, dados: Partial<HoraTrabalho>) => update<HoraTrabalho>(`/horas/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<HoraTrabalho>) => update<HoraTrabalho>(`/horas/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/horas/${id}`, { method: 'DELETE' }),
};

export const configuracoesService = {
  listar: (params?: QueryParams) => list('/configuracoes', params),
  atualizar: (dados: unknown) => update('/configuracoes', dados),
};

export const cronometroService = {
  listar: () => fetchAPI<CronometroState[]>('/cronometros'),
  iniciar: (dados: { intervencao_id: string; tipo: 'presencial' | 'remoto' }) =>
    create<CronometroState>('/cronometros', dados),
  pausar: (id: string) => create<CronometroState>(`/cronometros/${id}/pausar`, {}),
  retomar: (id: string) => create<CronometroState>(`/cronometros/${id}/retomar`, {}),
  parar: (id: string, dados: { descricao: string; horas: number }) =>
    create<void>(`/cronometros/${id}/parar`, dados),
  sincronizar: (id: string, tempo_acumulado: number) =>
    update<CronometroState>(`/cronometros/${id}`, { tempo_acumulado }, 'PATCH'),
};

export const relatoriosService = {
  dashboardAdmin: () => fetchAPI<any>('/relatorios/dashboard-admin'),
  dashboardTecnico: () => fetchAPI<any>('/relatorios/dashboard-tecnico'),
  dashboardCliente: () => fetchAPI<any>('/relatorios/dashboard-cliente'),
  horas: () => fetchAPI<any>('/relatorios/horas'),
  intervencoes: () => fetchAPI<any>('/relatorios/intervencoes'),
  financeiro: () => fetchAPI<any>('/relatorios/financeiro'),
};
