# Kuramei — Execução Now / Next / Later (v1)

Base: `docs/operacao/REFINAMENTO-PRODUTO-KURAMEI-v1.md`

## NOW (execução imediata)

### NOW-4 — Runtime Contract v1 (sem if/else de intenção)
- **Owner:** Arcos
- **Objetivo:** definir contrato do runtime orientado a capacidades/policies/tools/fallback.
- **DoD:**
  - doc `docs/operacao/KURAMEI-RUNTIME-CONTRACT-v1.md`
  - estados `in_scope / edge_of_scope / out_of_scope` com exemplos
  - critérios de confiança high/medium/low formalizados
- **Risco:** voltar para roteamento por if-else implícito
- **Rollback:** manter policy atual e bloquear novas features até contrato

### NOW-5 — Feedback Loop v1 (👍/👎 + detalhe no negativo)
- **Owner:** Forja
- **Objetivo:** coletar sinal de qualidade sem fricção no canal principal.
- **DoD:**
  - evento de feedback por interação relevante
  - caminho negativo com 3 opções + texto opcional
  - armazenamento e consolidação mínima para métricas
- **Risco:** feedback virar ruído sem ação
- **Rollback:** manter somente thumbs simples temporariamente

### NOW-6 — UOW baseline instrumentation
- **Owner:** Codex
- **Objetivo:** medir UOW com dados reais (latência/task success/retorno/erro de memória).
- **DoD:**
  - baseline inicial documentada em `docs/operacao/UOW-BASELINE-v1.md`
  - métrica p95 resposta simples disponível
  - task success e retorno 7d com definição operacional
- **Risco:** decisões por feeling sem dado
- **Rollback:** manter métricas mínimas manuais por 1 semana

## NEXT (após NOW estabilizar)

### NEXT-1 — Memória mínima por usuário (fase 1)
- **Owner:** Arcos + Forja
- **Escopo:** nome preferido, tom, preferências operacionais e tópicos ativos.

### NEXT-2 — Policy híbrida de fora de escopo em produção
- **Owner:** Arcos
- **Escopo:** A (parcial+limite+próximo passo), C (clarificação), B (risco alto/ilegal).

### NEXT-3 — Telegram piloto controlado
- **Owner:** Forja
- **Escopo:** adapter básico + fallback manual + validação com 10-20 usuários.

## LATER (não entra agora)
- Compra automática
- Contabilidade completa
- Scoring/comportamento de crédito
- Ads personalizados
- Vínculo emocional avançado

## Gate de avanço
NOW só avança para NEXT quando:
- DoD completo dos 3 NOW
- sem incidente crítico de confiança/memória por 7 dias
- métricas mínimas de baseline disponíveis
