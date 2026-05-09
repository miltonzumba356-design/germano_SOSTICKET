import {
  Cliente,
  Tecnico,
  Contrato,
  Intervencao,
  Notificacao
} from '../types/api';

// Mock de Clientes para demonstração
export const mockClientes: Cliente[] = [
  {
    id: '1',
    nome: 'TechCorp Solutions',
    email: 'contato@techcorp.pt',
    telefone: '+351 912 345 001',
    empresa: 'TechCorp Solutions Lda',
    nif: '501234567',
    endereco: 'Av. da Liberdade, 123, Lisboa',
    status: 'activo',
    data_criacao: '2024-01-15T10:00:00Z',
    contratos_ativos: 2
  },
  {
    id: '2',
    nome: 'InnovateHub',
    email: 'admin@innovatehub.pt',
    telefone: '+351 912 345 002',
    empresa: 'InnovateHub SA',
    nif: '501234568',
    endereco: 'Rua das Flores, 45, Porto',
    status: 'activo',
    data_criacao: '2024-02-20T11:30:00Z',
    contratos_ativos: 1
  },
  {
    id: '3',
    nome: 'DataStream Analytics',
    email: 'suporte@datastream.pt',
    telefone: '+351 912 345 003',
    empresa: 'DataStream Analytics',
    nif: '501234569',
    endereco: 'Praça do Comércio, 78, Lisboa',
    status: 'activo',
    data_criacao: '2024-03-10T14:15:00Z',
    contratos_ativos: 1
  }
];

// Mock de Técnicos para demonstração
export const mockTecnicos: Tecnico[] = [
  {
    id: 't1',
    nome: 'João Silva',
    email: 'joao.silva@sostickect.pt',
    telefone: '+351 912 345 100',
    especialidades: ['Redes', 'Segurança', 'Cloud'],
    status: 'activo',
    intervencoes_ativas: 5,
    total_horas_mes: 128,
    data_contratacao: '2023-01-10'
  },
  {
    id: 't2',
    nome: 'Ana Costa',
    email: 'ana.costa@sostickect.pt',
    telefone: '+351 912 345 101',
    especialidades: ['Desenvolvimento', 'Database', 'DevOps'],
    status: 'activo',
    intervencoes_ativas: 3,
    total_horas_mes: 96,
    data_contratacao: '2023-03-15'
  },
  {
    id: 't3',
    nome: 'Pedro Oliveira',
    email: 'pedro.oliveira@sostickect.pt',
    telefone: '+351 912 345 102',
    especialidades: ['Infraestrutura', 'Windows Server', 'Active Directory'],
    status: 'activo',
    intervencoes_ativas: 4,
    total_horas_mes: 112,
    data_contratacao: '2023-06-01'
  }
];

// Mock de Contratos para demonstração
export const mockContratos: Contrato[] = [
  {
    id: 'c1',
    cliente_id: '1',
    cliente_nome: 'TechCorp Solutions',
    tipo: 'mensal',
    horas_contratadas: 40,
    horas_utilizadas: 28,
    horas_disponiveis: 12,
    valor_total: 3200,
    valor_hora: 80,
    data_inicio: '2026-05-01',
    data_fim: '2026-05-31',
    status: 'activo',
    observacoes: 'Contrato mensal de suporte técnico'
  },
  {
    id: 'c2',
    cliente_id: '1',
    cliente_nome: 'TechCorp Solutions',
    tipo: 'horas',
    horas_contratadas: 100,
    horas_utilizadas: 45,
    horas_disponiveis: 55,
    valor_total: 7500,
    valor_hora: 75,
    data_inicio: '2026-01-01',
    data_fim: '2026-12-31',
    status: 'activo',
    observacoes: 'Pacote de horas anual para projetos específicos'
  },
  {
    id: 'c3',
    cliente_id: '2',
    cliente_nome: 'InnovateHub',
    tipo: 'anual',
    horas_contratadas: 500,
    horas_utilizadas: 156,
    horas_disponiveis: 344,
    valor_total: 35000,
    valor_hora: 70,
    data_inicio: '2026-01-01',
    data_fim: '2026-12-31',
    status: 'activo',
    observacoes: 'Contrato anual de gestão de infraestrutura'
  },
  {
    id: 'c4',
    cliente_id: '3',
    cliente_nome: 'DataStream Analytics',
    tipo: 'mensal',
    horas_contratadas: 20,
    horas_utilizadas: 18,
    horas_disponiveis: 2,
    valor_total: 1600,
    valor_hora: 80,
    data_inicio: '2026-05-01',
    data_fim: '2026-05-31',
    status: 'activo',
    observacoes: 'Suporte mensal para aplicações críticas'
  }
];

