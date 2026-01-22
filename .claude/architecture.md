# Arquitetura - Projeto Kuramei

## Visao Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Chat     │  │ React Flow  │  │     Cost Panel      │  │
│  │  Interface  │  │   Canvas    │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                         │                                    │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────┼───────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Chat      │  │   Model     │  │    Export           │  │
│  │  Service    │  │  Service    │  │   Service           │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────┬───────────┘  │
│         │                │                   │              │
│         ▼                ▼                   ▼              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Core Domain                        │   │
│  │   (Node, Edge, Model, ChangeSet, Conversation)       │   │
│  └──────────────────────────┬──────────────────────────┘   │
│                             │                               │
│  ┌──────────────────────────┼──────────────────────────┐   │
│  │                    Adapters                          │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────┐ │   │
│  │  │ SQLite │  │  LLM   │  │  AWS   │  │ Terraform  │ │   │
│  │  │   DB   │  │Provider│  │Pricing │  │  Template  │ │   │
│  │  └────────┘  └────────┘  └────────┘  └────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Pastas

```
kuramei/
├── backend/                    # Python + FastAPI
│   ├── main.py                 # Entrypoint
│   ├── core/                   # Logica de dominio (agnóstica)
│   │   ├── models.py           # Pydantic models (Node, Edge, etc.)
│   │   ├── services/           # Business logic
│   │   │   ├── chat.py         # Chat → ChangeSet
│   │   │   ├── model.py        # CRUD de modelos arquiteturais
│   │   │   └── export.py       # Terraform, C4 export
│   │   └── validators.py       # Validacoes de dominio
│   ├── adapters/               # Integrações externas
│   │   ├── db/                 # SQLite/PostgreSQL
│   │   ├── llm/                # OpenAI, Anthropic, Ollama
│   │   ├── pricing/            # AWS, Azure pricing APIs
│   │   └── templates/          # Jinja2 para Terraform
│   ├── api/                    # HTTP layer
│   │   ├── routes/             # Endpoints por domínio
│   │   └── deps.py             # Dependency injection
│   └── requirements.txt
│
├── frontend/                   # Next.js
│   ├── src/
│   │   ├── app/                # App router (pages, layouts)
│   │   ├── components/         # Componentes React
│   │   │   ├── chat/           # Interface de chat
│   │   │   ├── canvas/         # React Flow nodes/edges
│   │   │   └── panels/         # Cost, properties, etc.
│   │   └── lib/                # API client, utils
│   └── package.json
│
├── docs/                       # Documentacao publica
│   ├── VISION.md
│   ├── METAMODEL.md
│   ├── MVP-ROADMAP.md
│   ├── DECISIONS.md
│   ├── C4-MAPPING.md
│   └── DESIGN-SYSTEM.md
│
└── docker-compose.yml          # Dev local
```

---

## Separacao de Responsabilidades

### Backend (Python/FastAPI) - OBRIGATORIO

| Tipo | Vai no Backend |
|------|----------------|
| Chamadas a LLM (OpenAI, Anthropic) | Sim - `adapters/llm/` |
| Pricing APIs (AWS, Azure) | Sim - `adapters/pricing/` |
| Validacao de modelo (constraints) | Sim - `core/validators.py` |
| Geracao de Terraform | Sim - `core/services/export.py` |
| Parser de operacoes do LLM | Sim - `core/services/chat.py` |
| Persistencia (SQLite/Postgres) | Sim - `adapters/db/` |
| Aplicacao de ChangeSet | Sim - `core/services/model.py` |

### Frontend (Next.js) - APENAS

| Tipo | Vai no Frontend |
|------|-----------------|
| Interface de chat | Sim - `components/chat/` |
| Canvas React Flow | Sim - `components/canvas/` |
| Painel de custos | Sim - `components/panels/` |
| Navegacao zoom (L0-L3) | Sim - `components/canvas/` |
| Estado local (UI) | Sim |
| Chamadas ao backend API | Sim - `lib/api.ts` |
| Chamadas diretas a LLM | NAO |
| Logica de pricing | NAO |
| Validacao de modelo | NAO (apenas UX hints) |

---

## Regras de Localizacao

### Onde colocar codigo novo?

```
Precisa chamar API externa (LLM, pricing)?
└── Backend: adapters/

E logica de dominio (Node, Edge, ChangeSet)?
└── Backend: core/

E servico de negocio (chat, export)?
└── Backend: core/services/

E endpoint HTTP?
└── Backend: api/routes/

E componente visual?
└── Frontend: components/

E pagina/rota?
└── Frontend: app/
```

### Exemplos

| Funcionalidade | Local Correto |
|----------------|---------------|
| Chamar Claude para interpretar texto | `backend/adapters/llm/` |
| Validar que Edge conecta nodes validos | `backend/core/validators.py` |
| Gerar arquivo .tf | `backend/core/services/export.py` |
| Custom node para database | `frontend/components/canvas/nodes/` |
| Painel de propriedades do node | `frontend/components/panels/` |
| Tela de projetos | `frontend/app/projects/` |

---

## Integracao Frontend <-> Backend

```
Frontend                          Backend
   │                                 │
   │  POST /api/chat/message         │
   │ ──────────────────────────────► │
   │                                 │ (chama LLM, gera ChangeSet)
   │  { changeset, model_update }    │
   │ ◄────────────────────────────── │
   │                                 │
   │  GET /api/models/{id}/graph     │
   │ ──────────────────────────────► │
   │                                 │
   │  { nodes, edges }               │
   │ ◄────────────────────────────── │
   │                                 │
```

**Regra:** Frontend NUNCA chama LLM ou APIs de pricing diretamente. Sempre via backend.

---

## Convencoes

### Naming

- **Python:** snake_case para tudo
- **TypeScript:** camelCase para variaveis, PascalCase para componentes
- **SQL:** snake_case para tabelas e colunas

### Commits

```
feat(backend): add terraform export service
fix(frontend): correct node positioning after drag
refactor(core): simplify changeset validation
docs: update metamodel specification
```

### Branches

```
feature/fn-N-descricao-curta
fix/fn-N-descricao-do-bug
refactor/fn-N-area-afetada
```

---

## Referencia Rapida

| Pergunta | Resposta |
|----------|----------|
| Onde fica a logica do chat? | `backend/core/services/chat.py` |
| Onde fica o node customizado? | `frontend/components/canvas/nodes/` |
| Onde fica a integracao com OpenAI? | `backend/adapters/llm/openai.py` |
| Onde fica o schema do banco? | `backend/adapters/db/models.py` |
| Onde fica o calculo de custo? | `backend/adapters/pricing/` |
| Onde fica o template Terraform? | `backend/adapters/templates/` |
