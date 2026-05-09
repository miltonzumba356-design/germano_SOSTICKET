import { HoraTrabalho, RespostaPaginada } from '../types/api';
import { fetchAPI } from './api';

export const horasService = {
  // Listar horas de trabalho - GET /api/v1/horas
  async listar(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<RespostaPaginada<HoraTrabalho>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return fetchAPI<RespostaPaginada<HoraTrabalho>>(`/horas${query ? `?${query}` : ''}`);
  },

  // Obter hora de trabalho por ID - GET /api/v1/horas/{id}
  async obterPorId(id: string): Promise<HoraTrabalho> {
    return fetchAPI<HoraTrabalho>(`/horas/${id}`);
  },

  // Criar hora de trabalho - POST /api/v1/horas
  async criar(dados: {
    intervencao_id: string;
    tecnico_id: string;
    horas: number;
    data_trabalho: string;
    descricao?: string;
    tipo?: 'presencial' | 'remoto';
  }): Promise<HoraTrabalho> {
    return fetchAPI<HoraTrabalho>('/horas', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  // Atualizar hora de trabalho - PUT /api/v1/horas/{id}
  async atualizar(id: string, dados: Partial<HoraTrabalho>): Promise<HoraTrabalho> {
    return fetchAPI<HoraTrabalho>(`/horas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  },

  // Atualização parcial de hora de trabalho - PATCH /api/v1/horas/{id}
  async atualizacaoParcial(id: string, dados: Partial<HoraTrabalho>): Promise<HoraTrabalho> {
    return fetchAPI<HoraTrabalho>(`/horas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    });
  },

  // Deletar hora de trabalho - DELETE /api/v1/horas/{id}
  async deletar(id: string): Promise<void> {
    return fetchAPI<void>(`/horas/${id}`, { method: 'DELETE' });
  },
};
