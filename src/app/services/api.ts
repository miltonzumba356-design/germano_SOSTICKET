import {
  Cliente,
  ClienteRequest,
  Contrato,
  CronometroState,
  Empresa,
  HoraTrabalho,
  InicioSessao,
  Intervencao,
  Notificacao,
  RespostaPaginada,
  Tecnico,
  Usuario,
} from '../types/api';

const DEFAULT_API_BASE_URL = '/api';
const rawApiBaseUrl = import.meta.env?.VITE_API_URL || DEFAULT_API_BASE_URL;

function normalizeApiBaseUrl(value: string) {
  const baseUrl = value.replace(/\/+$/, '');

  if (baseUrl.endsWith('/api/v1')) return baseUrl;
  if (baseUrl.endsWith('/api')) return `${baseUrl}/v1`;

  return `${baseUrl}/api/v1`;
}

const API_BASE_URL = normalizeApiBaseUrl(rawApiBaseUrl);

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

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

function normalizePath(path: string) {
  const [pathname, query = ''] = path.split('?');
  const cleanPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;

  return query ? `${cleanPathname}?${query}` : cleanPathname;
}

function getToken() {
  return localStorage.getItem('auth_token');
}

function decodeJwtPayload(token?: string | null) {
  if (!token) return undefined;

  try {
    const payload = token.split('.')[1];
    if (!payload) return undefined;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    return JSON.parse(decoded);
  } catch {
    return undefined;
  }
}

