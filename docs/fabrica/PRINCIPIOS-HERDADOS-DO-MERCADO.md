# Fábrica — Princípios Herdados do Mercado

## Objetivo
Capturar apenas os princípios úteis observados em criadores/operadores de OpenClaw e converter em regra de execução para o Kuramei.

---

## 1) Anti-hype como disciplina de produto
**Regra:** não construir por tendência; construir por problema recorrente de usuário.

Aplicação prática:
- cada feature deve apontar para um caso de uso real validado
- sem caso real, não entra no ciclo

---

## 2) Automação antes de ferramenta
**Regra:** primeiro definir o que automatizar, depois escolher stack.

Aplicação prática:
- ticket só entra com problema + resultado esperado + métrica
- evitar mudança de arquitetura sem ganho operacional explícito

---

## 3) Contexto e memória são multiplicadores reais
**Regra:** qualidade do agente depende de contexto vivo e memória útil.

Aplicação prática:
- manter docs e memória atualizadas no mesmo ciclo de entrega
- registrar erros recorrentes e correções para evitar regressão

---

## 4) Operação como sistema (não como improviso)
**Regra:** observabilidade, custos, logs e recuperação são parte do produto.

Aplicação prática:
- monitorar latência, falhas e entrega de lembretes
- registrar incidentes com causa raiz e ação preventiva

---

## 5) Sem promessa mágica
**Regra:** “1000x melhor instantâneo” é narrativa, não engenharia.

Aplicação prática:
- comunicar ganhos com dados de antes/depois
- tratar toda melhoria como hipótese até validação real

---

## 6) Segurança sem atalhos obscuros
**Regra:** não depender de loophole/workaround frágil para operação crítica.

Aplicação prática:
- privilegiar fluxos oficiais de auth/configuração
- workaround só com plano de substituição e risco documentado

---

## 7) Critério de entrada na Fábrica
Só entra em execução o que passa em 3 filtros:
1. resolve dor real
2. cabe no ciclo atual
3. tem validação objetiva

Se falhar em qualquer um, volta para backlog.
