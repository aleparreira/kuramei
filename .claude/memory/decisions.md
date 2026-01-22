# Decisoes de Sessao - Kuramei

Registro de decisoes tomadas durante sessoes de desenvolvimento.

---

## 2026-01-22 - Setup Inicial

### Decisao: Nome do Projeto
- **Escolha:** Kuramei (reutilizando dominio existente)
- **Alternativas:** Seldon, AI Architecture Copilot
- **Razao:** Dominio kuramei.com ja registrado, identidade visual definida

### Decisao: Stack Backend
- **Escolha:** Python + FastAPI
- **Alternativas:** Go, Rust
- **Razao:** Ecossistema AI maduro (LangChain, OpenAI SDK)

### Decisao: Stack Frontend
- **Escolha:** Next.js + React Flow + shadcn/ui
- **Alternativas:** Vue, Svelte
- **Razao:** React Flow e a melhor lib para diagramas interativos

### Decisao: Modelo de Negocio
- **Escolha:** 100% Open Source (MIT)
- **Razao:** Objetivo estrategico EB2-NIW (impacto > receita)

### Decisao: Metamodelo
- **Escolha:** Kuramei Lens proprio + compatibilidade C4
- **Alternativas:** C4 puro, ArchiMate
- **Razao:** Liberdade para inovar (custo, simulacao) + falar lingua do mercado

---

## 2026-01-22 - Identidade e Landing

### Decisao: Dominio
- **Escolha:** kuramei.ai
- **Alternativas:** kuramei.com
- **Razao:** .ai comunica AI-first, mais memoravel

### Decisao: Titulo Profissional do Criador
- **Escolha:** Sociotechnical Systems Architect & AI Engineer
- **Alternativas:** Solutions Architect, Principal Engineer, AI Architect
- **Razao:** Escassez semantica, legitima soft skills, forte para NIW

### Decisao: Tese Central
- **Escolha:** "Building cognitive infrastructure for critical digital systems"
- **Razao:** Conecta com infraestrutura critica, beneficio nacional

### Decisao: Landing Evidence-Driven
- **Escolha:** Landing serve dois publicos (NIW + mercado) com mesmos elementos
- **Razao:** Cada elemento gera evidencia printavel E converte visitantes

### Decisao: Landing como subpasta
- **Escolha:** `landing/` dentro do monorepo kuramei
- **Alternativas:** Repo separado
- **Razao:** Facilita manutencao, deploy independente via Vercel

---

## Template

```markdown
## YYYY-MM-DD - Contexto

### Decisao: [Titulo]
- **Escolha:** [O que foi decidido]
- **Alternativas:** [O que foi considerado]
- **Razao:** [Por que essa escolha]
```
