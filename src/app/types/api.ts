// Tipos baseados na especificação OpenAPI da documentação

// Enums de Status
export type StatusUsuario = 'activo' | 'inactivo';
export type StatusContrato = 'activo' | 'expirado' | 'cancelado';
export type StatusIntervencao = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado' | 'concluido';
export type PrioridadeIntervencao = 'baixa' | 'media' | 'alta' | 'urgente';
export type TipoContrato = 'horas' | 'mensal' | 'anual';
export type TipoHoraTrabalho = 'presencial' | 'remoto';
export type TipoPerfil = 'admin' | 'tecnico' | 'cliente';

// Interface de Cliente conforme ClienteDetalhe da API
export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  empresa?: string;
  nif?: string;
  status: StatusUsuario;
  ip_servidor?: string;
  postos?: any;
  data_criacao: string;
  contratos_ativos?: number;
}

// Interface de Técnico conforme TecnicoDetalhe da API
export interface Tecnico {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  especialidades?: string[];
  status: StatusUsuario;
  intervencoes_ativas?: number;
  total_horas_mes?: number;
  data_contratacao?: string;
}

// Interface de Contrato conforme ContratoDetalhe da API
export interface Contrato {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  tipo_contrato: string;
  tipo_de_pagamento: string;
  horas_contratadas: string | number;
  horas_utilizadas: string | number;
  horas_disponiveis: string | number;
  valor_total: string | number;
  valor_hora: string | number;
  data_inicio: string;
  data_fim: string;
  status: 'activo' | 'expirado' | 'cancelado';
  observacoes?: string;
  numero?: string; // Mantendo para compatibilidade com o card
}

// Interface de Anexo conforme AnexoIntervencao da API
export interface AnexoIntervencao {
  id: string;
  nome_arquivo: string;
  url: string;
  tamanho?: number;
  descricao?: string;
  data_criacao: string;
}

// Interface de Comentário conforme ComentarioIntervencao da API
export interface ComentarioIntervencao {
  id: string;
  intervencao: string;
  usuario_nome: string;
  texto: string;
  visivel_cliente: boolean;
  data_criacao: string;
}

// Interface de Histórico de Estado conforme HistoricoEstadoIntervencao da API
export interface HistoricoEstadoIntervencao {
  id: string;
  status: StatusIntervencao;
  alterado_por_nome: string;
  nota?: string;
  data_criacao: string;
}

// Interface de Intervenção (Ticket) conforme IntervencaoDetalhe da API
export interface Intervencao {
  id: string;
  numero: string;
  titulo: string;
  descricao: string;
  cliente_id: string;
  cliente_nome: string;
  tecnico_id?: string;
  tecnico_nome?: string;
  contrato_id?: string;
  status: StatusIntervencao;
  prioridade: PrioridadeIntervencao;
  horas_trabalhadas?: number;
  data_abertura: string;
  data_conclusao?: string;
  anexos?: AnexoIntervencao[];
  comentarios?: ComentarioIntervencao[];
  historico_status?: HistoricoEstadoIntervencao[];
}

// Interface de Hora de Trabalho conforme HoraTrabalhoLista da API
export interface HoraTrabalho {
  id: string;
  intervencao: string;
  tecnico: string;
  horas: number;
  data_trabalho: string;
  descricao: string;
  tipo: TipoHoraTrabalho;
}

// Interface de Notificação conforme Notificacao da API
export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
  lida: boolean;
  data_criacao: string;
}

// Interface de Resposta Paginada genérica (Atualizada para o formato real da API)
export interface RespostaPaginada<T> {
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  data: T[];
  // Mantidos para compatibilidade com outros formatos se necessário
  count?: number;
  results?: T[];
}

// --- Interfaces do Cronómetro ---

export interface Pausa {
  inicio: string;
  fim?: string;
  duracao: number; // segundos
}

export interface SessaoCronometro {
  id: string;
  tecnico_id: string;
  intervencao_id: string;
  intervencao_numero?: string;
  intervencao_titulo?: string;
  cliente_nome?: string;
  hora_inicio: string;
  hora_pausa?: string;
  tempo_acumulado: number; // segundos
  status: 'ativo' | 'pausado';
  tipo: 'presencial' | 'remoto';
  criado_em: string;
  pausas?: Pausa[];
}

export interface CronometroState extends SessaoCronometro {
  tempoAtual?: number; // segundos (calculado no frontend)
}
