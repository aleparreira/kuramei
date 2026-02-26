---
ticket_id: NOW-1
status: done
gate: G3
owner: codex
updated_at: 2026-02-26T14:18:00Z
forum_thread_id: "1476528280856170669"
---

# NOW-1 — Gate de Testes Confiável

## Objetivo
Eliminar falso-negativo do pipeline de testes e garantir gate confiável para a fábrica 24/7.

## Escopo
- Manter `pnpm test` estável no monorepo Kuramei.
- Formalizar política para pacotes sem testes (sem quebrar pipeline à toa).

## Fora de escopo
- Criar suíte completa de testes para todos os pacotes.
- Refatoração ampla de infraestrutura de CI.

## DoR
- [x] Problema reproduzido (`No test files found` quebrando pipeline)
- [x] Estratégia definida

## Tarefas
- [x] Ajustar scripts de teste para `--passWithNoTests` nos pacotes afetados
- [x] Validar `pnpm test` no repo
- [x] Registrar evidência no canal oficial da fábrica (#forja)

## DoD
- [x] `pnpm test` passando
- [x] Evidência registrada no canal oficial
- [x] Decisão documentada com risco/rollback

## Risco
`--passWithNoTests` pode mascarar falta de cobertura.

## Mitigação
Manter backlog explícito de cobertura mínima por pacote crítico.

## Rollback
Reverter os scripts `test` para `vitest run` sem flag.
