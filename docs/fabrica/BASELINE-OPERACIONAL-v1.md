# Baseline Operacional da Fábrica — v1

Data base: 2026-02-26
Branch: `feat/factory-operationalization`

## Saúde técnica
- build: OK
- typecheck: OK
- test: OK

## Estado operacional
- Forum Sync ativo e estável (sem erro consecutivo)
- Heartbeats ativos (Operação 15m, Backoffice 1h, GTM 2h)
- Factory Report ativo (2h, modo exception-only para custo)

## Estado de governança
- Canal oficial de report: `channel:1476513995568582737`
- Tickets NOW com frontmatter de rastreabilidade (ticket_id, status/gate, owner, branch, updated_at, forum_thread_id)
- Política de branching e challenger registradas em docs

## Alertas observados
- WARN recorrente por pendências git locais (normal durante ciclo de implantação)
- Ruído de CI legado mitigado no heartbeat de operação (failure antigo não é FAIL crítico)

## Decisão operacional
- Baseline considerada válida para semana 1
- Próximo foco: execução NOW-5 e NOW-6 com evidência em fórum
