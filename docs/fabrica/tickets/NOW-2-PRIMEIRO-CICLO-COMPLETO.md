---
ticket_id: NOW-2
status: now
gate: G0
owner: codex
updated_at: 2026-02-26T10:40:00Z
forum_thread_id: "1476528283653771377"
---

# NOW-2 — Primeiro Ciclo Completo da Fábrica (G0→G3)

## Objetivo
Provar a operação real da fábrica executando 1 ticket pequeno ponta-a-ponta com gates e governança.

## Escopo
- Executar 1 ticket real de baixo risco.
- Passar pelos gates G0, G1, G2, G3.
- Registrar decisão final (ship/ajustar/rollback).

## Fora de escopo
- Abrir novo escopo de produto.
- Executar múltiplos tickets em paralelo.

## DoR
- [ ] Ticket escolhido e escopo fechado
- [ ] Critério de pronto definido
- [ ] Risco e rollback definidos

## Tarefas
- [ ] Gate 0: preflight
- [ ] Gate 1: qualidade (build/test/typecheck)
- [ ] Gate 2: validação funcional
- [ ] Gate 3: docs + decisão
- [ ] Registro completo no canal oficial (#forja)

## DoD
- [ ] G0→G3 com status registrado
- [ ] Decisão final explícita
- [ ] Risco + rollback documentados
- [ ] Encerramento do ciclo sem abrir novo ticket antes

## Risco
Pular gate por pressa e perder confiabilidade.

## Mitigação
Nenhum avanço para próximo gate sem evidência mínima do anterior.

## Rollback
Se Gate 2 ou 3 falhar, volta para ajuste no mesmo ticket sem abrir novo trabalho.
