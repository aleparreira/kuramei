# Kuramei - Visão e Manifesto

> **Kuramei**: 倉明 = "armazém de luz/conhecimento"
> **Tagline**: "Clarity emerges."

---

## Tese Central

> **Arquitetura de soluções não pode mais ser apenas documentação estática ou diagramas manuais.**

Ela precisa ser:
- Interativa
- Simulável
- Auditável
- Governada por dados
- Assistida por inteligência artificial

Kuramei é uma **plataforma de IA para arquitetos** que funciona como um **copiloto cognitivo** capaz de co-criar, simular, avaliar e evoluir arquiteturas complexas.

---

## O Problema Atual

Hoje, arquitetos enfrentam:

- Decisões críticas baseadas em:
  - Experiência pessoal
  - Pressão política
  - Prazos irreais
- Falta de simulação realista de:
  - Custos
  - Throughput
  - Latência
  - Escalabilidade
  - Risco operacional
- Ferramentas fragmentadas:
  - Diagramas (draw.io, Lucid)
  - Documentos (Confluence, Word)
  - Planilhas de custo
  - Slides executivos

Tudo desconectado. Tudo manual. Tudo frágil.

---

## A Solução: Kuramei

Uma plataforma que permite:

- Criar **arquiteturas via conversa** (AI-first)
- **Visualizar com zoom semântico** (CEO → CTO → Dev)
- **Simular cenários** em tempo real
- Receber **recomendações inteligentes**
- **Exportar** para Terraform, C4, ArchiMate, PDF

Não é apenas "desenhar arquitetura".
É **pensar arquitetura com IA**.

---

## Princípios do Kuramei Lens

### 1. Conversation-native
Arquitetura começa com conversa, não canvas vazio.
A IA faz as perguntas certas, não espera especificação completa.

### 2. Startup-velocity, Enterprise-ready
MVP em minutos, escala para compliance depois.
Startups não têm tempo para TOGAF. Mas quando viram enterprise, precisam de compliance.

### 3. Custo como arquitetura
Custo não é planilha separada. É dimensão do modelo.
Trade-offs são explícitos: "Aurora custa 40% mais, mas reduz risco de downtime em 90%"

### 4. Decisões versionadas
Cada mudança é uma decisão com contexto: quem, quando, por quê, alternativas.
Arquitetura é código. Decisões são commits.

### 5. Zoom semântico
Não são "4 níveis". É navegação contínua.
- CEO vê: 3 blocos e fluxo de dinheiro
- CTO vê: serviços e dependências
- Dev vê: containers e configs

Mesma fonte de verdade, múltiplas lentes.

### 6. Simulação, não documentação
"E se o tráfego dobrar?" → Resposta em segundos, não semanas.
"E se eu trocar RDS por Aurora?" → Mostra impacto em custo, latência, risco.

### 7. Exportável, não aprisionador
- Kuramei → Terraform (infraestrutura)
- Kuramei → C4 (documentação)
- Kuramei → ArchiMate (compliance)
- Kuramei → PDF (executivo)

Formato nativo é melhor, mas nunca prende o usuário.

---

## Posicionamento

### Por que não é "mais um draw.io com IA"

| Aspecto | Ferramentas atuais | Kuramei |
|---------|-------------------|---------|
| Entrada | Canvas vazio | Conversa com IA |
| Modelo | Diagrama estático | Grafo simulável |
| Custo | Planilha separada | Dimensão integrada |
| Decisões | Docs avulsos | Versionadas no modelo |
| Zoom | Múltiplos arquivos | Navegação contínua |
| Saída | PNG/PDF | Terraform, C4, código |

### Diferencial real

- **Profundidade vertical** (cloud architecture, não genérico)
- **ROI comprovado** (custo estimado, não "automação")
- **AI-first** (conversa, não drag-and-drop)
- **Open source** (MIT, sem lock-in)

---

## Público-Alvo

| Perfil | Necessidade | Como Kuramei ajuda |
|--------|-------------|-------------------|
| **Arquiteto Senior** | Acelerar decisões | Chat → Arquitetura em minutos |
| **Tech Lead/CTO** | Visão executiva | Zoom semântico + custo |
| **Arquiteto Pleno** | Aprender patterns | Sugestões contextuais |
| **Startup** | Decisão rápida | MVP arquitetural instantâneo |
| **Enterprise** | Compliance | Export para TOGAF/ArchiMate |

**Foco inicial**: Arquitetos senior e startups.

---

## Casos de Uso

### 1. Migração de Legado para Cloud

```
Usuário: "Tenho um monolito Java com Oracle, quero migrar para AWS, budget limitado"

Kuramei:
- Analisa o cenário
- Gera opções (Lift & Shift, Refactor, Replatform)
- Simula custo mensal de cada opção
- Mostra trade-offs explícitos
- Sugere fases de execução
```

### 2. Protótipo Arquitetural Interativo

```
- Aumentar carga → ver impacto em custo
- Trocar banco → ver impacto em latência
- Mudar região → ver impacto regulatório
- Inserir cache → ver ganho de throughput
```

### 3. What-if em 30 segundos

```
"E se eu trocar RDS por DynamoDB?"
→ Delta de custo: +$200/mês
→ Riscos: consistência eventual, curva de aprendizado
→ Benefícios: escalabilidade infinita, sem gerenciamento
→ Mudanças necessárias: refatorar queries
```

---

## Modelo de Negócio

### Open Source (MIT)

100% open source. Sem features escondidas atrás de paywall.

**Razão**: Objetivo é impacto e autoridade, não receita imediata.

### Monetização futura (se aplicável)

| Modelo | Descrição |
|--------|-----------|
| **Kuramei Cloud** | Hosted (conveniência, não features exclusivas) |
| **Consultoria** | Implementação e customização |
| **Suporte Enterprise** | SLA e suporte dedicado |

---

## Objetivo Estratégico: EB2-NIW

Este projeto serve como case público para visto EB2-NIW:

- **Impacto nacional/internacional** demonstrável
- **Build in public** com commits frequentes
- **Divulgação** em X e LinkedIn
- **Contribuidores externos** e reconhecimento
- **Autoria clara** em todas as contribuições

### Evidências a construir

- GitHub stars e forks
- Contribuidores externos
- Empresas/pessoas usando
- Citações e menções
- Talks e artigos
- Casos de uso reais

---

## Relacionamento com Outros Projetos

| Projeto | Relação |
|---------|---------|
| **Kuramei (Experiences)** | Projeto pausado, nome reutilizado. Backup em ~/dev/kuramei-backup |
| **Kuramei OS** | Visão de longo prazo. Este projeto pode evoluir para isso. |
| **Contábil** | Projeto paralelo, stack similar |

---

*"A complexidade arquitetural cresce mais rápido do que a capacidade humana de projetar, simular e decidir. Kuramei é a resposta."*
