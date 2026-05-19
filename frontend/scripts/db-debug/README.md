# Database Debug Scripts

**Uso:** Scripts de debugging, inspeção de dados e setup local.  
**Ambiente:** Apenas local (DEV). Não executar em produção.

## .cjs Scripts

| Script                      | Propósito                                                         |
| --------------------------- | ----------------------------------------------------------------- |
| `check_*.cjs`               | Inspecionar estado de dados no banco (usuários, sessões, atletas) |
| `create_play_user.cjs`      | Setup inicial: criar usuário teste para anotações                 |
| `create_test_abandoned.cjs` | Criar sessão de anotação abandonada para testes                   |
| `query_pupilo.cjs`          | Query específica de pupilo (lógica de negócio antiga)             |
| `test_*.cjs`                | Testes ad-hoc: deduplicação, endpoint suspenso                    |
| `find_scored_matches.cjs`   | Localizar partidas já anotadas                                    |
| `fix_players_emails.cjs`    | Correção em lote de emails de jogadores                           |
| `show_scored_example.cjs`   | Exibir exemplo de partida anotada                                 |
| `list_users.cjs`            | Listar usuários do banco                                          |
| `verify_consolidation.cjs`  | Validar consolidação de sessões                                   |
| `http_test_api.cjs`         | Testes HTTP diretos contra API local                              |

## .sql Scripts

| Script                 | Propósito                                        |
| ---------------------- | ------------------------------------------------ |
| `check_*.sql`          | Queries de inspeção (sessões, atletas, VINCULOs) |
| `cleanup_sessions.sql` | Limpeza manual de sessões órfãs ou incompletas   |

## Como Usar

```bash
# Rodar um script debug
node frontend/scripts/db-debug/create_play_user.cjs

# Executar query SQL manualmente
psql nr-bps_db -f frontend/scripts/db-debug/check_sessions.sql

# Verificar estado de anotações suspensas
node frontend/scripts/db-debug/test_suspended_endpoint.cjs
```

## ⚠️ Notas

- **Nunca commit** outputs de debug ou dados temporários
- Rodar com `pnpm` se tiver variáveis de ambiente customizadas
- Se usar em CI/CD, isolar em branch de debug e descartar após uso
- Para novos scripts de debug, colocá-los aqui e documentar

---

**Última atualização:** Maio 2026  
**Status:** Consolidação de código legado — Fase 2
