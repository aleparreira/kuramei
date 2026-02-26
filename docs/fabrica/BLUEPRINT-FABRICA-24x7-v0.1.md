# Kuramei — Blueprint Fábrica 24/7 (v0.1)

## Objetivo
Operar evolução contínua do Kuramei com segurança, previsibilidade e foco em entrega vendável.

---

## 1) Escopo único
- Produto: **Kuramei**
- Regra: nenhuma frente paralela compete com o ciclo principal.

---

## 2) Loop 24/7 (ciclo padrão)
1. Selecionar 1 ticket (Now)
2. Executar implementação
3. Rodar gates obrigatórios
4. Atualizar docs
5. Validar fluxo funcional
6. Fechar com decisão (ship / ajustar / rollback)

Sem fechar o ciclo, não abre novo ticket.

---

## 3) Gates obrigatórios
### Gate 0 — Preflight (antes de CI caro)
- contrato/política válida
- estado de review compatível com HEAD atual
- sem bloqueio conhecido

### Gate 1 — Qualidade
- build ok
- testes mínimos relevantes ok

### Gate 2 — Produto
- fluxo principal da mudança validado
- evidência mínima registrada

### Gate 3 — Governança
- docs atualizada
- risco + rollback explícitos

---

## 4) Papéis dos agentes
- **Arcos**: define cortes e risco arquitetural
- **Forja**: implementa e testa
- **Codex**: orquestra, valida, decide aceite
- **Scout/Vetor**: sob demanda, fora do miolo da fábrica

Regra: 1 dono por ticket.

---

## 5) Política de execução
- “Done” só com DoD completo
- sem merge com evidência stale (SHA antigo)
- sem bypass de gate
- sem otimização prematura que atrase entrega

---

## 6) SLO da fábrica
- 1 incremento testável por dia útil
- lead time de ticket Now: <= 24h (meta)
- retrabalho em alta por 2 semanas = ação corretiva obrigatória

---

## 7) Janela humana de controle
- 1 checkpoint diário (10–15 min)
- decisões sensíveis (escopo, risco, rollback) passam por checkpoint

---

## 8) Incidentes da fábrica
Se quebrar:
1. mitigar
2. restaurar fluxo
3. registrar causa raiz
4. criar caso de harness para não repetir

---

## 9) Backlog operacional
- **Now**: até 3 tickets
- **Next**: até 7
- **Later**: restante

Se ultrapassar limite, parar intake e priorizar.

---

## 10) Critério de sucesso (30 dias)
- cadência estável sem travar
- redução de retrabalho
- melhora de latência/custo sem sacrificar qualidade
- avanço concreto para “pronto pra vender”
