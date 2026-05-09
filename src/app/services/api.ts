import {
  Cliente,
  Tecnico,
  Contrato,
  Intervencao,
  Notificacao,
  RespostaPaginada
} from '../types/api';

// Usa o proxy local no desenvolvimento para evitar erros de CORS (Failed to fetch)
export const API_BASE_URL = import.meta.env.DEV 
  ? '/api/v1' 
  : 'https://suport-api.onrender.com/api/v1';

// Classe para gerenciar erros da API
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Função auxiliar para fazer requisições à API
export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Adiciona token de autenticação se existir e for válido
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'Erro na requisição';

    try {
      // Ler o corpo da resposta como texto primeiro para evitar o erro "body stream already read"
      const textData = await response.text();
      try {
        // Tentar interpretar o texto como JSON
        const errorData = JSON.parse(textData);
        let extractedError = errorData.message || errorData.detail || errorData.error || errorData;
        
        if (typeof extractedError === 'object') {
          // Se a API retornar um objeto com os erros detalhados por campo, convertemos para string
          errorMessage = JSON.stringify(extractedError);
        } else {
          errorMessage = extractedError;
        }
      } catch {
        // Se não for JSON válido (ex: página HTML de Erro 500), usar o texto bruto
        errorMessage = textData || errorMessage;
      }
    } catch {
      // Falha extrema na leitura do corpo
    }

    throw new ApiError(response.status, String(errorMessage));
  }

  // Se a resposta for 204 No Content, retorna null
  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json();

  // Se a resposta vem no formato { success: true, data: {...} }
  // extrai apenas o campo data
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T;
  }

  return data;
}

// Função auxiliar para extrair dados de resposta com estrutura { success, data }
function extractData<T>(response: any): T {
  if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
    return response.data;
  }
  return response;
}

