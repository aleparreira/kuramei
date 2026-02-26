# Operação — Princípios Herdados do Mercado

## Objetivo
Traduzir aprendizados de operação observados no mercado em regras operacionais do Kuramei.

---

## 1) Ferramenta não compensa operação fraca
**Regra:** estabilidade vem de processo, não de stack.

Aplicação:
- runbook de incidente obrigatório
- recuperação priorizada antes da análise profunda

---

## 2) Operação orientada por métricas
**Regra:** sem métrica, só existe percepção.

Aplicação:
- acompanhar SLOs de disponibilidade, latência e entregas
- revisar semanalmente desvios e tendência

---

## 3) Logs e rastreabilidade primeiro
**Regra:** toda falha relevante deve ser explicável por evidência.

Aplicação:
- manter logs de webhook, processor e scheduler
- correlação por ID de execução/evento quando possível

---

## 4) Custos são parte da saúde operacional
**Regra:** custo não é pós-fato; é controle contínuo.

Aplicação:
- monitorar consumo de tokens e custo por fluxo
- alertar variação anômala e investigar causa

---

## 5) Separação de ambientes é obrigatória
**Regra:** evitar mistura entre teste e produção.

Aplicação:
- manter ambiente de teste/simulador para validação
- só promover para produção após critérios mínimos

---

## 6) Segurança sem improviso
**Regra:** evitar atalhos de autenticação e configurações frágeis.

Aplicação:
- usar mecanismos oficiais de auth/secrets
- documentar exceções temporárias com plano de remoção

---

## 7) Aprendizado operacional contínuo
**Regra:** incidente repetido sem correção estrutural é falha de gestão.

Aplicação:
- post-mortem curto para P0/P1
- ação preventiva registrada antes de encerrar incidente
