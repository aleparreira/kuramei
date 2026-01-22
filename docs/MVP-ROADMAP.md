# MVP Roadmap - 5-7 Semanas

Roadmap para o MVP do Kuramei com foco em: **Landing → Chat → Diagrama → Custo → Terraform**

---

## Visão do MVP

**Objetivo**: Demonstrar o valor core do Kuramei com um fluxo funcional end-to-end.

**Domínio**: kuramei.ai

```
Landing (kuramei.ai) → Demo → GitHub
                    ↓
Usuário descreve cenário → IA interpreta e faz perguntas →
Modelo gerado → Visualização React Flow → Estimativa de custo → Export Terraform
```

---

## Semana 0: Landing Page (kuramei.ai)

### Objetivo
Landing evidence-driven online para dois públicos: mercado (CTOs, arquitetos) e EB2-NIW (prova de autoria).

### Tasks

| Task | Descrição | Critério de Aceite |
|------|-----------|-------------------|
| 0.1 | Setup Next.js em `landing/` | `npm run dev` funcionando |
| 0.2 | Tema Kuramei (Coral, Aqua, etc.) | Cores aplicadas |
| 0.3 | Hero section bilíngue (EN/PT) | Toggle de idioma funcional |
| 0.4 | Seção "What it does" (3 cards) | Chat, Visualize, Export |
| 0.5 | Seção "About the Creator" | Nome, título, credenciais, links |
| 0.6 | Footer com MIT License | Copyright + links |
| 0.7 | Deploy Vercel + domínio kuramei.ai | Site live |
| 0.8 | Meta tags OG (social sharing) | Preview correto no LinkedIn/X |

### Estrutura da Landing

```
┌─────────────────────────────────────────────────┐
│  [EN] [PT]                         [GitHub ★]   │
├─────────────────────────────────────────────────┤
│  HERO                                           │
│  Kuramei                                        │
│  "AI-powered architecture decision-making"      │
│  Chat → Diagram → Cost → Terraform              │
│  [Try Demo]  [View on GitHub]                   │
│  ─────────────────────────────────────────────  │
│  Created by Alexandre Parreira                  │
│  Sociotechnical Systems Architect & AI Engineer │
│  30+ years | Founder @Kaltam AI                 │
│  [LinkedIn] [GitHub] [X]                        │
└─────────────────────────────────────────────────┘
│  WHAT IT DOES (3 cards)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Describe │ │Visualize│ │ Export  │           │
│  │ in chat │ │ & cost  │ │Terraform│           │
│  └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────┘
│  DEMO (GIF ou video embed - quando disponível)  │
└─────────────────────────────────────────────────┘
│  WHO IT'S FOR                                   │
│  • Solutions Architects                         │
│  • CTOs evaluating cloud strategies             │
│  • Teams needing cost visibility                │
└─────────────────────────────────────────────────┘
│  OPEN SOURCE                                    │
│  MIT License • Built in public                  │
│  "Clarity emerges."                             │
└─────────────────────────────────────────────────┘
│  FOOTER                                         │
│  © 2026 Alexandre Parreira | Kaltam AI          │
└─────────────────────────────────────────────────┘
```

### Entregável
- kuramei.ai online com informações do projeto e criador
- Evidence-driven: autoria clara, screenshot-friendly
- Bilíngue (EN default, PT toggle)

---

## Semana 1: Fundamentos

### Objetivo
Schema + API + React Flow básico funcionando.

### Tasks

| Task | Descrição | Critério de Aceite |
|------|-----------|-------------------|
| 1.1 | Setup projeto Python + FastAPI | `uvicorn` rodando, endpoint `/health` |
| 1.2 | Schema SQLite (Project, Model, Node, Edge) | Alembic migrations funcionando |
| 1.3 | API CRUD básica | POST/GET projects, models, nodes, edges |
| 1.4 | Setup Next.js + Tailwind + shadcn em `frontend/` | `npm run dev` funcionando |
| 1.5 | Tema Kuramei no shadcn | Cores aplicadas (Coral, Aqua, etc.) |
| 1.6 | React Flow integrado | Canvas renderiza, cria nós com clique |
| 1.7 | Persistência básica | Salvar/carregar grafo do backend |

### Entregável
- Canvas React Flow onde você pode criar/editar nós e salvar no backend
- Tema Kuramei aplicado

---

## Semana 2: Chat + ChangeSet

### Objetivo
Chat funcional que modifica o modelo.

### Tasks

| Task | Descrição | Critério de Aceite |
|------|-----------|-------------------|
| 2.1 | Schema Conversation, Message, ChangeSet | Migrations |
| 2.2 | API de chat | POST /conversations, POST /messages |
| 2.3 | UI de chat no frontend | Componente de chat ao lado do canvas |
| 2.4 | Integração LLM (Claude/OpenAI) | Chat funciona com respostas |
| 2.5 | Parser de operações | LLM retorna operações estruturadas |
| 2.6 | Aplicar ChangeSet | Operações modificam o modelo |
| 2.7 | Sync canvas após mudança | React Flow atualiza automaticamente |

### Entregável
- Usuário descreve: "crie um serviço API e um banco Postgres"
- Sistema aplica mudanças e mostra no canvas

