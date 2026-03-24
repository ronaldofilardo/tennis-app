# Racket — Frontend

Aplicação web para gerenciamento de esportes de raquete com pontuação ao vivo, torneios e clubes.

## Stack Tecnológico

| Camada            | Tecnologia                                       |
| ----------------- | ------------------------------------------------ |
| Framework         | React 18 + Vite                                  |
| Linguagem         | TypeScript (strict mode)                         |
| Estilo            | Tailwind CSS                                     |
| Estado Global     | React Context API                                |
| Roteamento        | React Router DOM v6                              |
| HTTP Client       | Fetch personalizado (`src/config/httpClient.ts`) |
| Validação         | Zod                                              |
| Banco de Dados    | PostgreSQL via Prisma ORM                        |
| PWA               | vite-plugin-pwa (Workbox)                        |
| Testes Unitários  | Vitest + Testing Library                         |
| Testes E2E        | Playwright                                       |
| Testes de Mutação | Stryker                                          |
| Package Manager   | pnpm                                             |

## Início Rápido

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar banco de dados
cp .env.development .env.local
# Edite .env.local com suas credenciais PostgreSQL

# 3. Gerar Prisma Client
pnpm prisma:generate

# 4. Iniciar em desenvolvimento
pnpm dev              # Frontend na porta 5173
pnpm dev-server       # API backend na porta 3001

