# PR Review — Regras do Projeto

Este arquivo ativa o hook de confirmação de review antes de commits.

## Workflow obrigatório

```
Branch → PR → Codex Review → Fix → Re-review → SHIP → Merge
```

## Antes de abrir PR

- [ ] `pnpm build` sem erros
- [ ] `pnpm lint` sem erros
- [ ] `pnpm typecheck` sem erros
- [ ] Code review executado

## Codex Review

```bash
codex review --base main
```

| Verdict | Ação |
|---------|------|
| SHIP | Pode fazer merge |
| REVIEW | Corrigir e re-rodar |
| BLOCK | Resolver antes de continuar |

Ver regra global em `~/.claude/rules/pr-workflow.md` para detalhes completos.
