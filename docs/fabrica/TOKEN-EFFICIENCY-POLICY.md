# Fábrica — Token Efficiency Policy

## Objetivo
Economizar tokens sem sacrificar qualidade, segurança ou rastreabilidade.

---

## 1) Quando economizar agressivamente
Use modo enxuto quando:
- tarefa é reversível e de baixo impacto
- resultado é determinístico
- não há risco operacional relevante

Práticas:
- evitar releitura imediata do que acabou de escrever
- evitar reexecução de comando já conclusivo
- agrupar edições relacionadas
- evitar tool call redundante
- responder de forma curta e direta

---

## 2) Quando validar (não economizar)
Validação é obrigatória quando:
- mudança afeta produção/operação
- há risco de regressão
- há ação destrutiva ou sensível
- resultado é ambíguo ou incerto

Práticas:
- executar teste crítico mínimo
- confirmar estado final em fluxo real
- registrar decisão, risco e rollback

---

## 3) Regra de ouro
**Economizar tokens nunca pode criar dívida oculta.**

Se a economia aumenta o risco de erro silencioso, validar primeiro.

---

## 4) Checklist rápido por tarefa
- [ ] É baixo impacto? (se não, validar)
- [ ] O resultado é inequívoco? (se não, validar)
- [ ] Existe rollback claro? (se não, validar)
- [ ] Precisa de rastreabilidade futura? (se sim, registrar resumo)

---

## 5) Política de resumo
- Não resumir execução trivial.
- Resumir sempre quando houver:
  - decisão de arquitetura
  - risco assumido
  - workaround temporário
  - incidente ou correção sensível
