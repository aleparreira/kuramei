# Kuramei Lens - Metamodelo

Framework conceitual para arquitetura de soluções AI-first.

---

## Visão Geral

Kuramei Lens é um metamodelo próprio com compatibilidade C4.

**Filosofia**:
- Metamodelo próprio como núcleo (liberdade para inovar)
- C4 como view/export (fala a língua do mercado)
- Custo como dimensão first-class
- Decisões versionadas e auditáveis

---

## Entidades Principais

### Workspace

Container multi-tenant.

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| id | UUID | Identificador único |
| name | string | Nome do workspace |
| slug | string | URL-friendly identifier |
| created_at | datetime | Data de criação |
| updated_at | datetime | Última atualização |

### Project

Unidade de arquitetura e entrega (um produto/sistema).

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| id | UUID | Identificador único |
| workspace_id | UUID | FK para Workspace |
| name | string | Nome do projeto |
| description | text | Descrição |
| default_cloud | enum | aws/gcp/azure/onprem |
| repo_url | string | URL do repositório |
| iac_tool | enum | terraform/pulumi/cdk |
| created_at | datetime | Data de criação |
| updated_at | datetime | Última atualização |

### Model (Architecture Model)

Snapshot versionável do grafo arquitetural.

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| id | UUID | Identificador único |
| project_id | UUID | FK para Project |
| name | string | Nome do modelo |
| status | enum | draft/published |
| version | string | Semver ou incremental |
| created_at | datetime | Data de criação |
| updated_at | datetime | Última atualização |

### Node (Elemento)

Qualquer elemento do grafo (serviço, banco, queue, etc.).

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| id | UUID | Identificador único |
| model_id | UUID | FK para Model |
| type | enum | Tipo do nó (ver Node Types) |
| name | string | Nome do elemento |
| description | text | Descrição |
| tags | json array | Tags para categorização |
| properties | json | Propriedades específicas do tipo |
| level | enum | L0/L1/L2/L3 (zoom semântico) |
| parent_node_id | UUID | FK para Node (hierarquia) |
| position | json | {x, y} para React Flow |
| size | json | {w, h} para React Flow |
| cost | json | {monthlyUSD, confidence, assumptions[]} |
| created_at | datetime | Data de criação |
| updated_at | datetime | Última atualização |

#### Node Types

| Type | Descrição | Exemplo |
|------|-----------|---------|
| system | Sistema completo | "E-commerce Platform" |
| service | Aplicação deployável | "Order Service", "API Gateway" |
| database | Banco de dados | "PostgreSQL", "DynamoDB" |
| queue | Fila de mensagens | "SQS", "RabbitMQ" |
| bucket | Storage | "S3", "Azure Blob" |
| function | Serverless | "Lambda", "Azure Function" |
| job | Batch/Cron | "ETL Job", "Backup Job" |
| ui | Frontend | "Web App", "Mobile App" |
| external_system | Sistema externo | "Payment Gateway", "CRM" |
| gateway | Gateway/LB | "API Gateway", "ALB" |
| vpc | Rede virtual | "VPC", "VNET" |
| subnet | Sub-rede | "Private Subnet", "Public Subnet" |
| identity | Identidade | "IAM Role", "Service Account" |
| secret | Segredo | "Secret Manager", "Key Vault" |

### Edge (Relação/Fluxo)

Conexão entre nós.

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| id | UUID | Identificador único |
| model_id | UUID | FK para Model |
| type | enum | Tipo da conexão (ver Edge Types) |
| source_node_id | UUID | FK para Node (origem) |
| target_node_id | UUID | FK para Node (destino) |
| properties | json | {protocol, port, auth, rate, latency_slo} |
| created_at | datetime | Data de criação |
| updated_at | datetime | Última atualização |

#### Edge Types

| Type | Descrição | Targets válidos |
|------|-----------|-----------------|
| calls | Chamada síncrona | service, function |
| publishes | Publica evento | queue, topic |
| subscribes | Consome evento | queue, topic |
| reads | Lê dados | database, bucket |
| writes | Escreve dados | database, bucket |
| depends_on | Dependência genérica | qualquer |
| contains | Composição | (usar parent_node_id) |
| connects | Conectividade de rede | vpc, subnet, gateway |

### Conversation

Sessão de chat que origina mudanças.

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| id | UUID | Identificador único |
| project_id | UUID | FK para Project |
| title | string | Título da conversa |
| created_at | datetime | Data de criação |
| updated_at | datetime | Última atualização |

### Message

Mensagens do usuário/assistente.

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| id | UUID | Identificador único |
| conversation_id | UUID | FK para Conversation |
| role | enum | user/assistant/system |
| content | text | Conteúdo da mensagem |
| created_at | datetime | Data de criação |

### ChangeSet

Conjunto de operações aplicadas ao modelo (auditabilidade).

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| id | UUID | Identificador único |
| model_id | UUID | FK para Model |
| source | enum | chat/ui/import |
| summary | text | Resumo das mudanças |
| operations | json | Lista de operações |
| created_at | datetime | Data de criação |

#### Operações suportadas

```json
{
  "operations": [
    {"op": "add_node", "node": {...}},
    {"op": "update_node", "id": "...", "changes": {...}},
    {"op": "delete_node", "id": "..."},
    {"op": "add_edge", "edge": {...}},
    {"op": "update_edge", "id": "...", "changes": {...}},
    {"op": "delete_edge", "id": "..."}
  ]
}
```

---

## Relacionamentos

