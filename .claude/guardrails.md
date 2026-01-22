# Guardrails - Checklist Obrigatorio

**REGRA:** Este checklist DEVE ser executado antes de escrever QUALQUER codigo.

---

## 1. Investigacao (SEMPRE PRIMEIRO)

Antes de criar codigo novo, responder:

- [ ] **Busquei no backend?** `grep -r "termo" backend/`
- [ ] **Busquei no frontend?** `grep -r "termo" frontend/`
- [ ] **Ja existe algo similar?** Se sim, por que nao usar?
- [ ] **Se existe e nao funciona, entendi o motivo?**

**Se a funcionalidade ja existe:** NAO criar codigo novo. Corrigir o existente.

---

## 2. Localizacao (ONDE vai o codigo?)

Consultar `architecture.md` e responder:

- [ ] **Li architecture.md?**
- [ ] **Sei exatamente onde esse codigo deve ficar?**
- [ ] **Estou colocando no lugar certo segundo a arquitetura?**

### Quick Reference

| Se o codigo... | Entao vai em... |
|----------------|-----------------|
| Chama LLM (OpenAI, Anthropic) | `backend/adapters/llm/` |
| Chama API de pricing | `backend/adapters/pricing/` |
| E logica de dominio | `backend/core/` |
| E servico de negocio | `backend/core/services/` |
| E endpoint HTTP | `backend/api/routes/` |
| E componente visual | `frontend/components/` |
| E pagina | `frontend/app/` |

**Se em duvida:** Perguntar ANTES de implementar.

---

## 3. Duplicacao (ESTOU duplicando?)

- [ ] **O codigo que vou escrever duplica algo existente?**
- [ ] **Estou criando versao frontend de algo que existe no backend?**
- [ ] **Posso reutilizar ao inves de criar novo?**

**Se vou duplicar:** PARAR. Reutilizar ou refatorar.

---

## 4. Seguranca

- [ ] **Validacao critica esta no backend?**
- [ ] **Nao estou expondo API keys no frontend?**
- [ ] **Inputs sao sanitizados no backend?**

---

## 5. Resposta Antes de Implementar

Antes de escrever codigo, responder brevemente:

```markdown
## Pre-Implementacao

**Funcionalidade:** [o que vou fazer]
**Busca realizada:** [onde busquei, o que encontrei]
**Local correto:** [onde vai ficar e por que]
**Duplicacao:** [confirmado que nao duplica]

Prosseguindo.
```

---

## Exemplos

### Exemplo ERRADO

```
User: "Adiciona chamada ao Claude para interpretar o texto"

Claude: "Vou criar um hook no frontend que chama a API da Anthropic..."

ERRADO! Chamada a LLM vai no backend.
```

### Exemplo CERTO

```
User: "Adiciona chamada ao Claude para interpretar o texto"

Claude: "## Pre-Implementacao

**Funcionalidade:** Integracao com Claude API para interpretar texto do chat
**Busca realizada:** grep -r 'anthropic' backend/ - nada encontrado
**Local correto:** backend/adapters/llm/anthropic.py (integracao externa)
**Duplicacao:** confirmado que nao existe

Prosseguindo com implementacao no backend."
```

---

## Sinais de Alerta

Parar e reconsiderar se:

- Estou colocando chamada de LLM no frontend
- Estou duplicando logica de validacao
- Estou criando arquivo em pasta que nao existe na arquitetura
- Nao consigo explicar por que o codigo vai nesse local
- Estou adicionando API key no frontend

---

## Especifico Kuramei

### Dominio Core (backend/core/)

Estas entidades sao a fonte de verdade:

- **Node**: Elemento do grafo (service, database, etc.)
- **Edge**: Conexao entre nodes
- **Model**: Snapshot versionavel da arquitetura
- **ChangeSet**: Conjunto atomico de operacoes
- **Conversation/Message**: Historico do chat

**Regra:** Toda mutacao passa por ChangeSet. Frontend nao modifica Model diretamente.

### React Flow (frontend/components/canvas/)

- Nodes customizados: `nodes/ServiceNode.tsx`, `nodes/DatabaseNode.tsx`, etc.
- Edges customizadas: `edges/CallsEdge.tsx`, etc.
- Estado do canvas e derivado do backend, nao local

---

## Enforcement

**Se eu (Claude) violar estes guardrails:**

1. O erro deve ser apontado imediatamente
2. O codigo incorreto deve ser removido/movido
3. A implementacao correta deve ser feita

Guardrails existem para evitar retrabalho. Segui-los e obrigatorio.
