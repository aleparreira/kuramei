# Agents Memory Audit v0.1 (Forja, Arcos, Vetor, Scout, Main, Codex)

## Objetivo
Reduzir ruído de contexto sem perder conhecimento útil para operar a fábrica do Kuramei.

## Critério
- KEEP: necessário para operação atual Kuramei
- ARCHIVE: histórico útil, mas não deve entrar no contexto ativo
- DROP: instrução/nota obsoleta ou conflitante

---

## Forja
### KEEP
- AGENTS.md com papel de execução técnica
- MEMORY.md focada em estado atual do Kuramei
- memória de decisões técnicas recentes de sprint

### ARCHIVE
- referências antigas de projetos fora do foco (MED Dossiê, Keppr)
- notas de migração Slack->TUI e experimentos passados

### DROP
- trechos de AGENTS com contexto de canal legado sem uso

---

## Arcos
### KEEP
- ADRs e decisões arquiteturais fechadas do Kuramei
- briefings de sprint ainda válidos para roadmap atual

### ARCHIVE
- análises comparativas antigas que não mudam decisão atual
- notas exploratórias de ferramentas sem impacto no plano de 30 dias

### DROP
- itens de discussão já resolvidos e duplicados entre arquivos

---

## Vetor
### KEEP
- identidade do agente
- memória mínima de colaboração com fábrica (quando acionado)

### ARCHIVE
- histórico do projeto Vetor em hold
- radar antigo desativado

### DROP
- instruções operacionais de canal/ritual descontinuado

---

## Scout
### KEEP
- identidade e função de carreira (uso sob demanda)

### ARCHIVE
- workflows antigos específicos de MED Dossiê

### DROP
- instruções de venda/outreach não alinhadas com foco Kuramei

---

## Main (Akathom)
### KEEP
- jobs úteis de operação e monitoramento

### ARCHIVE
- jobs de iniciativas pausadas ou fora de escopo Kuramei

### DROP
- cron legado desativado que só gera ruído cognitivo na manutenção

---

## Codex
### KEEP
- OPENCLAW-OPS.md
- docs de fábrica/operação/heartbeat criadas nesta fase

### ARCHIVE
- notas temporárias de troubleshooting já resolvidas

### DROP
- qualquer duplicata de regra que conflite com docs oficiais do Kuramei

---

## Riscos identificados
1) AGENTS de forja/arcos/scout ainda carregam referências de projetos antigos.
2) Memórias ricas (especialmente Arcos) estão úteis, mas precisam separação clara de "ativo" vs "arquivo".
3) Jobs legados do main podem continuar poluindo percepção de status se não forem classificados.

---

## Plano de execução seguro (sem perda)
1. Criar pasta `memory/archive/` em cada workspace (forja/arcos/vetor/scout).
2. Mover arquivos não ativos para archive (sem deletar).
3. Enxugar MEMORY.md de cada agente para 1 página de estado atual.
4. Revisar AGENTS.md e remover referências legadas de projetos/canais antigos.
5. Rodar checklist pós-limpeza:
   - sem conflito de instruções
   - sem referência operacional a Slack
   - papel de cada agente claro em <= 10 linhas

## Política de retenção
- Ativo: últimos 30–45 dias e decisões em vigor
- Arquivo: histórico completo preservado
- Deleção: somente após revisão humana explícita
