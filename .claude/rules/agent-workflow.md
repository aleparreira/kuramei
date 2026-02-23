# Agent Workflow — Como o Agente Trabalha no Kuramei

## 1. Branch Guard (OBRIGATÓRIO antes de qualquer edição)

Nunca editar código diretamente na `main`. Criar branch antes de qualquer mudança de código.

```bash
# Tipos de branch
feat/<descricao>      # nova funcionalidade
fix/<descricao>       # correção de bug
refactor/<descricao>  # refactor sem mudança de comportamento
chore/<descricao>     # setup, config, dependências
docs/<descricao>      # apenas documentação
test/<descricao>      # apenas testes
```

**Exceções (pode editar direto na main):**
- Arquivos `.claude/` (docs internos do projeto)
- `AGENTS.md`, `README.md` (documentação pura)
- `CLAUDE.md` (contexto do agente)

---

## 2. Plan Mode — Quando Usar

**Usar Plan Mode antes de implementar quando:**
- [ ] Múltiplos arquivos afetados (>2)
- [ ] Nova funcionalidade
- [ ] Refactor estrutural
- [ ] Mudança de API/interface entre packages
- [ ] Qualquer coisa que precisaria de PR review

**NÃO precisa de Plan Mode:**
- Typos em docs
- Fix de 1-2 linhas óbvio
- Ajuste de config trivial

---

## 3. Subagents — Paralelizar Quando Possível

Para pesquisa e exploração, usar múltiplos subagents em paralelo:
- Explore: busca de arquivos e contexto no codebase
- Bash: comandos de build/lint/test

---

## 4. Verificação Antes de "Pronto"

Antes de considerar uma tarefa concluída:
1. `pnpm build` — sem erros TypeScript
2. `pnpm lint` — sem erros ESLint
3. `pnpm typecheck` — sem erros de tipo
4. Comportamento correto verificado manualmente (se aplicável)

Se precisa de `// TODO` ou `// FIXME`, não está pronto.

---

## 5. Restrições do Sprint Atual (Sprint 2)

**Em progresso:** Generative UI Engine
- Spec Schema, Renderer, Cloudflare Worker, KV + Token

**Proibido sem consulta ao Alexandre:**
- Mudar arquitetura (ver decisões fechadas em `decisions.md`)
- Instalar novos packages sem justificativa
- Implementar `@kuramei/workflows` (cortado na Fase 0)
- Adicionar EventBridge (cortado na Fase 0)
- Tornar `tenantId` dinâmico

---

## 6. Commits

Formato convencional obrigatório:
```
feat(agent): add OpenRouter fallback to Gemini Flash
fix(whatsapp): handle empty body in webhook payload
chore(deps): add eslint + typescript-eslint
docs(claude): update Sprint 2 status
```

Co-Authored-By quando Claude implementou:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## 7. PR Workflow

Ver `~/.claude/rules/pr-workflow.md` para detalhes completos.

Fluxo resumido:
```
Branch → PR → Codex Review → Fix → Re-review → SHIP → Merge
```

```bash
codex review --base main   # rodar antes de abrir PR
```

---

## 8. Quando PARAR e Perguntar

Parar e aguardar decisão do Alexandre quando:
- Ambiguidade sobre escopo (está dentro do sprint atual?)
- Decisão arquitetural nova (não coberta por `decisions.md`)
- Algo que parece violar as decisões fechadas
- Instalação de dependência nova não justificada
- Qualquer mudança que afete múltiplos packages de forma significativa