// Serviço de Autenticação
export const authService = {
  // Login - POST /api/v1/auth/login
  async login(email: string, password: string): Promise<{ access_token: string; refresh_token: string; usuario: any }> {
    console.log('Enviando requisição de login para:', API_BASE_URL + '/auth/login');
    // fetchAPI já extrai o campo 'data' automaticamente se a resposta tiver { success, data }
    const response = await fetchAPI<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    console.log('Resposta bruta do login:', response);

    // Garante que pegamos os dados mesmo se estiverem aninhados em .data
    const authData = response.data || response;
    const access_token = authData.access_token || authData.access;
    const refresh_token = authData.refresh_token || authData.refresh;

    if (!access_token) {
      console.error('Falha ao extrair token da resposta:', response);
      throw new Error('Formato de resposta inválido da API. Token não encontrado.');
    }

    // Salva tokens no localStorage
    localStorage.setItem('auth_token', access_token);
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token);
    }

    return authData;
  },

  // Logout - POST /api/v1/auth/logout
  async logout(): Promise<void> {
    try {
      await fetchAPI('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  },

  // Refresh token - POST /api/v1/auth/refresh
  async refreshToken(): Promise<{ access_token: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await fetchAPI<{
      success: boolean;
      data: { access_token: string }
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    });

    // A resposta pode vir dentro de data
    const access_token = response.data?.access_token || (response as any).access_token;

    if (access_token) {
      localStorage.setItem('auth_token', access_token);
    }

    return { access_token };
  },

  // Cadastro - POST /api/v1/auth/register
  async register(dados: any): Promise<any> {
    return await fetchAPI<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  // Obter perfil do usuário autenticado - GET /api/v1/perfil
  async getProfile(): Promise<any> {
    const response = await fetchAPI<any>('/perfil');

    // A resposta pode vir em diferentes formatos
    // Formato 1: { success: true, data: {...} }
    if (response.success && response.data) {
      return response.data;
    }

    // Formato 2: Lista paginada { results: [...] }
    if (response.results && Array.isArray(response.results)) {
      return response.results[0] || null;
    }

    // Formato 3: Objeto direto
    return response;
  },
};

// Serviço de Clientes
export const clientesService = {
  // Listar clientes - GET /api/v1/clientes
  async listar(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'activo' | 'inactivo';
  }): Promise<RespostaPaginada<Cliente>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return fetchAPI<RespostaPaginada<Cliente>>(`/clientes${query ? `?${query}` : ''}`);
  },

  // Obter cliente por ID - GET /api/v1/clientes/{id}
  async obterPorId(id: string): Promise<Cliente> {
    return fetchAPI<Cliente>(`/clientes/${id}`);
  },

  // Criar cliente - POST /api/v1/clientes
  async criar(dados: {
    nome: string;
    email: string;
    telefone?: string;
    empresa?: string;
    nif?: string;
    endereco?: string;
    password?: string;
    status?: 'activo' | 'inactivo';
  }): Promise<Cliente> {
    return fetchAPI<Cliente>('/clientes', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  // Atualizar cliente - PUT /api/v1/clientes/{id}
  async atualizar(id: string, dados: Partial<Cliente>): Promise<Cliente> {
    return fetchAPI<Cliente>(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  },

  // Deletar cliente - DELETE /api/v1/clientes/{id}
  async deletar(id: string): Promise<void> {
    return fetchAPI<void>(`/clientes/${id}`, { method: 'DELETE' });
  },
};

// Serviço de Técnicos
export const tecnicosService = {
  // Listar técnicos - GET /api/v1/tecnicos
  async listar(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<RespostaPaginada<Tecnico>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return fetchAPI<RespostaPaginada<Tecnico>>(`/tecnicos${query ? `?${query}` : ''}`);
  },

  // Obter técnico por ID - GET /api/v1/tecnicos/{id}
  async obterPorId(id: string): Promise<Tecnico> {
    return fetchAPI<Tecnico>(`/tecnicos/${id}`);
  },

  // Criar técnico - POST /api/v1/tecnicos
  async criar(dados: {
    nome: string;
    email: string;
    telefone?: string;
    password?: string;
    especialidades?: any;
    data_contratacao?: string;
    status?: 'activo' | 'inactivo';
  }): Promise<Tecnico> {
    return fetchAPI<Tecnico>('/tecnicos', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  // Atualizar técnico - PUT /api/v1/tecnicos/{id}
  async atualizar(id: string, dados: Partial<Tecnico>): Promise<Tecnico> {
    return fetchAPI<Tecnico>(`/tecnicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  },

  // Deletar técnico - DELETE /api/v1/tecnicos/{id}
  async deletar(id: string): Promise<void> {
    return fetchAPI<void>(`/tecnicos/${id}`, { method: 'DELETE' });
  },
};

// Serviço de Contratos
export const contratosService = {
  // Listar contratos - GET /api/v1/contratos
  async listar(params?: {
    page?: number;
    limit?: number;
    search?: string;
    cliente?: string;
    status?: 'activo' | 'expirado' | 'cancelado';
    tipo?: 'horas' | 'mensal' | 'anual';
  }): Promise<RespostaPaginada<Contrato>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.cliente) queryParams.append('cliente', params.cliente);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.tipo) queryParams.append('tipo', params.tipo);

    const query = queryParams.toString();
    return fetchAPI<RespostaPaginada<Contrato>>(`/contratos${query ? `?${query}` : ''}`);
  },

  // Obter contrato por ID - GET /api/v1/contratos/{id}
  async obterPorId(id: string): Promise<Contrato> {
    return fetchAPI<Contrato>(`/contratos/${id}`);
  },

  // Criar contrato - POST /api/v1/contratos
  async criar(dados: {
    cliente_id: string;
    tipo_contrato: string;
    tipo_de_pagamento: string;
    horas_contratadas: string | number;
    horas_utilizadas?: string | number;
    valor_total: string | number;
    data_inicio: string;
    data_fim: string;
    status: 'activo' | 'expirado' | 'cancelado';
    observacoes?: string;
  }): Promise<Contrato> {
    return fetchAPI<Contrato>('/contratos', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  // Atualizar contrato - PUT /api/v1/contratos/{id}
  async atualizar(id: string, dados: Partial<Contrato>): Promise<Contrato> {
    return fetchAPI<Contrato>(`/contratos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  },

  // Deletar contrato - DELETE /api/v1/contratos/{id}
  async deletar(id: string): Promise<void> {
    return fetchAPI<void>(`/contratos/${id}`, { method: 'DELETE' });
  },
};

// Serviço de Intervenções (Tickets)
export const intervencoesService = {
  // Listar intervenções - GET /api/v1/intervencoes
  async listar(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tecnico?: string;
    cliente?: string;
  }): Promise<RespostaPaginada<Intervencao>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.prioridade) queryParams.append('prioridade', params.prioridade);
    if (params?.tecnico) queryParams.append('tecnico_id', params.tecnico);
    if (params?.cliente) queryParams.append('cliente_id', params.cliente);

    return fetchAPI<RespostaPaginada<Intervencao>>(`/intervencoes?${queryParams.toString()}`);
  },

  // Obter intervenção por ID - GET /api/v1/intervencoes/{id}
  async obterPorId(id: string): Promise<Intervencao> {
    return fetchAPI<Intervencao>(`/intervencoes/${id}`);
  },

  // Criar intervenção - POST /api/v1/intervencoes
  async criar(dados: {
    titulo: string;
    descricao: string;
    cliente_id: string;
    contrato_id?: string;
    prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
    anexos?: string[];
  }): Promise<Intervencao> {
    return fetchAPI<Intervencao>('/intervencoes', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  // Atualizar intervenção - PUT /api/v1/intervencoes/{id}
  async atualizar(id: string, dados: {
    titulo?: string;
    descricao?: string;
    tecnico_id?: string | null;
    status?: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado' | 'concluido';
    prioridade?: 'baixa' | 'media' | 'alta' | 'urgente';
  }): Promise<Intervencao> {
    return fetchAPI<Intervencao>(`/intervencoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  },

  // Deletar intervenção - DELETE /api/v1/intervencoes/{id}
  async deletar(id: string): Promise<void> {
    return fetchAPI<void>(`/intervencoes/${id}`, { method: 'DELETE' });
  },

  // Atribuir técnico - POST /api/v1/intervencoes/{id}/atribuir
  async atribuir(id: string, tecnicoId: string): Promise<Intervencao> {
    return fetchAPI<Intervencao>(`/intervencoes/${id}/atribuir`, {
      method: 'POST',
      body: JSON.stringify({ tecnico_id: tecnicoId }),
    });
  },

  // Adicionar comentário - POST /api/v1/intervencoes/{id}/comentarios
  async adicionarComentario(id: string, dados: {
    texto: string;
    visivel_cliente?: boolean;
  }): Promise<Intervencao> {
    return fetchAPI<Intervencao>(`/intervencoes/${id}/comentarios`, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  // Adicionar anexo - POST /api/v1/intervencoes/{id}/anexos
  async adicionarAnexo(id: string, formData: FormData): Promise<Intervencao> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/intervencoes/${id}/anexos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'Erro ao enviar anexo');
    }

    return response.json();
  },
};

// Serviço de Notificações
export const notificacoesService = {
  // Listar notificações - GET /api/v1/notificacoes
  async listar(params?: {
    page?: number;
    limit?: number;
  }): Promise<RespostaPaginada<Notificacao>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return fetchAPI<RespostaPaginada<Notificacao>>(`/notificacoes${query ? `?${query}` : ''}`);
  },

  // Marcar como lida - PUT /api/v1/notificacoes/{id}/lida
  async marcarLida(id: string): Promise<Notificacao> {
    return fetchAPI<Notificacao>(`/notificacoes/${id}/lida`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  },

  // Marcar todas como lidas - PUT /api/v1/notificacoes/marcar-todas-lidas
  async marcarTodasLidas(): Promise<void> {
    return fetchAPI<void>('/notificacoes/marcar-todas-lidas', {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  },
};

// Serviço de Registo de Horas
export const horasTrabalhadasService = {
  // Listar horas - GET /api/v1/horas-trabalhadas
  async listar(params?: {
    page?: number;
    limit?: number;
    search?: string;
    intervencao?: string;
    tipo?: string;
    data_inicio?: string;
    data_fim?: string;
  }): Promise<RespostaPaginada<HoraTrabalho>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.intervencao) queryParams.append('intervencao_id', params.intervencao);
    if (params?.tipo) queryParams.append('tipo', params.tipo);
    if (params?.data_inicio) queryParams.append('data_inicio', params.data_inicio);
    if (params?.data_fim) queryParams.append('data_fim', params.data_fim);

    return fetchAPI<RespostaPaginada<HoraTrabalho>>(`/horas-trabalhadas?${queryParams.toString()}`);
  },

  // Obter resumo de horas do técnico (Hoje, Semana, Mês)
  async obterResumo(): Promise<{ hoje: number; semana: number; mes: number }> {
    return fetchAPI<{ hoje: number; semana: number; mes: number }>('/horas-trabalhadas/resumo');
  },

  // Registar novas horas - POST /api/v1/horas-trabalhadas
  async criar(dados: {
    intervencao_id: string;
    horas: number;
    data_trabalho: string;
    descricao: string;
    tipo: 'presencial' | 'remoto';
  }): Promise<HoraTrabalho> {
    return fetchAPI<HoraTrabalho>('/horas-trabalhadas', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  // Atualizar horas - PUT /api/v1/horas-trabalhadas/{id}
  async atualizar(id: string, dados: Partial<{
    horas: number;
    data_trabalho: string;
    descricao: string;
    tipo: 'presencial' | 'remoto';
  }>): Promise<HoraTrabalho> {
    return fetchAPI<HoraTrabalho>(`/horas-trabalhadas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  },

  // Deletar horas - DELETE /api/v1/horas-trabalhadas/{id}
  async deletar(id: string): Promise<void> {
    return fetchAPI<void>(`/horas-trabalhadas/${id}`, { method: 'DELETE' });
  },
};

// Serviço de Cronómetro
export const cronometroService = {
  // Listar sessões ativas - GET /api/v1/cronometro
  async listar(): Promise<SessaoCronometro[]> {
    return fetchAPI<SessaoCronometro[]>('/cronometro');
  },

  // Iniciar cronómetro - POST /api/v1/cronometro/iniciar
  async iniciar(dados: {
    intervencao_id: string;
    tipo: 'presencial' | 'remoto';
  }): Promise<SessaoCronometro> {
    return fetchAPI<SessaoCronometro>('/cronometro/iniciar', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  // Pausar cronómetro - POST /api/v1/cronometro/{id}/pausar
  async pausar(id: string): Promise<SessaoCronometro> {
    return fetchAPI<SessaoCronometro>(`/cronometro/${id}/pausar`, {
      method: 'POST',
    });
  },

  // Retomar cronómetro - POST /api/v1/cronometro/{id}/retomar
  async retomar(id: string): Promise<SessaoCronometro> {
    return fetchAPI<SessaoCronometro>(`/cronometro/${id}/retomar`, {
      method: 'POST',
    });
  },

  // Parar e guardar - POST /api/v1/cronometro/{id}/parar
  async parar(id: string, dados: {
    descricao: string;
    horas: number;
  }): Promise<void> {
    return fetchAPI<void>(`/cronometro/${id}/parar`, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  // Sincronizar tempo - POST /api/v1/cronometro/{id}/sync
  async sincronizar(id: string, tempoAcumulado: number): Promise<void> {
    return fetchAPI<void>(`/cronometro/${id}/sync`, {
      method: 'POST',
      body: JSON.stringify({ tempo_acumulado: tempoAcumulado }),
    });
  },
};

// Serviço de Dashboards/Relatórios
export const relatoriosService = {
  // Dashboard Admin - GET /api/v1/relatorios/dashboard-admin
  async dashboardAdmin(): Promise<any> {
    return fetchAPI<any>('/relatorios/dashboard-admin');
  },

  // Dashboard Técnico - GET /api/v1/relatorios/dashboard-tecnico
  async dashboardTecnico(): Promise<any> {
    return fetchAPI<any>('/relatorios/dashboard-tecnico');
  },

  // Dashboard Cliente - GET /api/v1/relatorios/dashboard-cliente
  async dashboardCliente(): Promise<any> {
    return fetchAPI<any>('/relatorios/dashboard-cliente');
  },

  // Relatório de horas - GET /api/v1/relatorios/horas
  async relatorioHoras(): Promise<any> {
    return fetchAPI<any>('/relatorios/horas');
  },

  // Relatório financeiro - GET /api/v1/relatorios/financeiro
  async relatorioFinanceiro(): Promise<any> {
    return fetchAPI<any>('/relatorios/financeiro');
  },

  // Relatório de intervenções - GET /api/v1/relatorios/intervencoes
  async relatorioIntervencoes(): Promise<any> {
    return fetchAPI<any>('/relatorios/intervencoes');
  },
};