```
Workspace 1—N Project
Project 1—N Model
Project 1—N Conversation
Model 1—N Node
Model 1—N Edge
Model 1—N ChangeSet
Conversation 1—N Message
Node 0..1—N Node (parent_node_id)
```

---

## Constraints e Validações

### Integridade

1. `Node.name` único por `model_id` (ou por `parent_node_id + name`)
2. `Edge.source_node_id != Edge.target_node_id`
3. `Edge.source_node_id` e `target_node_id` devem pertencer ao mesmo `model_id`
4. `Node.parent_node_id` não pode criar ciclo
5. `Node.parent_node_id` deve pertencer ao mesmo `model_id`

### Compatibilidade de Tipos

| Edge.type | Targets válidos |
|-----------|-----------------|
| reads/writes | database, bucket |
| publishes/subscribes | queue |
| calls | service, function |

### Zoom Semântico

6. `parent.level < child.level` (ex: L1 contém L2)
7. Nó em `level=L0` não pode ter `parent_node_id`

### Validações de Segurança (básicas)

8. `database.properties.public == true` → warning
9. `service.properties.expose == "public"` sem `auth` → warning

---

## Zoom Semântico

### Níveis

| Level | Nome | Conteúdo | Público |
|-------|------|----------|---------|
| L0 | System Context | Sistema inteiro | CEO |
| L1 | Domain | Domínios/bounded contexts | CTO |
| L2 | Service | Serviços e containers | Arquiteto |
| L3 | Infrastructure | Recursos de infra | DevOps |

### Navegação

```
L0: "Plataforma E-commerce" (1 nó)
 └─ L1: "Frontend", "Orders", "Payments", "Inventory"
     └─ L2: "Next.js", "Order Service", "Payment Gateway", "Stock Service"
         └─ L3: "ECS Task", "RDS Instance", "SQS Queue", "S3 Bucket"
```

### Agregação de Edges

Em níveis superiores, edges são agregadas:
- Se há conexões entre descendentes de A e B, mostra edge A→B
- Edge agregado carrega `properties.aggregate_count`

### ViewProfile (alternativa aos levels)

| Profile | Default Level | Visível |
|---------|---------------|---------|
| CEO | L0 | Sistemas, custos totais |
| CTO | L1 | Domínios, dependências |
| Architect | L2 | Serviços, fluxos |
| DevOps | L3 | Infraestrutura |

---

## Custo como Dimensão

### Node.cost

```json
{
  "monthlyUSD": 150.00,
  "confidence": "estimated",
  "provider": "aws",
  "region": "us-east-1",
  "breakdown": {
    "compute": 100.00,
    "storage": 30.00,
    "transfer": 20.00
  },
  "assumptions": [
    "1000 requests/day",
    "50GB storage"
  ],
  "source": "aws-pricing-api",
  "calculated_at": "2026-01-22T10:00:00Z"
}
```

### Agregação de Custo

- Custo de um nó pai = soma dos custos dos filhos
- Custo do projeto = soma de todos os nós L2/L3

---

## Compatibilidade C4

### Export: Kuramei → C4

| Kuramei Node.type | C4 Element |
|-------------------|------------|
| system | Software System |
| service | Container |
| database | Container (tag: database) |
| queue | Container (tag: message broker) |
| bucket | Container (tag: storage) |
| function | Container (tag: serverless) |
| job | Container (tag: batch) |
| ui | Container |
| external_system | Software System (tag: external) |
| gateway | Container |
| vpc, subnet | Deployment Node |
| identity, secret | Não exportado |

| Kuramei Level | C4 Diagram |
|---------------|------------|
| L0 | System Context |
| L1 | Container |
| L2 | Component |
| L3 | Deployment |

| Kuramei Edge.type | C4 Relationship |
|-------------------|-----------------|
| calls | "Uses" |
| publishes | "Sends events to" |
| subscribes | "Receives events from" |
| reads | "Reads from" |
| writes | "Writes to" |
| depends_on | "Depends on" |

### Import: C4 → Kuramei

| C4 Element | Kuramei Node.type | Level |
|------------|-------------------|-------|
| Person | actor (novo) | L0 |
| Software System | system | L1 |
| Container | service (inferir por tags) | L2 |
| Component | function ou component | L3 |

**Nota**: C4 não tem informação de custo, região, runtime. Kuramei preenche com defaults.

---

## Schema SQLite (v0)

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  default_cloud TEXT,
  repo_url TEXT,
  iac_tool TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE models (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  version TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  model_id TEXT REFERENCES models(id),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT, -- JSON array
  properties TEXT, -- JSON
  level TEXT,
  parent_node_id TEXT REFERENCES nodes(id),
  position TEXT, -- JSON {x, y}
  size TEXT, -- JSON {w, h}
  cost TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edges (
  id TEXT PRIMARY KEY,
  model_id TEXT REFERENCES models(id),
  type TEXT NOT NULL,
  source_node_id TEXT REFERENCES nodes(id),
  target_node_id TEXT REFERENCES nodes(id),
  properties TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE changesets (
  id TEXT PRIMARY KEY,
  model_id TEXT REFERENCES models(id),
  source TEXT,
  summary TEXT,
  operations TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Referências

- [C4 Model](https://c4model.com/) - Simon Brown (CC BY 4.0)
- [ArchiMate](https://www.opengroup.org/archimate-forum) - The Open Group
- [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/)
- [Azure Architecture Center](https://docs.microsoft.com/en-us/azure/architecture/)
