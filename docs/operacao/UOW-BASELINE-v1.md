# UOW Baseline — v1

Data base: 2026-02-26
Contexto: piloto inicial (20-30 pessoas previstas), sem coleta massiva ainda.

## Definições operacionais
- **p95 resposta simples**: tempo entre recebimento e resposta final para pedidos simples.
- **task success**: tarefa concluída na ótica do usuário (sem retrabalho imediato).
- **retorno 7d**: % de usuários que retornam em até 7 dias.
- **erro de memória**: usuário corrige contexto/preferência que deveria estar lembrado.

## Metas de 30 dias (aceitas)
- Ativos piloto: 15
- Retenção 7d: 25%
- Task success: 60%
- p95 resposta simples: 12s

## Coleta inicial (fase de baseline)
- p95: coleta habilitada (medição em implementação contínua)
- task success: via feedback loop (NOW-5)
- retorno 7d: por coorte de onboarding
- erro de memória: registro manual + eventos de correção

## Leitura semanal
- Frequência: sexta (Weekly Usage Review)
- Critérios de atenção:
  - task success < 50%
  - p95 > 15s por 2 ciclos
  - retorno 7d < 20%
  - aumento de erro de memória

## Observação
Baseline v1 é intencionalmente conservadora para evitar expectativa inflada no início.
