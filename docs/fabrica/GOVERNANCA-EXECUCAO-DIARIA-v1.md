# Governança de Execução Diária — Kuramei (v1)

## Objetivo
Operar a fábrica com previsibilidade diária, sem dispersão e sem decisões implícitas.

## Cadência diária (obrigatória)

### 1) Abertura (manhã, 10 min)
Responder no canal oficial (#forja):
- Bloqueio atual
- Entrega prevista do dia
- Risco aberto

Formato:
```
[CHECKPOINT AM]
- Bloqueio: <...>
- Entrega do dia: <...>
- Risco: <...>
- Decisão: continuar|ajustar|pausar
```

### 2) Operação contínua (durante o dia)
- Executar apenas tickets em `Now`
- Registrar cada gate (G0→G3) no tópico do ticket
- Sem gate completo, sem avanço de estado

### 3) Fechamento (fim do dia, 10 min)
Responder no canal oficial (#forja):
- O que foi entregue
- O que ficou bloqueado
- Ação recomendada para amanhã

Formato:
```
[CHECKPOINT PM]
- Entregue: <...>
- Bloqueado: <...>
- Risco residual: <...>
- Próximo passo: <...>
```

---

## Regras de decisão
1. **Sem owner = sem execução**
2. **Sem docs atualizada = sem done**
3. **Sem rollback definido = sem ship**
4. **2 dias sem entrega = corte de escopo obrigatório**
5. **Erro repetido 2x = ação estrutural obrigatória**

---

## RACI operacional (enxuto)
- **Codex (A/R):** orquestração, priorização, aceite final
- **Forja (R):** implementação/testes
- **Arcos (C):** arquitetura/risco técnico
- **Xande (A):** decisão de escopo e prioridade final

---

## KPIs diários mínimos
- Tickets `Now` concluídos
- % com DoD completo
- Retrabalho (sim/não + motivo)
- Falhas de gate

---

## Definição de dia bom
- houve entrega testável,
- risco foi explicitado,
- próximo passo ficou claro.
