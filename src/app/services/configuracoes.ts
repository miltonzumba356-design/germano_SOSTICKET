import { RespostaPaginada } from '../types/api';
import { fetchAPI } from './api';

export interface ConfiguracaoSistema {
  id?: string;
  chave: string;
  valor: string;
  descricao?: string;
  data_atualizacao?: string;
}

export const configuracoesService = {
  // Listar configurações - GET /api/v1/configuracoes
  async listar(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<RespostaPaginada<ConfiguracaoSistema>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return fetchAPI<RespostaPaginada<ConfiguracaoSistema>>(`/configuracoes${query ? `?${query}` : ''}`);
  },

  // Atualizar configuração - PUT /api/v1/configuracoes
  async atualizar(dados: ConfiguracaoSistema): Promise<ConfiguracaoSistema> {
    return fetchAPI<ConfiguracaoSistema>('/configuracoes', {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  },
};
