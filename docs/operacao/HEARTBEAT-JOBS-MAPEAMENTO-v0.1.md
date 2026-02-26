# Heartbeat Jobs — Mapeamento Atual vs Matrix (v0.1)

## Resumo executivo
- Jobs ativos relevantes: **15**
- Cobertura boa em: **Operação/Fábrica**
- Cobertura parcial em: **Backoffice/GTM**
- Alerta atual: **job de sync do fórum com erro (consecutiveErrors=1)**

---

## 1) Operação (produção)

### Cobertos
- **Voice Status Updater** (`411e65c3-03a2-4ae3-99d7-f32502d16439`) — 15 min
- **Cron Error Monitor → #logs** (`b413f42f-0b0b-463a-ac5f-3e0f1e0bcfc1`) — 30 min

### Parcialmente cobertos
- **Email Check** (`b5532b4a-f5cf-4a8a-9ec4-d5730f8250bb`) — 5x/dia (não é health de produção puro, mas monitora sinal operacional)

### Gap
- Falta heartbeat explícito de saúde do fluxo crítico Kuramei (webhook -> processor -> scheduler) com contrato `OK/WARN/FAIL`.

---

## 2) Fábrica (execução técnica)

### Cobertos
- **Kuramei Factory Report** (`e7e78ff3-1ed2-419a-ae71-01ba7b87f933`) — 2h
- **Kuramei Forum Sync (tickets↔md)** (`27422f04-a9ab-4c15-90a8-e14340460f22`) — 30 min

### Alerta
- `Kuramei Forum Sync` está em **error** (lastRunStatus=error, consecutiveErrors=1).

### Gap
- Falta gate heartbeat curto (30 min) que emita status consolidado de `build/typecheck/test` com contrato padrão.

---

## 3) Backoffice

### Cobertos
- **Daily Briefing** (`778e37fc-1f7b-496e-8f7a-51cd383196fb`) — diário 08:00
- **Git Auto-Sync Workspace** (`2c24c2b5-6123-4ffd-a613-8a73f646f064`) — horário

### Gap
- Falta heartbeat de backlog/decisão pendente com cadência de 1h conforme matriz.

---

## 4) GTM / Cliente

### Cobertos
- **Pesquisa Diária #pesquisa** (`6069459f-7332-4514-9f6f-8e4268841bde`) — diário (mais conteúdo que GTM operacional)

### Gap forte
- Não há heartbeat de uso/feedback/retenção em 2h conforme matriz.

---

## 5) Jobs legados / fora do escopo Kuramei
- Prep Truelogic (2 one-shots)
- Token Usage Tracking (diário)
- Vetor Radar (desativados)
- supabase-keep-alive-med-dossie (desativado)

---

## 6) Ações recomendadas (ordem)
1. Corrigir imediatamente `Kuramei Forum Sync` (erro ativo)
2. Criar heartbeat de saúde do fluxo crítico Kuramei (15 min)
3. Criar heartbeat Backoffice (1h)
4. Criar heartbeat GTM mínimo (2h)

---

## 7) Critério de aderência à matriz
Aderência considerada ok quando:
- cada contexto tem pelo menos 1 heartbeat ativo,
- todos os heartbeats emitem contrato padrão,
- nenhum job crítico com `consecutiveErrors > 0` por 2 ciclos.
