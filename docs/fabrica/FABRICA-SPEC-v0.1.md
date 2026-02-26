# Kuramei — Contexto Fábrica (Spec v0.1)

## Objetivo
Transformar ideias em incrementos vendáveis com cadência contínua, qualidade mínima garantida e zero teatro de produtividade.

---

## 1) Missão da Fábrica
A Fábrica existe para:
- construir features reais,
- validar com uso real,
- corrigir rápido,
- repetir sem acumular dívida tóxica.

Não existe para:
- produzir documentação vazia,
- inflar backlog,
- otimizar para vaidade técnica.

---

## 2) Unidade de trabalho
Cada ciclo de fábrica trabalha com **1 ticket executável** contendo:
- problema
- resultado esperado
- critério de pronto (DoD)
- risco
- rollback

Sem esses 5 itens, ticket não entra em execução.

---

## 3) Pipeline obrigatório (DoR → DoD)
### DoR (Definition of Ready)
Ticket só entra quando:
- [ ] escopo fechado (o que entra / o que não entra)
- [ ] impacto esperado definido
- [ ] métrica de validação escolhida

### Execução
1. Design técnico mínimo
2. Implementação
3. Testes
4. Atualização de docs
5. Validação funcional

### DoD (Definition of Done)
Só está concluído quando:
- [ ] build passou
- [ ] testes relevantes passaram
- [ ] fluxo principal validado ponta-a-ponta
- [ ] docs atualizada em `docs/`
- [ ] decisão/risco registrado

---

## 4) Ritmo e cadência
- Ciclo padrão: **diário**
- Entrega mínima: **1 incremento testável por dia útil**
- Revisão semanal: o que gerou valor vs o que foi ruído

> Adversarial note: sem entrega testável frequente, “fábrica” vira só sensação de progresso.

---

## 5) Papéis na Fábrica (time de agentes)
- **Arcos:** arquitetura e cortes de escopo
- **Forja:** implementação e testes
- **Codex:** priorização, QA funcional, aceite final
- **Scout/Vetor:** só entram quando houver demanda de GTM/conteúdo

Regra: 1 dono por ticket. Sem dono = sem execução.

---

## 6) Qualidade mínima inegociável
- Sem merge com build quebrado
- Sem feature sem teste mínimo do fluxo principal
- Sem deploy sem rollback descrito
- Sem “depois a gente documenta”

---

## 7) Gestão de backlog
Backlog com 3 estados apenas:
- **Now** (até 3 itens)
- **Next** (até 7 itens)
- **Later** (resto)

Se tudo vira prioridade, nada é prioridade.

---

## 8) Métricas da Fábrica
Acompanhar semanalmente:
- lead time por ticket
- % tickets concluídos com DoD completo
- taxa de retrabalho
- bugs por entrega
- tempo médio de recuperação (quando quebra)

---

## 9) Anti-padrões (proibidos)
- abrir múltiplas frentes sem fechar nenhuma
- refatoração ampla sem motivação de negócio
- tarefa “pesquisa” sem data de decisão
- aceitar escopo ambíguo

---

## 10) Definition of Factory Ready
A Fábrica está saudável quando:
- entrega diária testável acontece,
- qualidade mínima é respeitada,
- backlog está controlado,
- docs acompanha código,
- e a taxa de retrabalho não cresce por 2 semanas seguidas.
