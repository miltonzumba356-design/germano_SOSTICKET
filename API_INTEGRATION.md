# Integração com API - SOSTickect

## Visão Geral

O sistema **SOSTickect** está totalmente integrado com a API real em `https://suport-api.onrender.com/api/v1`.

## Configuração

### URL da API
A URL base está configurada em `/src/app/services/api.ts`:
```typescript
const API_BASE_URL = 'https://suport-api.onrender.com/api/v1';
```

### Autenticação
O sistema utiliza JWT (JSON Web Tokens) para autenticação:
- Token de acesso armazenado em `localStorage.auth_token`
- Token de refresh armazenado em `localStorage.refresh_token`
- Header de autenticação: `Authorization: Bearer {token}`

## Serviços Implementados

### 1. authService
Gerencia autenticação de usuários:
- `login(email, password)` - POST /auth/login
- `logout()` - POST /auth/logout
- `refreshToken()` - POST /auth/refresh
- `getProfile()` - GET /perfil

### 2. clientesService
Gerencia clientes:
- `listar(params)` - GET /clientes
- `obterPorId(id)` - GET /clientes/{id}
- `criar(dados)` - POST /clientes
- `atualizar(id, dados)` - PUT /clientes/{id}
- `deletar(id)` - DELETE /clientes/{id}

### 3. tecnicosService
Gerencia técnicos:
- `listar(params)` - GET /tecnicos
- `obterPorId(id)` - GET /tecnicos/{id}
- `criar(dados)` - POST /tecnicos
- `atualizar(id, dados)` - PUT /tecnicos/{id}
- `deletar(id)` - DELETE /tecnicos/{id}

### 4. contratosService
Gerencia contratos:
- `listar(params)` - GET /contratos
- `obterPorId(id)` - GET /contratos/{id}
- `criar(dados)` - POST /contratos
- `atualizar(id, dados)` - PUT /contratos/{id}
- `deletar(id)` - DELETE /contratos/{id}

### 5. intervencoesService
Gerencia tickets/intervenções:
- `listar(params)` - GET /intervencoes
- `obterPorId(id)` - GET /intervencoes/{id}
- `criar(dados)` - POST /intervencoes
- `atualizar(id, dados)` - PUT /intervencoes/{id}
- `deletar(id)` - DELETE /intervencoes/{id}
- `atribuir(id, tecnicoId)` - POST /intervencoes/{id}/atribuir
- `adicionarComentario(id, dados)` - POST /intervencoes/{id}/comentarios
- `adicionarAnexo(id, formData)` - POST /intervencoes/{id}/anexos

### 6. notificacoesService
Gerencia notificações:
- `listar(params)` - GET /notificacoes
- `marcarLida(id)` - PUT /notificacoes/{id}/lida
- `marcarTodasLidas()` - PUT /notificacoes/marcar-todas-lidas

### 7. relatoriosService
Obtém dados de dashboards e relatórios:
- `dashboardAdmin()` - GET /relatorios/dashboard-admin
- `dashboardTecnico()` - GET /relatorios/dashboard-tecnico
- `dashboardCliente()` - GET /relatorios/dashboard-cliente
- `relatorioHoras()` - GET /relatorios/horas
- `relatorioFinanceiro()` - GET /relatorios/financeiro
- `relatorioIntervencoes()` - GET /relatorios/intervencoes

## Componentes Atualizados

Todos os componentes principais foram atualizados para usar a API real:

### AuthContext
- Verifica token ao carregar a aplicação
- Busca perfil do usuário automaticamente
- Gerencia estado de autenticação global

### Dashboard
- Carrega dados via API /relatorios/dashboard-{perfil}
- Exibe tickets recentes via API /intervencoes
- Mostra loading states durante carregamento

### Clientes
- Lista clientes via API com paginação
- Busca em tempo real
- Criação e edição de clientes
- Estados de loading e erro

### Técnicos
- Lista técnicos via API
- Busca em tempo real
- Estados de loading e erro

### Contratos
- Lista contratos via API
- Busca em tempo real
- Estados de loading e erro

### Intervenções
- Lista tickets via API
- Busca em tempo real
- Estados de loading e erro

## Tratamento de Erros

Todos os serviços implementam tratamento de erros:
```typescript
try {
  const response = await clientesService.listar();
  // Processa resposta
} catch (error: any) {
  console.error('Erro:', error);
  // Exibe mensagem ao usuário
}
```

A classe `ApiError` captura:
- Status HTTP do erro
- Mensagem de erro da API

## Estados de Carregamento

Todos os componentes implementam estados visuais:
- **Loading**: Spinner animado durante requisições
- **Erro**: Mensagem de erro em destaque
- **Vazio**: Mensagem quando não há dados
- **Sucesso**: Exibição dos dados

## Paginação

A API retorna dados paginados no formato:
```typescript
{
  count: number,
  next: string | null,
  previous: string | null,
  results: T[]
}
```

## Próximos Passos

Para implementações futuras:

1. **Adicionar paginação nos componentes**
   - Botões de próxima/anterior página
   - Seletor de itens por página

2. **Implementar modais de criação/edição**
   - Formulários completos para cada entidade
   - Validação de campos

3. **Adicionar visualização de detalhes**
   - Modal com informações completas
   - Histórico e comentários de tickets

4. **Implementar upload de anexos**
   - Componente de upload de arquivos
   - Preview de anexos

5. **Adicionar notificações em tempo real**
   - WebSocket ou polling para notificações
   - Badge de contador no ícone

6. **Implementar refresh automático de token**
   - Interceptor para renovar token expirado
   - Retry de requisições falhadas

## Como Testar

1. Certifique-se de que a API está acessível em `https://suport-api.onrender.com`
2. Faça login com credenciais válidas da API
3. Os dados serão carregados automaticamente
4. Todas as operações CRUD estão funcionais

## Notas Importantes

- Todos os comentários estão em português
- Nomes de variáveis e funções seguem padrão camelCase
- Componentes seguem padrão PascalCase
- Tipos TypeScript baseados na especificação OpenAPI
