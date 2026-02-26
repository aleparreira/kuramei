# Sync Spec v0.1 — Fórum (Discord) ↔ Fonte (Markdown)

## Objetivo
Manter tickets do fórum sincronizados com os arquivos oficiais em `docs/fabrica/tickets/`.

## Princípio
- **Fonte de verdade:** Markdown (`.md`)
- **Fórum:** espelho operacional (comunicação/andamento)

---

## 1) Metadados obrigatórios no topo de cada ticket
Adicionar no início de cada arquivo:

```md
---
ticket_id: NOW-1
status: now        # now|blocked|done
gate: G1           # G0|G1|G2|G3
owner: codex
updated_at: 2026-02-26T10:45:00Z
forum_thread_id: 1476528280856170669
---
```

Sem esses campos, o sync não processa o ticket.

---

## 2) Mapeamento arquivo ↔ tópico
- `forum_thread_id` no frontmatter é o vínculo canônico.
- Se faltar `forum_thread_id`, job de sync gera alerta (não cria tópico automaticamente).

---

## 3) Fluxo de atualização
1. Atualizar estado no `.md` (status/gate/updated_at)
2. Commit/local save
3. Job de sync detecta mudança
4. Job publica update no tópico correspondente

Regra: mudança só é oficial quando está no `.md`.

---

## 4) Formato de update automático no fórum
```md
[SYNC]
- Ticket: NOW-1
- Status: now
- Gate: G1
- Owner: codex
- Updated at: 2026-02-26T10:45:00Z
- Fonte: docs/fabrica/tickets/NOW-1-GATE-DE-TESTES.md
```

---

## 5) Estado visual no fórum (sem depender de tags)
Como fallback robusto, usar prefixo no título:
- `[NOW] ...`
- `[BLOCKED] ...`
- `[DONE] ...`

Se API/permissão permitir tags de fórum, usar também; se não, prefixo é obrigatório.

---

## 6) Cron de sync (proposto)
- Frequência: a cada 30 min
- Ações:
  - ler todos os `docs/fabrica/tickets/*.md`
  - comparar `updated_at` com último snapshot
  - publicar update apenas nos alterados
  - registrar erros de sync no canal de logs

---

## 7) Falhas e recuperação
- Thread inexistente ou arquivada: marcar ticket como `blocked` + alertar
- Frontmatter inválido: alertar e ignorar ticket
- Erro de envio Discord: retry 1x e registrar incidente

---

## 8) Critério de sucesso
- Qualquer alteração oficial em ticket aparece no tópico em até 30 min
- Nenhum ticket ativo fica sem mapeamento de thread
- Histórico no fórum reflete estado atual da fonte
