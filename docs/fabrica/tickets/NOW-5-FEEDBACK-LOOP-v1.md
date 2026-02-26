---
ticket_id: NOW-5
status: done
gate: G3
owner: forja
branch: feat/factory-operationalization
updated_at: 2026-02-26T20:15:00Z
forum_thread_id: "1476582850273874143"
---

# NOW-5 — Feedback Loop v1 (👍/👎)

## Objetivo
Implementar coleta de feedback leve e acionável no fluxo principal.

## Escopo
- thumbs em respostas relevantes
- fluxo de negativo com opções rápidas + texto opcional
- persistência mínima para métricas

## Entrega (G3 ✅)

### Arquivos alterados
- `packages/agent-core/src/feedback.ts` — **novo**: tipos, detecção, persistência, estado pendente, textos de resposta
- `packages/agent-core/src/process-message.ts` — integração: detecção de feedback antes do agente, `feedbackKey` na `AgentResponse`

### Fluxo implementado
```
Usuário envia 👍  →  persiste feedback positivo  →  "😊 Ótimo! Fico feliz que ajudei."
Usuário envia 👎  →  persiste FEEDBACK_PENDING   →  prompt com 3 opções
Usuário envia 1/2/3 [+ texto]  →  persiste feedback negativo + limpa pending  →  "🙏 Entendido!"
```

### Persistência
- Tabela: `DYNAMODB_TABLE` (kuramei-main)
- PK: `FEEDBACK#<userId>` / SK: `<ISO timestamp>` — TTL 90 dias
- Estado pendente: PK `USER#<userId>` / SK `FEEDBACK_PENDING` — TTL 5 minutos
- Campos: `type` (positive|negative), `reason` (nao_entendeu|nao_resolveu|resposta_lenta), `note?`, `turnId`

### `AgentResponse` atualizado
```typescript
interface AgentResponse {
  text: string;
  uiLink?: string;
  feedbackKey?: string;  // ← novo: correlaciona resposta com feedback
}
```

### Gates
- Build 22/22 ✅
- Typecheck 36/36 ✅
- Lint 11/11 ✅

## Riscos conhecidos
- Sem pipeline de análise das métricas ainda — dados persistidos mas não consultados (P2, Sprint seguinte)
- Pending state usa TTL 5min — se usuário demorar mais que isso para responder a opção, o feedback é descartado silenciosamente

## Rollback
Remover a chamada `detectFeedback` no início da seção de usuário ativo em `process-message.ts` — tudo mais fica inerte.

## DoD
- [x] evento de feedback registrado
- [x] fluxo negativo com 3 opções + texto opcional
- [x] persistência mínima para métricas
- [x] doc de uso/consulta atualizado
