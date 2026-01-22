# Kuramei - Architecture Decision Records (ADRs)

Registro de decisoes arquiteturais e estrategicas do projeto.

---

## ADR-001: Nome do Projeto

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Precisavamos de um nome para a plataforma de arquitetura AI-first. Opcoes consideradas:
- "AI Architecture Copilot" - generico, conflito com Microsoft Copilot
- "Seldon" - referencia a Foundation (Asimov), psico-historia
- "Kuramei" - dominio existente, marca ja definida

### Decisao

Usar **Kuramei** (倉明 = "armazem de luz/conhecimento").

### Razoes

1. Dominio `kuramei.com` ja registrado
2. Identidade visual ja definida (cores, tipografia)
3. Significado japones alinha com proposito (armazenar/iluminar conhecimento arquitetural)
4. Projeto anterior (Experiences) pausado, nome disponivel para reuso
5. Tagline "Clarity emerges" ja existente e adequada

### Consequencias

- Projeto anterior (Kuramei Experiences) movido para `~/dev/kuramei-backup`
- Notas de reativacao criadas em `REACTIVATION-NOTES.md`

---

## ADR-002: Stack Tecnologico

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Definir stack para backend e frontend do MVP.

### Decisao

**Backend**: Python + FastAPI
**Frontend**: Next.js + React Flow + shadcn/ui
**Database**: SQLite (MVP) → PostgreSQL (producao)

### Razoes

**Python/FastAPI**:
- Ecossistema AI maduro (LangChain, OpenAI SDK, etc.)
- Async nativo
- Tipagem com Pydantic
- Comunidade ativa em AI

**Next.js + React Flow**:
- React Flow e a melhor lib para diagramas interativos
- Next.js para SSR e API routes se necessario
- shadcn/ui para componentes consistentes

**SQLite → PostgreSQL**:
- SQLite simplifica MVP (zero config)
- Migracao para PostgreSQL quando precisar de:
  - Multi-user
  - Queries complexas
  - Producao real

### Alternativas Rejeitadas

- **Go backend**: Excelente performance, mas ecossistema AI menos maduro
- **Rust backend**: Over-engineering para MVP
- **D3.js**: Mais flexivel, mas muito mais trabalho que React Flow

---

## ADR-003: Modelo de Negocio - 100% Open Source

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Definir modelo de negocio considerando:
1. Objetivo estrategico EB2-NIW (demonstrar impacto)
2. Competicao com ferramentas existentes
3. Sustentabilidade a longo prazo

### Decisao

**100% Open Source (MIT License)**

Sem features escondidas atras de paywall. Todo o codigo publico.

### Razoes

1. **EB2-NIW**: Impacto demonstravel > receita imediata
2. **Confianca**: Arquitetos enterprise preferem codigo auditavel
3. **Contribuicoes**: Comunidade pode contribuir e melhorar
4. **Diferenciacao**: Maioria das ferramentas e SaaS fechado
5. **Build in public**: Transparencia total alinha com estrategia

### Monetizacao Futura (se aplicavel)

| Modelo | Descricao |
|--------|-----------|
| Kuramei Cloud | Hosted (conveniencia, nao features exclusivas) |
| Consultoria | Implementacao e customizacao |
| Suporte Enterprise | SLA e suporte dedicado |

### Consequencias

- GitHub repo publico
- Licenca MIT em todos os arquivos
- Documentacao completa obrigatoria
- Commits frequentes e visiveis

---

## ADR-004: Metamodelo Proprio vs C4 Puro

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

C4 Model e o padrao de facto para documentacao arquitetural. Opcoes:
1. Usar C4 puro como modelo interno
2. Criar metamodelo proprio incompativel
3. Metamodelo proprio com compatibilidade C4

### Decisao

**Kuramei Lens**: Metamodelo proprio com compatibilidade C4 para import/export.

### Razoes

**Por que nao C4 puro**:
- C4 nao tem conceito de custo
- C4 nao tem decisoes versionadas
- C4 e focado em documentacao, nao simulacao
- Limitaria inovacao futura

**Por que manter compatibilidade**:
- C4 e lingua franca do mercado
- Facilita adocao (import de diagramas existentes)
- Export para stakeholders que conhecem C4
- Nao reinventar onde C4 funciona bem

### Mapeamento

| Kuramei | C4 |
|---------|-----|
| system | Software System |
| service | Container |
| L0 | System Context |
| L1 | Container Diagram |
| L2 | Component Diagram |
| L3 | Deployment Diagram |

Ver `C4-MAPPING.md` para mapeamento completo.

---

## ADR-005: Zoom Semantico com Niveis Fixos

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Como implementar navegacao por niveis de abstracao?

### Decisao

Quatro niveis fixos (L0-L3) com `parent_node_id` para hierarquia.

| Level | Nome | Publico |
|-------|------|---------|
| L0 | System Context | CEO |
| L1 | Domain | CTO |
| L2 | Service | Arquiteto |
| L3 | Infrastructure | DevOps |

### Razoes