# 5. Rodar testes
pnpm test             # Vitest (watch mode)
pnpm test:coverage    # Com relatório de cobertura
pnpm test:e2e         # Playwright
```

## Estrutura do Projeto

```
src/
├── components/           # Componentes React reutilizáveis
│   ├── ui/               # Componentes base (Toast, LoadingIndicator, ErrorBoundary)
│   ├── scoreboard/       # Componentes do placar ao vivo
│   └── __tests__/        # Testes de componentes
├── config/               # Configuração da aplicação
│   ├── api.ts            # URL base da API
│   ├── env.ts            # Validação de variáveis de ambiente (Zod)
│   └── httpClient.ts     # Cliente HTTP singleton com interceptadores
├── contexts/             # Context Providers (estado global)
│   ├── AuthContext.tsx    # Autenticação, JWT, multi-clube
│   ├── MatchesContext.tsx # Lista de partidas e CRUD
│   └── NavigationContext.tsx # Navegação programática
├── core/                 # Lógica de negócio pura (sem React)
│   └── scoring/          # Motor de pontuação de tênis
│       ├── TennisScoring.ts       # Classe principal de pontuação
│       ├── TennisConfigFactory.ts # Configuração dos 8+ formatos
│       ├── pointFlowRules.ts      # Regras de fluxo tático
│       └── types.ts               # Tipos do domínio de pontuação
├── data/                 # Dados estáticos (matriz de confrontos)
├── hooks/                # Custom hooks React
│   ├── useGestures.ts    # Gestos touch para mobile
│   ├── useMatchSync.ts   # Sincronização de partida
│   ├── useOfflineSync.ts # Sync offline-first
│   └── useRealtimeMatch.ts # WebSocket/polling realtime
├── pages/                # Páginas/Views da aplicação
│   ├── AuthPage.tsx      # Login e registro
│   ├── Dashboard.tsx     # Dashboard do atleta
│   ├── GestorDashboard.tsx # Painel do gestor do clube
│   ├── AdminDashboard.tsx  # Painel do administrador
│   ├── MatchSetup.tsx    # Configuração de nova partida
│   ├── ScoreboardV2.tsx  # Placar ao vivo (componente principal)
│   └── TournamentDashboard.tsx # Gerenciamento de torneios
├── schemas/              # Schemas Zod para validação
│   └── contracts.ts      # Contratos de API tipados
├── services/             # Serviços e lógica de integração
│   ├── matchService.js   # CRUD de partidas
│   ├── authService.js    # Autenticação
│   ├── offlineDb.ts      # IndexedDB para offline
│   ├── logger.ts         # Logger estruturado
│   └── sanitization.ts   # Sanitização de inputs
├── styles/               # CSS global e tokens de design
├── types/                # TypeScript types compartilhados
│   ├── api.ts            # Tipos de request/response da API
│   ├── athlete.ts        # Tipos de atleta e helpers
│   └── match.ts          # Tipos de partida realtime
└── __mocks__/            # Mocks globais para testes
```

## Arquitetura

### Contextos (Estado Global)

A aplicação usa 3 Context Providers aninhados em `App.tsx`:

```
NavigationProvider → AuthProvider → MatchesProvider → ToastProvider → AppContent
```

| Contexto            | Responsabilidade                                                |
| ------------------- | --------------------------------------------------------------- |
| `AuthContext`       | Login/logout, JWT, troca de clube, roles (ADMIN/GESTOR/ATHLETE) |
| `MatchesContext`    | CRUD de partidas, filtros por clube                             |
| `NavigationContext` | Navegação programática centralizada                             |

### Motor de Pontuação (`src/core/scoring/`)

O motor de pontuação é a peça mais complexa do sistema. Suporta **11 formatos de tênis** baseados nas regras oficiais:

| Formato              | Descrição                                |
| -------------------- | ---------------------------------------- |
| `BEST_OF_3`          | Melhor de 3 sets (padrão)                |
| `BEST_OF_5`          | Melhor de 5 sets (Grand Slams)           |
| `SINGLE_SET`         | Set único                                |
| `PRO_SET`            | Primeiro a 8 games com vantagem de 2     |
| `MATCH_TIEBREAK`     | Super tiebreak de 10 pontos              |
| `SHORT_SET`          | Set curto (primeiro a 4 games)           |
| `NO_AD`              | Sem vantagem (sudden death no deuce)     |
| `FAST4`              | Fast4 Tennis (4 games, tiebreak em 3-3)  |
| `BEST_OF_3_MATCH_TB` | Melhor de 3 com match tiebreak no 3º set |
| `SHORT_SET_NO_AD`    | Set curto + No-Ad                        |
| `NO_LET_TENNIS`      | Tênis com regra No-Let                   |

**Classe principal**: `TennisScoring` — stateful, com suporte a undo e histórico detalhado de pontos (golpe, rally, efeito, direção).

**Fábrica**: `TennisConfigFactory` — gera `TennisConfig` por formato.

**Fluxo de pontos**: `pointFlowRules.ts` — regras derivadas do documento `fluxotosystem.txt` para análise tático-técnica dos rallies (vencedor → situação → tipo → golpe → efeito → direção).

### Multi-Tenancy

A aplicação suporta múltiplos clubes por usuário:

- Cada usuário pode pertencer a vários clubes com roles diferentes
- `ClubSelector` no header permite troca de clube ativo
- O `httpClient` injeta `x-club-id` automaticamente nos headers
- Rotas são protegidas por role: ADMIN > GESTOR > COACH > ATHLETE > SPECTATOR

### Offline-First (PWA)

- Service Worker via `vite-plugin-pwa` (Workbox)
- IndexedDB local (`src/services/offlineDb.ts`) para persistência offline
- Fila otimista (`src/services/optimisticQueue.ts`) para sincronização
- `useOfflineSync` hook para detecção de conectividade
- `OfflineBanner` componente visual para estado offline

## Variáveis de Ambiente

| Variável       | Obrigatória | Descrição                              |
| -------------- | ----------- | -------------------------------------- |
| `DATABASE_URL` | Sim         | Connection string do PostgreSQL        |
| `VITE_API_URL` | Não         | URL base da API (vazio usa proxy Vite) |
| `NODE_ENV`     | Sim         | `development`, `test` ou `production`  |

As variáveis são validadas em runtime via Zod em `src/config/env.ts`.

## Scripts Disponíveis

| Script               | Descrição                                              |
| -------------------- | ------------------------------------------------------ |
| `pnpm dev`           | Inicia o Vite dev server (porta 5173)                  |
| `pnpm build`         | Build de produção (Prisma generate + TSC + Vite build) |
| `pnpm lint`          | Linting com ESLint                                     |
| `pnpm format`        | Formata código com Prettier                            |
| `pnpm format:check`  | Verifica formatação sem alterar                        |
| `pnpm test`          | Vitest em watch mode                                   |
| `pnpm test:ci`       | Vitest com cobertura (CI)                              |
| `pnpm test:coverage` | Relatório de cobertura completo                        |
| `pnpm test:e2e`      | Testes end-to-end com Playwright                       |
| `pnpm test:e2e:ui`   | Playwright com interface visual                        |
| `pnpm test:mutation` | Testes de mutação com Stryker                          |
| `pnpm dev-server`    | Inicia o servidor de API local (porta 3001)            |

## Path Aliases

O projeto usa `@/` como alias para `src/`. Exemplo:

```typescript
// Antes (caminho relativo)
import { useAuth } from '../../contexts/AuthContext';

// Depois (path alias)
import { useAuth } from '@/contexts/AuthContext';
```

Configurado em `tsconfig.app.json`, `vite.config.ts` e `vitest.config.ts`.

## Padrões do Projeto

### Estilo

- **Tailwind CSS** como padrão para estilização
- Evitar criar novos arquivos `.css` independentes
- Classes utilitárias com Prettier plugin para ordenação automática

### Componentes

- Componentes pequenos e focados (Single Responsibility)
- Props tipadas com `interface` — nunca `any`
- `React.memo()` para componentes puros com props frequentes
- Error Boundaries para seções críticas

### Testes

- **Vitest** para testes unitários (cobertura mínima: 90% em lógica crítica)
- **Playwright** para testes E2E
- Padrão AAA (Arrange / Act / Assert)
- Mocks globais em `src/__mocks__/`
- Testes colocalizados: `*.test.ts(x)` ao lado do arquivo fonte

### TypeScript

- Strict mode sempre ativo
- `any` proibido — use `unknown` com type guards
- Zod para validação de dados externos
- Exports nomeados (evitar default exports em módulos compartilhados)
