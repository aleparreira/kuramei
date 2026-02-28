---
ticket_id: NEXT-5
status: done
gate: G3
owner: forja
branch: feat/factory-operationalization
updated_at: 2026-02-27T22:00:00Z
forum_thread_id: ""
arq_go_from: NEXT-4
---

# NEXT-5 — UOW Gate integrado ao pipeline

## Objetivo
Integrar o resultado do tester loop ao pipeline para bloquear promoção quando qualidade cair.

## Entrega (G3 ✅)

### Arquivos alterados
- `scripts/uow-gate.ts` — **novo**: gate script (lê uow-report.json, valida thresholds, output claro)
- `.github/workflows/ci.yml` — **novo**: pipeline completo (build/lint/typecheck/test + UOW gate step)
- `package.json` — `"uow-gate"` script adicionado

### Fluxo do gate

```
uow-report.json ausente  →  SKIP (exit 0, instrução pra rodar tester)
uow-report.json presente →  valida 3 thresholds + lista cenários falhos
  warning-only (padrão)  →  exit 0, print WARNING
  --enforce              →  exit 1, print BLOCKED
```

### Thresholds (NEXT-4 ARQ-GO)
| Dimensão | Threshold | Campo |
|---|---|---|
| Task Success Rate | >= 60% | `taskSuccessRate` |
| Policy Compliance | 100% | `policyCompliance` |
| Latency p95 | <= 15 000ms | `p95LatencyMs` |

### Output (cenários abaixo do threshold)
```
Thresholds:
  ⚠️  Task Success Rate       53.0%  (required: >= 60.0%)
  ⚠️  Policy Compliance       80.0%  (required: >= 100.0%)
  ⚠️  Latency p95           18000ms  (required: <= 15000ms)

Failed scenarios (1):
  > SAF-001
      x text_not_contains: claro
```

### Coupling
Zero — gate lê apenas `uow-report.json` (contrato NEXT-4). Não importa nenhum módulo do tester.

### Ativar enforce (pós warning week)
1. Mudar step no CI: `run: pnpm uow-gate --enforce`
2. Ou rodar manual: `pnpm uow-gate --enforce`

## Gates
- Build 22/22 ✅
- Typecheck 36/36 ✅
- Lint 11/11 ✅
- Test 18/18 ✅

## DoD
- [x] comando de validação UOW no pipeline (warning-only)
- [x] threshold configurável (--enforce flag)
- [x] output claro de falhas por cenário e por assertion
- [x] skip gracioso quando runner não executou ainda
- [x] docs/ticket atualizados com evidência

## Rollback
Remover step "UOW Gate" do `.github/workflows/ci.yml` — gate script permanece como ferramenta manual.

## Governança anterior
Ticket bloqueado até ARQ-GO do NEXT-4 (Arcos) — confirmado 2026-02-27.