1. Alinha com C4 (4 niveis)
2. Simples de implementar (`level` enum + `parent_node_id`)
3. Cobre 95% dos casos de uso
4. Cada nivel tem publico claro

### Alternativas Consideradas

- **Niveis infinitos**: Mais flexivel, mas confuso
- **Apenas 2 niveis**: Muito limitado
- **ViewProfiles dinamicos**: Complexidade desnecessaria para MVP

### Consequencias

- Constraint: `parent.level < child.level`
- UI precisa de breadcrumbs para navegacao
- Edges agregadas em niveis superiores

---

## ADR-006: Custo como Dimensao First-Class

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Custo e crucial para decisoes arquiteturais, mas geralmente fica em planilhas separadas.

### Decisao

Custo e atributo direto do Node, nao entidade separada.

```json
{
  "cost": {
    "monthlyUSD": 150.00,
    "confidence": "estimated",
    "provider": "aws",
    "breakdown": {...},
    "assumptions": [...]
  }
}
```

### Razoes

1. Visualizacao integrada no diagrama
2. Agregacao automatica (pai = soma dos filhos)
3. Trade-offs explicitos ("Aurora custa 40% mais, mas...")
4. Diferencial competitivo (nenhuma ferramenta faz isso bem)

### Consequencias

- Integracao com AWS Pricing API
- Label "estimated" sempre visivel (precisao ~30%)
- Assumptions documentadas por no

---

## ADR-007: Chat como Interface Primaria

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Como usuarios interagem com a plataforma?

### Decisao

**Conversation-native**: Chat como entrada primaria, canvas como visualizacao.

Fluxo: Usuario descreve → IA interpreta e pergunta → Modelo gerado → Visualizacao

### Razoes

1. Mais natural que drag-and-drop para ideacao
2. IA pode fazer perguntas certas (usuario nao precisa saber tudo upfront)
3. Historico de decisoes automatico (conversa = audit trail)
4. Diferenciacao vs ferramentas tradicionais

### Consequencias

- ChangeSet como unidade atomica de mudanca
- Parser de operacoes estruturadas da LLM
- Sync automatico canvas ↔ backend

---

## ADR-008: ChangeSet para Auditabilidade

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Como rastrear mudancas no modelo arquitetural?

### Decisao

**ChangeSet**: Conjunto atomico de operacoes com source e timestamp.

```json
{
  "id": "...",
  "model_id": "...",
  "source": "chat|ui|import",
  "summary": "Adicionou API Gateway e Lambda",
  "operations": [
    {"op": "add_node", "node": {...}},
    {"op": "add_edge", "edge": {...}}
  ],
  "created_at": "..."
}
```

### Razoes

1. Auditabilidade completa (quem, quando, o que, por que)
2. Undo/redo possivel
3. Diff entre versoes
4. Compliance enterprise

### Consequencias

- Toda mudanca passa por ChangeSet (UI ou chat)
- Backend valida operacoes antes de aplicar
- Frontend recarrega apos aplicacao

---

## ADR-009: Identidade Visual Hibrida

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Como aplicar identidade visual do Kuramei com componentes shadcn?

### Decisao

**Hibrido**: Cores Kuramei + componentes shadcn customizados.

### Cores Kuramei

| Nome | Hex | Uso |
|------|-----|-----|
| Coral | #ff4c60 | Primaria, CTAs |
| Aqua | #65ebe7 | Secundaria, destaques |
| Canvas | #f9f9fe | Background claro |
| Ink | #454360 | Texto principal |

### Implementacao

1. Customizar `globals.css` com CSS variables Kuramei
2. Usar shadcn components com tema customizado
3. React Flow nodes com cores Kuramei
4. Dark mode com mesma paleta (ajustada)

### Consequencias

- Consistencia visual com marca Kuramei
- Beneficio dos componentes shadcn (acessibilidade, responsividade)
- Nao precisa criar design system do zero

---

## ADR-010: GitHub como Plataforma Principal

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Onde hospedar codigo e documentacao?

### Decisao

**GitHub** com repositorio publico.

- Repo: `github.com/xandebarbosa/kuramei`
- Issues para roadmap publico
- Discussions para comunidade
- Actions para CI/CD

### Razoes

1. Maior visibilidade (vs GitLab, Bitbucket)
2. GitHub Stars como metrica de impacto (EB2-NIW)
3. Integracao com Vercel, Railway
4. Familiar para contribuidores

### Consequencias

- Commits frequentes e descritivos
- README atrativo
- Contributing guide
- Code of conduct

---

## ADR-011: Dominio kuramei.ai

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Definir dominio principal do projeto.

### Decisao

Usar **kuramei.ai** (em vez de kuramei.com).

### Razoes

1. `.ai` comunica posicionamento AI-first
2. Mais memoravel para o publico-alvo (arquitetos, CTOs)
3. Diferenciacao no mercado

---

## ADR-012: Identidade do Criador - Titulo Profissional

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Definir como o criador se apresenta no projeto e em materiais publicos, considerando:
- Processo EB2-NIW (demonstrar habilidade excepcional)
- Mercado (credibilidade para CTOs/arquitetos)
- Diferenciacao (nao ser "mais um arquiteto")