function usuarioFromToken(token?: string | null): Partial<Usuario> | undefined {
  const payload = decodeJwtPayload(token);
  if (!payload) return undefined;

  const email = payload.email || payload.user_email || payload.username;
  const perfil = payload.perfil || payload.role || payload.tipo || payload.user_type;

  if (!email && !perfil) return undefined;

  return {
    id: payload.user_id || payload.id || payload.sub || email || 'token-user',
    nome: payload.nome || payload.name || payload.first_name || email || 'Utilizador',
    email,
    perfil,
  };
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
  if (typeof firstFieldError === 'string') return firstFieldError;

  try {
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
}

function shouldKeepPathWithoutTrailingSlash(pathname: string) {
  return ['/perfil', '/perfil/password', '/configuracoes'].includes(pathname);
}

function withBackendTrailingSlash(path: string) {
  const normalized = normalizePath(path);
  const [pathname, query = ''] = normalized.split('?');

  if (pathname.endsWith('/') || shouldKeepPathWithoutTrailingSlash(pathname)) {
    return normalized;
  }

  return `${pathname}/${query ? `?${query}` : ''}`;
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

  const normalizedPath = withBackendTrailingSlash(path);
  const url = `${API_BASE_URL}${normalizedPath}`;
  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 404 && !normalizedPath.split('?')[0].endsWith('/')) {
    const [pathname, query = ''] = normalizedPath.split('?');
    response = await fetch(`${API_BASE_URL}${pathname}/${query ? `?${query}` : ''}`, {
      ...options,
      headers,
    });
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(data, `Erro ${response.status} ao comunicar com a API.`), data);
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

  async alterarSenha(password_atual: string, password_nova: string): Promise<void> {
    return create<void>('/auth/reset-password', { password_atual, password_nova });
  },

  async getProfile(preferredEmail?: string): Promise<Usuario> {
    let response: RespostaPaginada<Usuario> | Usuario;
    const tokenUser = usuarioFromToken(getToken());
    const email = preferredEmail || tokenUser?.email || localStorage.getItem('auth_user_email') || undefined;

    try {
      response = await fetchAPI<RespostaPaginada<Usuario> | Usuario>('/perfil');
    } catch (error: any) {
      if (error?.status !== 404) throw error;
      response = await fetchAPI<RespostaPaginada<Usuario> | Usuario>('/auth/register');
    }

    if (Array.isArray((response as RespostaPaginada<Usuario>).results)) {
      const results = (response as RespostaPaginada<Usuario>).results || [];
      const matchedByEmail = email ? results.find((user) => user.email?.toLowerCase() === email.toLowerCase()) : undefined;
      const matchedByTokenId = tokenUser?.id ? results.find((user) => user.id === tokenUser.id) : undefined;
      const matchedByRole = tokenUser?.perfil ? results.find((user) => user.perfil === tokenUser.perfil) : undefined;
      const selected = matchedByEmail || matchedByTokenId || matchedByRole || results[0] || tokenUser;

      if (!selected) throw new Error('Perfil do utilizador não encontrado.');
      return selected as Usuario;
    }
    return { ...tokenUser, ...(response as Usuario) } as Usuario;
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

export const perfilService = {
  listar: (params?: QueryParams) => list<Usuario>('/perfil', params),
  atualizar: (dados: Partial<Usuario>) => update<Usuario>('/perfil', dados),
  alterarSenha: (dados: { password_atual: string; password_nova: string }) =>
    update<void>('/perfil/password', dados),
};

export const contratosService = {
  listar: (params?: QueryParams) => list<Contrato>('/contratos', params),
  obterPorId: (id: string) => fetchAPI<Contrato>(`/contratos/${id}`),
  criar: (dados: Partial<Contrato> & { cliente_id: string }) =>
    create<Contrato>('/contratos', {
      ...dados,
      tipo_de_pagamento: dados.tipo_de_pagamento || dados.tipo,
      tipo_contrato: dados.tipo_contrato || 'suporte',
    }),
  atualizar: (id: string, dados: Partial<Contrato>) => update<Contrato>(`/contratos/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<Contrato>) => update<Contrato>(`/contratos/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/contratos/${id}`, { method: 'DELETE' }),
};

export const empresasService = {
  listar: (params?: QueryParams) => list<Empresa>('/empresas', params),
  obterPorId: (id: string) => fetchAPI<Empresa>(`/empresas/${id}`),
  criar: (dados: Partial<Empresa>) => create<Empresa>('/empresas', dados),
  atualizar: (id: string, dados: Partial<Empresa>) => update<Empresa>(`/empresas/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<Empresa>) => update<Empresa>(`/empresas/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/empresas/${id}`, { method: 'DELETE' }),
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
    tipo_pagamento?: string;
    tipo_intervencao?: string;
    actuacao_tipo?: string;
    anexos?: File[];
  }) => {
    const formData = new FormData();
    formData.append('titulo', dados.titulo);
    formData.append('descricao', dados.descricao);
    formData.append('cliente_id', dados.cliente_id);
    if (dados.contrato_id) formData.append('contrato_id', dados.contrato_id);
    formData.append('prioridade', dados.prioridade);
    formData.append('tipo_pagamento', dados.tipo_pagamento || 'horas');
    formData.append('tipo_intervencao', dados.tipo_intervencao || 'suporte');
    if (dados.actuacao_tipo) formData.append('actuacao_tipo', dados.actuacao_tipo);
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
  carregarAnexo: (id: string, dados: File | { ficheiro?: File; arquivo?: File; descricao?: string }) => {
    const formData = new FormData();
    const ficheiro = dados instanceof File ? dados : dados.ficheiro || dados.arquivo;

    if (ficheiro) formData.append('ficheiro', ficheiro);
    if (!(dados instanceof File) && dados.descricao) formData.append('descricao', dados.descricao);

    return create(`/intervencoes/${id}/anexos`, formData);
  },
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

export const notificacoesService = {
  listar: (params?: QueryParams) => list<Notificacao>('/notificacoes', params),
  obterPorId: (id: string) => fetchAPI<Notificacao>(`/notificacoes/${id}`),
  async marcarLida(id: string) {
    const notificacao = await fetchAPI<Notificacao>(`/notificacoes/${id}`);
    return update<Notificacao>(`/notificacoes/${id}/lida`, { ...notificacao, lida: true }, 'PUT');
  },
  marcarTodasLidas: () =>
    update<Notificacao>('/notificacoes/marcar-todas-lidas', {
      tipo: 'sistema',
      titulo: 'Marcar notificações como lidas',
      mensagem: 'Marcar todas as notificações como lidas',
      lida: true,
    }, 'PUT'),
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