---

## Semana 3: Zoom Semântico + Custo

### Objetivo
Navegação por níveis e estimativa de custo.

### Tasks

| Task | Descrição | Critério de Aceite |
|------|-----------|-------------------|
| 3.1 | Adicionar level e parent_node_id | Schema atualizado |
| 3.2 | Endpoint subgrafo por level | GET /models/{id}/graph?level=L1 |
| 3.3 | UI toggle de níveis | Botões L0/L1/L2/L3 |
| 3.4 | Drill-down por clique | Clica em nó, mostra filhos |
| 3.5 | Breadcrumbs de navegação | Mostra onde está (L0 > API > Services) |
| 3.6 | Integração AWS Pricing API | Função para buscar preços |
| 3.7 | Custo no Node | Calcula e mostra custo estimado |
| 3.8 | Custo total no Model | Soma e mostra no header |

### Entregável
- Navegação zoom semântico funcional
- Custo estimado exibido em cada nó e total

---

## Semana 4: Terraform Export + Polish

### Objetivo
Export funcional e UX refinada.

### Tasks

| Task | Descrição | Critério de Aceite |
|------|-----------|-------------------|
| 4.1 | Templates Terraform (Jinja2) | Templates para service, database, vpc |
| 4.2 | Geração de arquivos .tf | Modelo → arquivos Terraform |
| 4.3 | Preview de diff | Mostra arquivos gerados na UI |
| 4.4 | Download como ZIP | Botão para baixar Terraform |
| 4.5 | Validações básicas | Bloqueia export se modelo inválido |
| 4.6 | Ícones cloud nos nós | AWS/Azure icons nos nodes |
| 4.7 | Edges com curvas | Bezier curves, não linhas retas |
| 4.8 | Animação de fluxo | Sutil animação nas edges |
| 4.9 | Dark mode | Toggle dark/light |

### Entregável
- Export Terraform funcional
- Diagramas visualmente bonitos
- UX polida

---

## Semanas 5-6: Hardening + Launch

### Objetivo
Preparar para lançamento público.

### Tasks

| Task | Descrição | Critério de Aceite |
|------|-----------|-------------------|
| 5.1 | README completo | Como rodar, como usar, screenshots |
| 5.2 | Docker compose | Setup one-click para dev |
| 5.3 | Testes básicos | API e componentes críticos |
| 5.4 | GitHub Actions CI | Build e test automático |
| 5.5 | Demo GIF/video | Adicionar na landing |
| 5.6 | Atualizar landing com demo | kuramei.ai com GIF funcional |
| 5.7 | Post de lançamento | X + LinkedIn (via /voice) |

### Entregável
- Projeto pronto para uso público
- Landing com demo visual
- Anúncio nas redes

---

## Estrutura de Pastas Final

```
kuramei/
├── landing/              # kuramei.ai (Semana 0)
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
├── backend/              # Python + FastAPI (Semana 1+)
│   ├── main.py
│   ├── core/
│   ├── adapters/
│   └── api/
├── frontend/             # App React Flow (Semana 1+)
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
├── docs/
└── docker-compose.yml
```

---

## O que Fica DE FORA do MVP

| Feature | Razão | Quando |
|---------|-------|--------|
| GitHub PR automático | Complexidade auth | v0.2 |
| Policies como entidade | Over-engineering | v0.2 |
| Multi-user/colaboração | Complexidade | v0.3 |
| SSO/RBAC | Enterprise | v1.0 |
| Import Terraform state | Complexidade | v0.3 |
| Import C4 | Secundário | v0.2 |
| Advisors especializados | Pós-core | v0.3 |

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Chat → ChangeSet inconsistente | JSON schema estrito, validação server-side |
| Terraform gerado quebrado | Escopo limitado (2-3 recursos), templates testados |
| Zoom semântico confuso | Breadcrumbs, regra simples (parent_node_id) |
| React Flow estado vs backend | Backend como source of truth, recarregar após ops |
| Custo impreciso | Label "estimated", mostrar assumptions |
| Landing não converte | A/B test copy, CTA claro para GitHub |

---

## Métricas de Sucesso MVP

### Produto
- [ ] Chat funciona para 5-10 cenários diferentes
- [ ] Diagrama gerado é visualmente claro
- [ ] Custo estimado com precisão razoável (±30%)
- [ ] Export Terraform executa `terraform plan` sem erro
- [ ] Tempo de resposta < 5 segundos

### Tração (EB2-NIW)
- [ ] Landing kuramei.ai online
- [ ] GitHub stars > 50 no primeiro mês
- [ ] Pelo menos 3 posts X/LinkedIn sobre o projeto
- [ ] Pelo menos 1 pessoa externa usa e dá feedback

---

## Timeline Visual

```
Semana 0   │ Landing kuramei.ai
           │ ████████████████████
Semana 1   │ Backend + Frontend básico
           │ ████████████████████
Semana 2   │ Chat + ChangeSet
           │ ████████████████████
Semana 3   │ Zoom + Custo
           │ ████████████████████
Semana 4   │ Terraform + Polish
           │ ████████████████████
Semana 5-6 │ Hardening + Launch
           │ ████████████████████████████████████████
```
