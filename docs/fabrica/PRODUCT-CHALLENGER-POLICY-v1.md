# Product Challenger Policy v1

## Objetivo
Garantir dissenso qualificado antes de transformar ideia em ticket de execução.

## Papel
**Product Challenger**: função obrigatória de crítica técnica/produto.

Responsável inicial: **Arcos** (modo crítico).
Fallback: **Codex**.

## Regra de entrada em NOW
Nenhuma feature entra em NOW sem passar pelo Challenger Review.

---

## Challenger Review (5 perguntas obrigatórias)
1. Qual dor real do usuário isso resolve?
2. Qual risco de UX/confiança essa feature introduz?
3. Qual risco legal/compliance existe?
4. Qual custo de manutenção vs valor entregue?
5. Por que isso entra agora e não depois?

---

## Resultado possível do review
- **GO**: entra em NOW
- **GO com corte**: entra reduzido
- **HOLD**: vai para NEXT/LATER
- **NO-GO**: descartado

---

## Formato obrigatório do parecer
```
[CHALLENGER REVIEW]
- Feature: <nome>
- Veredito: GO | GO com corte | HOLD | NO-GO
- Risco principal: <...>
- Corte recomendado: <...>
- Condição para avançar: <...>
```

---

## Guardrail
Se o parecer for **HOLD/NO-GO**, só pode avançar com decisão explícita do Xande registrada no canal oficial da fábrica.