// Mock de Intervenções (Tickets) para demonstração
export const mockIntervencoes: Intervencao[] = [
  {
    id: 'i1',
    numero: 'TKT-2026-0001',
    titulo: 'Servidor de email não responde',
    descricao: 'O servidor de email principal está apresentando timeout nas conexões. Usuários não conseguem enviar ou receber emails.',
    cliente_id: '1',
    cliente_nome: 'TechCorp Solutions',
    tecnico_id: 't1',
    tecnico_nome: 'João Silva',
    contrato_id: 'c1',
    status: 'em_andamento',
    prioridade: 'urgente',
    horas_trabalhadas: 3.5,
    data_abertura: '2026-05-04T09:30:00Z',
    comentarios: [
      {
        id: 'cm1',
        intervencao: 'i1',
        usuario_nome: 'João Silva',
        texto: 'Iniciando análise do servidor. Verificando logs de sistema.',
        visivel_cliente: true,
        data_criacao: '2026-05-04T10:00:00Z'
      }
    ],
    historico_status: [
      {
        id: 'h1',
        status: 'aberto',
        alterado_por_nome: 'Sistema',
        nota: 'Ticket criado automaticamente',
        data_criacao: '2026-05-04T09:30:00Z'
      },
      {
        id: 'h2',
        status: 'em_andamento',
        alterado_por_nome: 'João Silva',
        nota: 'Técnico atribuído e iniciou investigação',
        data_criacao: '2026-05-04T09:45:00Z'
      }
    ]
  },
  {
    id: 'i2',
    numero: 'TKT-2026-0002',
    titulo: 'Configuração de VPN para novo funcionário',
    descricao: 'Necessário configurar acesso VPN para novo colaborador que iniciou hoje.',
    cliente_id: '1',
    cliente_nome: 'TechCorp Solutions',
    tecnico_id: 't2',
    tecnico_nome: 'Ana Costa',
    contrato_id: 'c1',
    status: 'concluido',
    prioridade: 'media',
    horas_trabalhadas: 1.5,
    data_abertura: '2026-05-03T14:00:00Z',
    data_conclusao: '2026-05-03T16:30:00Z',
    comentarios: [],
    historico_status: [
      {
        id: 'h3',
        status: 'aberto',
        alterado_por_nome: 'Sistema',
        data_criacao: '2026-05-03T14:00:00Z'
      },
      {
        id: 'h4',
        status: 'concluido',
        alterado_por_nome: 'Ana Costa',
        nota: 'VPN configurada e testada com sucesso',
        data_criacao: '2026-05-03T16:30:00Z'
      }
    ]
  },
  {
    id: 'i3',
    numero: 'TKT-2026-0003',
    titulo: 'Atualização de certificados SSL',
    descricao: 'Certificados SSL dos domínios principais vencem em 15 dias. Necessário renovação.',
    cliente_id: '2',
    cliente_nome: 'InnovateHub',
    tecnico_id: 't1',
    tecnico_nome: 'João Silva',
    contrato_id: 'c3',
    status: 'aberto',
    prioridade: 'alta',
    horas_trabalhadas: 0,
    data_abertura: '2026-05-04T08:15:00Z',
    comentarios: [],
    historico_status: [
      {
        id: 'h5',
        status: 'aberto',
        alterado_por_nome: 'Sistema',
        nota: 'Alerta automático de vencimento de certificado',
        data_criacao: '2026-05-04T08:15:00Z'
      }
    ]
  },
  {
    id: 'i4',
    numero: 'TKT-2026-0004',
    titulo: 'Backup não executado na última noite',
    descricao: 'Sistema de backup automático falhou. Última execução bem-sucedida foi há 2 dias.',
    cliente_id: '3',
    cliente_nome: 'DataStream Analytics',
    tecnico_id: 't3',
    tecnico_nome: 'Pedro Oliveira',
    contrato_id: 'c4',
    status: 'resolvido',
    prioridade: 'urgente',
    horas_trabalhadas: 2.0,
    data_abertura: '2026-05-02T07:00:00Z',
    comentarios: [
      {
        id: 'cm2',
        intervencao: 'i4',
        usuario_nome: 'Pedro Oliveira',
        texto: 'Problema identificado: disco de backup estava cheio. Limpeza realizada e backup executado manualmente.',
        visivel_cliente: true,
        data_criacao: '2026-05-02T09:30:00Z'
      }
    ],
    historico_status: [
      {
        id: 'h6',
        status: 'aberto',
        alterado_por_nome: 'Sistema',
        data_criacao: '2026-05-02T07:00:00Z'
      },
      {
        id: 'h7',
        status: 'em_andamento',
        alterado_por_nome: 'Pedro Oliveira',
        data_criacao: '2026-05-02T08:00:00Z'
      },
      {
        id: 'h8',
        status: 'resolvido',
        alterado_por_nome: 'Pedro Oliveira',
        nota: 'Backup restaurado e funcionando normalmente',
        data_criacao: '2026-05-02T10:00:00Z'
      }
    ]
  },
  {
    id: 'i5',
    numero: 'TKT-2026-0005',
    titulo: 'Solicitação de novo usuário no sistema',
    descricao: 'Criar conta de usuário para novo membro da equipe de vendas.',
    cliente_id: '2',
    cliente_nome: 'InnovateHub',
    status: 'aberto',
    prioridade: 'baixa',
    horas_trabalhadas: 0,
    data_abertura: '2026-05-04T11:00:00Z',
    comentarios: [],
    historico_status: [
      {
        id: 'h9',
        status: 'aberto',
        alterado_por_nome: 'Maria Santos',
        data_criacao: '2026-05-04T11:00:00Z'
      }
    ]
  }
];

// Mock de Notificações para demonstração
export const mockNotificacoes: Notificacao[] = [
  {
    id: 'n1',
    tipo: 'urgente',
    titulo: 'Novo ticket urgente',
    mensagem: 'Ticket TKT-2026-0001 com prioridade URGENTE foi aberto',
    link: '/intervencoes/i1',
    lida: false,
    data_criacao: '2026-05-04T09:30:00Z'
  },
  {
    id: 'n2',
    tipo: 'contrato',
    titulo: 'Contrato próximo do limite',
    mensagem: 'Contrato mensal de TechCorp tem apenas 12 horas disponíveis',
    link: '/contratos/c1',
    lida: false,
    data_criacao: '2026-05-04T08:00:00Z'
  },
  {
    id: 'n3',
    tipo: 'conclusao',
    titulo: 'Ticket concluído',
    mensagem: 'Ticket TKT-2026-0002 foi marcado como concluído',
    link: '/intervencoes/i2',
    lida: true,
    data_criacao: '2026-05-03T16:30:00Z'
  }
];
