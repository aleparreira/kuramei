# Kuramei - AI Architecture Platform

## Identidade

**Nome**: Kuramei (倉明 = "armazém de luz/conhecimento")
**Framework**: Kuramei Lens
**Tagline**: "Clarity emerges."
**Licença**: MIT (100% open source)
**Domínio**: kuramei.com

---

## Visão

Plataforma de arquitetura de soluções AI-first que permite:
- Criar arquiteturas via conversa com IA
- Visualizar com zoom semântico (CEO → CTO → Dev)
- Simular custos em tempo real (AWS/Azure pricing APIs)
- Exportar para Terraform, C4, ArchiMate

**Killer Feature MVP**: Chat → Diagrama → Custo

---

## Stack Técnico

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16 + React 19 + Tailwind 4 |
| UI | shadcn/ui (tema Kuramei) |
| Diagramas | React Flow (customizado) |
| Backend | Python + FastAPI |
| Database | SQLite → PostgreSQL |
| IA | Multi-provider (OpenAI, Anthropic, Ollama) |
| Deploy | Docker (cloud-agnostic) |

---

## Identidade Visual

| Token | Valor | Uso |
|-------|-------|-----|
| `--background` | `#f9f9fe` | Canvas (off-white azulado) |
| `--foreground` | `#454360` | Ink (texto principal) |
| `--primary` | `#ff4c60` | Coral (CTAs, destaques) |
| `--secondary` | `#65ebe7` | Aqua (links, interativos) |
| `--muted` | `#596172` | Mist (texto secundário) |

**Componentes**: shadcn/ui style: new-york, customizado com paleta Kuramei

---

## Kuramei Lens (Framework Conceitual)

Metamodelo próprio com compatibilidade C4.

### Entidades Core

- **Node**: Elementos do grafo (service, database, queue, etc.)
- **Edge**: Conexões (calls, reads, writes, etc.)
- **Model**: Snapshot versionável da arquitetura
- **Project**: Container de modelos

### Zoom Semântico

| Level | Visão | Público |
|-------|-------|---------|
| L0 | Sistema inteiro | CEO |
| L1 | Domínios | CTO |
| L2 | Serviços | Arquiteto |
| L3 | Infraestrutura | DevOps |

### Compatibilidade C4

Export/import para C4 (Context, Container, Component, Deployment).

---

## Estrutura do Projeto

```
kuramei/
├── CLAUDE.md           # Este arquivo
├── .claude/
│   ├── guardrails.md   # Checklist de implementação
│   └── rules/          # Regras específicas
├── backend/            # Python + FastAPI
│   ├── core/           # Lógica agnóstica
│   └── adapters/       # DB, LLM, Storage
├── frontend/           # Next.js + React Flow
├── docs/               # Documentação pública
└── docker-compose.yml  # Dev local
```

---

## Metodologia

**Workflow**: flow-next

```
1. /flow-next:plan <feature>
2. /flow-next:work fn-N
3. codex review --base main (ou fallback Claude)
4. PR + merge
```

---

## Objetivo Estratégico

**Build in Public** para case EB2-NIW:
- 100% open source (MIT)
- Commits públicos frequentes
- Divulgação X + LinkedIn
- Atrair contribuidores e reconhecimento

---

## Status Atual

**Data**: 2026-01-22
**Fase**: Setup inicial

### Próximos Passos

1. [ ] Inicializar repositório Git
2. [ ] Setup backend Python + FastAPI
3. [ ] Setup frontend Next.js + shadcn
4. [ ] Implementar MVP (Chat → Diagrama → Custo)
