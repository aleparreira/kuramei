# Kuramei Lens ↔ C4 Model Mapping

Documento de consenso para mapeamento entre Kuramei Lens e C4 Model.

---

## Filosofia

**Kuramei Lens** e um metamodelo proprio que:
1. Usa C4 como inspiracao (4 niveis de zoom)
2. Adiciona dimensoes que C4 nao tem (custo, decisoes, simulacao)
3. Exporta para C4 quando necessario (compatibilidade de mercado)
4. Importa de C4 para facilitar adocao

**Nao e "C4 Next"** - e um framework independente com ponte para C4.

---

## Mapeamento de Entidades

### Node Types → C4 Elements

| Kuramei Node.type | C4 Element | Notas |
|-------------------|------------|-------|
| `system` | Software System | Mapeamento direto |
| `service` | Container | Aplicacao deployavel |
| `database` | Container | Tag: database |
| `queue` | Container | Tag: message broker |
| `bucket` | Container | Tag: storage |
| `function` | Container | Tag: serverless |
| `job` | Container | Tag: batch |
| `ui` | Container | Tag: web/mobile |
| `external_system` | Software System | Tag: external |
| `gateway` | Container | Tag: gateway |
| `vpc` | Deployment Node | Infraestrutura |
| `subnet` | Deployment Node | Infraestrutura |
| `identity` | - | Nao exportado (Kuramei-only) |
| `secret` | - | Nao exportado (Kuramei-only) |

### Levels → C4 Diagrams

| Kuramei Level | C4 Diagram | Publico Alvo |
|---------------|------------|--------------|
| L0 | System Context | CEO, Stakeholders |
| L1 | Container | CTO, Tech Leads |
| L2 | Component | Arquitetos, Devs |
| L3 | Deployment | DevOps, SRE |

### Edge Types → C4 Relationships

| Kuramei Edge.type | C4 Relationship | Descricao |
|-------------------|-----------------|-----------|
| `calls` | "Uses" | Chamada sincrona |
| `publishes` | "Sends events to" | Publica evento |
| `subscribes` | "Receives events from" | Consome evento |
| `reads` | "Reads from" | Le dados |
| `writes` | "Writes to" | Escreve dados |
| `depends_on` | "Depends on" | Dependencia generica |
| `connects` | - | Rede (Kuramei-only) |

---

## Export: Kuramei → C4

### Processo

1. Filtrar nodes por level desejado
2. Mapear `node.type` para C4 element
3. Converter edges para relationships C4
4. Gerar formato de saida (PlantUML, Structurizr DSL, JSON)

### Exemplo

**Kuramei Node**:
```json
{
  "id": "node-1",
  "type": "service",
  "name": "Order Service",
  "level": "L2",
  "properties": {
    "technology": "Python/FastAPI",
    "runtime": "ECS Fargate"
  }
}
```

**C4 Container (Structurizr DSL)**:
```
container "Order Service" {
    technology "Python/FastAPI"
    tags "service"
}
```

### Informacoes Perdidas no Export

| Atributo Kuramei | Preservado em C4? |
|------------------|-------------------|
| `cost` | Nao |
| `position` | Nao (layout automatico) |
| `size` | Nao |
| `properties.region` | Parcial (em description) |
| `properties.runtime` | Sim (technology) |

---

## Import: C4 → Kuramei

### Processo

1. Parsear formato C4 (PlantUML, Structurizr, JSON)
2. Inferir `node.type` por tags ou heuristica
3. Atribuir `level` baseado em tipo de diagrama
4. Gerar IDs unicos
5. Preencher defaults para atributos Kuramei-only

### Mapeamento de Inferencia

| C4 Element | Tags | Kuramei Type |
|------------|------|--------------|
| Person | - | `actor` (novo) |
| Software System | external | `external_system` |
| Software System | - | `system` |
| Container | database | `database` |
| Container | message broker, queue | `queue` |
| Container | storage, s3 | `bucket` |
| Container | serverless, lambda | `function` |
| Container | - | `service` (default) |
| Component | - | `function` ou `component` |

### Defaults Aplicados

Atributos que C4 nao tem, Kuramei preenche:

```json
{
  "cost": null,
  "position": {"x": 0, "y": 0},
  "properties": {
    "provider": "unknown",
    "region": "unknown"
  }
}
```

---

## Formatos de Export Suportados

### 1. Structurizr DSL

```
workspace "Kuramei Export" {
    model {
        user = person "User"
        system = softwareSystem "E-commerce" {
            api = container "API Gateway" {
                technology "AWS API Gateway"
            }
            orders = container "Order Service" {
                technology "Python/FastAPI"
            }
        }
        user -> api "Uses"
        api -> orders "Routes to"
    }
}
```

### 2. PlantUML (C4-PlantUML)

```plantuml
@startuml
!include C4_Container.puml

Person(user, "User")
System_Boundary(system, "E-commerce") {
    Container(api, "API Gateway", "AWS API Gateway")
    Container(orders, "Order Service", "Python/FastAPI")
}
Rel(user, api, "Uses")
Rel(api, orders, "Routes to")
@enduml
```

### 3. JSON (Structurizr compatible)

```json
{
  "model": {
    "people": [...],
    "softwareSystems": [...]
  },
  "views": {
    "systemContextViews": [...],
    "containerViews": [...]
  }
}
```

---

## Extensoes Kuramei (Nao-C4)

Atributos que existem apenas no Kuramei Lens:

### 1. Cost

```json
{
  "cost": {
    "monthlyUSD": 150.00,
    "confidence": "estimated",
    "provider": "aws",
    "breakdown": {
      "compute": 100.00,
      "storage": 30.00,
      "transfer": 20.00
    },
    "assumptions": ["1000 req/day", "50GB storage"]
  }
}
```

### 2. ChangeSet (Audit Trail)

```json
{
  "changesets": [
    {
      "id": "cs-1",
      "source": "chat",
      "summary": "Added caching layer",
      "operations": [...],
      "created_at": "2026-01-22T10:00:00Z"
    }
  ]
}
```

### 3. Simulation Properties

```json
{
  "properties": {
    "throughput_rps": 1000,
    "latency_p99_ms": 50,
    "availability_slo": 99.9,
    "scaling": {
      "min": 2,
      "max": 10,
      "metric": "cpu"
    }
  }
}
```

---

## Casos de Uso

### 1. Arquiteto quer compartilhar com stakeholders

```
Kuramei → Export C4 PlantUML → Gerar PNG → Anexar em documento
```

### 2. Time quer importar diagramas existentes

```
Structurizr DSL existente → Import Kuramei → Enriquecer com custo → Simular
```

### 3. Compliance precisa de documentacao formal

```
Kuramei → Export C4 JSON → Submeter para auditoria
```

---

## Limitacoes

### Export

1. **Custo nao exporta**: C4 nao tem conceito de custo
2. **Layout perdido**: C4 ferramentas fazem layout automatico
3. **Simulacao nao exporta**: Propriedades de throughput/latencia

### Import

1. **Type inference imperfeito**: Container generico vira `service`
2. **Sem custo**: Precisa preencher manualmente
3. **Sem hierarquia profunda**: C4 Component e mais raso que L3

---

## Roadmap de Compatibilidade

| Versao | Feature |
|--------|---------|
| MVP | Export PlantUML basico |
| v0.2 | Import Structurizr DSL |
| v0.3 | Export JSON completo |
| v0.4 | Import C4 interativo (wizard) |
| v1.0 | Sync bidirecional |
