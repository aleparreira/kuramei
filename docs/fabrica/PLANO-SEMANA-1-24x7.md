# Kuramei — Plano Semana 1 (Fábrica 24/7)

## Objetivo da semana
Sair de “fábrica desenhada” para “fábrica rodando” com 1 fluxo crítico estável.

## Regra da semana
**Sem novo escopo.**
Tudo que não empurra o fluxo crítico para pronto-venda fica fora.

---

## Fluxo crítico escolhido
`Mensagem WhatsApp -> processamento -> resposta útil -> registro operacional`

---

## Dia 1 — Travar controle de execução
- Definir `Now/Next/Later` oficial
- Escolher 3 tickets máximos em `Now`
- Validar DoR dos 3 tickets
- Publicar checklist único de DoD

**Saída esperada:** backlog limpo + 3 tickets executáveis.

---

## Dia 2 — Gate 0 + Gate 1 funcionando
- Implementar preflight gate (antes de CI caro)
- Garantir build/test mínimos obrigatórios no pipeline
- Padronizar verificação de head SHA atual (evitar evidência stale)

**Saída esperada:** PR sem gate não passa.

---

## Dia 3 — Gate 2 (produto) + evidência mínima
- Definir teste funcional mínimo do fluxo crítico
- Exigir evidência verificável por ticket (não só texto de PR)
- Rodar validação ponta-a-ponta com cenário real

**Saída esperada:** cada ticket prova funcionamento real.

---

## Dia 4 — Gate 3 (governança)
- Vincular “done” à atualização de docs
- Exigir risco + rollback em toda entrega
- Fechar lacunas de rastreabilidade

**Saída esperada:** sem docs/riscos, sem fechamento.

---

## Dia 5 — Operação assistida
- Rodar fábrica em ciclo contínuo por 1 dia com monitoramento
- Medir: lead time, retrabalho, falha de gate, latência de fluxo
- Corrigir gargalo principal detectado

**Saída esperada:** fábrica operando com dados reais.

---

## Dia 6 — Hardening
- Tratar os 2 maiores pontos de fragilidade da semana
- Converter 1 incidente real em harness case
- Ajustar policy de token efficiency sem perder qualidade

**Saída esperada:** menos chance de repetição de erro.

---

## Dia 7 — Revisão brutal + plano da semana 2
- O que foi entregue de verdade
- O que foi teatro
- O que será cortado
- Novo plano com no máximo 3 prioridades

**Saída esperada:** semana 2 com foco cirúrgico.

---

## Métricas da semana 1
- Tickets concluídos com DoD completo
- Lead time médio (`Now`)
- Taxa de retrabalho
- % de tickets com evidência funcional
- Incidentes e tempo de recuperação

---

## Critério de sucesso da semana 1
- Fábrica rodou todos os dias sem perder controle
- Pelo menos 1 fluxo crítico estável ponta-a-ponta
- Processo mais simples no final da semana do que no início