### Decisao

**Titulo**: Sociotechnical Systems Architect & AI Engineer

**Tese**: "Building cognitive infrastructure for critical digital systems"

### Razoes

1. **Sociotechnical** legitima soft skills + decisoes humanas + governanca
2. **Systems Architect** ancora senioridade e rigor
3. **AI Engineer** posiciona no presente e futuro
4. Cria **escassez semantica** (poucos profissionais se descrevem assim)
5. Conecta com **infraestrutura critica** (forte para NIW)

### Linguagem Consistente

Termos a usar em todos os materiais:
- Cognitive Infrastructure
- Governance-first
- Measurable / Auditable
- Production-grade
- Sociotechnical Systems

### Consequencias

- Landing kuramei.ai usa esse titulo
- LinkedIn headline atualizado
- GitHub profile README atualizado
- Consistencia em todos os canais

---

## ADR-013: Landing Evidence-Driven

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Como estruturar a landing page considerando dois publicos:
1. USCIS/EB2-NIW (evidencia printavel de autoria e impacto)
2. Mercado (CTOs, arquitetos buscando solucoes)

### Decisao

**Evidence-driven**: Cada elemento da landing serve duplo proposito.

### Estrutura

| Elemento | Evidencia NIW | Conversao Mercado |
|----------|---------------|-------------------|
| Nome + titulo no hero | Autoria clara | Credibilidade |
| "30+ years" | Qualificacao | Trust signal |
| GitHub stars | Metrica de impacto | Social proof |
| Demo | Prova funcional | Ver o produto |
| MIT License | Beneficio publico | Baixa barreira |

### Consequencias

- Landing bilíngue (EN default, PT toggle)
- Autoria visivel no hero (nao escondida no footer)
- GitHub stars como metrica principal
- Screenshot-friendly para documentacao legal

---

## ADR-014: Infraestrutura 100% AWS

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Definir onde deployar o Kuramei, considerando:
1. Criador estudando para AWS SA Professional
2. Projeto de arquitetura cloud deve rodar em cloud real
3. Oportunidade de aprendizado prático
4. Evidência de expertise AWS para EB2-NIW

### Decisao

**100% AWS** para toda infraestrutura do Kuramei.

### Stack AWS

| Componente | Servico AWS |
|------------|-------------|
| DNS | Route 53 |
| CDN | CloudFront |
| Landing | S3 + CloudFront |
| Backend | ECS Fargate |
| Database | RDS Aurora Serverless (PostgreSQL) |
| Secrets | Secrets Manager |
| Assets | S3 |
| Logs | CloudWatch |
| Networking | VPC + ALB |

### Razoes

1. **Certificação**: Prática real com serviços do exame SA Professional
2. **Credibilidade**: "Arquiteto cloud usando cloud real"
3. **Pricing API**: Já precisa de AWS para estimativas de custo
4. **EB2-NIW**: Demonstra profundidade em AWS
5. **Meta**: Projeto que exporta Terraform rodando em infra Terraform

### Serviços AWS cobertos (relevantes para SA Pro)

- Compute: ECS Fargate
- Database: RDS Aurora
- Storage: S3
- Networking: CloudFront, Route 53, VPC, ALB
- Security: IAM, Secrets Manager
- Monitoring: CloudWatch

### Consequencias

- Custo mensal estimado: $50-100 (Aurora Serverless + Fargate)
- Curva de aprendizado: maior que Railway/Vercel
- Benefício: prática real para certificação

---

## ADR-015: Terraform para IaC

**Status**: Aceito
**Data**: 2026-01-22

### Contexto

Kuramei exporta Terraform. Faz sentido usar Terraform para provisionar a própria infra.

### Decisao

Usar **Terraform** para provisionar toda infraestrutura AWS do Kuramei.

### Estrutura

```
kuramei/
├── infra/                    # Terraform
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── modules/
│   │   ├── networking/
│   │   ├── ecs/
│   │   ├── rds/
│   │   └── cdn/
│   └── environments/
│       ├── dev/
│       └── prod/
```

### Razoes

1. **Meta-consistência**: Projeto que exporta Terraform usa Terraform
2. **Documentação viva**: Infra como código = documentação
3. **Reprodutibilidade**: Qualquer pessoa pode deployar
4. **Aprendizado**: Prática de IaC para certificação

---

## Decisoes Pendentes

| ID | Topico | Status |
|----|--------|--------|
| ADR-016 | Provider LLM (OpenAI vs Anthropic vs Ollama) | Pendente |
| ADR-017 | Autenticacao MVP (none vs basic vs Cognito) | Pendente |

---

## Template para Novas ADRs

```markdown
## ADR-XXX: Titulo

**Status**: Proposto | Aceito | Deprecado | Substituido
**Data**: YYYY-MM-DD

### Contexto
[Situacao que requer decisao]

### Decisao
[O que foi decidido]

### Razoes
[Por que essa decisao]

### Alternativas Consideradas
[O que foi rejeitado e por que]

### Consequencias
[Impactos positivos e negativos]
```
