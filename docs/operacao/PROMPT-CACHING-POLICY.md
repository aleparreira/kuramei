# Operação — Prompt Caching Policy

## Objetivo
Reduzir custo e latência sem comprometer evolução de produto.

---

## 1) Princípios
1. Prompt cache é prefix match: qualquer mudança no prefixo quebra cache.
2. Ordem importa: conteúdo estático primeiro, dinâmico por último.
3. Cache é métrica operacional (não detalhe de implementação).

---

## 2) Layout padrão de prompt (Kuramei)
1. System prompt base (estável)
2. Definições de tools (ordem determinística)
3. Contexto de produto/projeto estável
4. Contexto de sessão
5. Mensagens da conversa (mais dinâmico)

Regra: evitar inserir dado volátil no bloco estático (ex.: timestamp detalhado).

---

## 3) Regras obrigatórias
- Não trocar modelo no meio da sessão.
- Não adicionar/remover tools no meio da sessão.
- Não embaralhar ordem de tools entre turns.
- Mudanças contextuais devem ir em mensagem (system reminder), não reescrever prompt base.

---

## 4) Compaction cache-safe
Quando compactar contexto:
- manter mesmo system prompt + tools + estrutura do prefixo da conversa mãe,
- anexar instrução de compactação como nova mensagem,
- evitar chamada “paralela” com prompt diferente para resumir, pois quebra cache e explode custo.

---

## 5) Métricas mínimas (monitorar semanalmente)
- Prompt cache hit rate (%)
- Latência p95 por turno
- Custo por turno (input/output)

Alerta recomendado:
- queda abrupta de hit rate (>10 pontos percentuais) = incidente operacional a investigar.

---

## 6) Guardrail adversarial
Não sacrificar roadmap por cache.

Aplicar otimização de cache quando:
- não atrasa entrega crítica,
- não aumenta complexidade de manutenção,
- melhora custo/latência de forma mensurável.

Se não cumprir os 3, adiar otimização.

---

## 7) Checklist de implementação
- [ ] Ordem de prompt estável definida
- [ ] Ordem de tools determinística
- [ ] Proibição de troca de modelo intra-sessão registrada
- [ ] Policy de compaction cache-safe registrada
- [ ] Dashboard simples com hit rate / p95 / custo por turno
