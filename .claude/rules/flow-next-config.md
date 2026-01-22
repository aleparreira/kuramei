# Flow-Next Config - Projeto Kuramei

## Defaults (NAO PERGUNTAR)

Quando executar `/flow-next:work` ou `/flow-next:plan`:

1. **Branch**: Sempre `new` (nao perguntar)
2. **Review**: Sempre `codex` (nao perguntar)

### Convenção de Branch

```
feature/fn-N-descricao-curta
```

Onde:
- `fn-N` é o ID do epic
- `descricao-curta` são 2-3 palavras do título

Exemplos:
- `feature/fn-1-chat-changeset`
- `feature/fn-2-zoom-semantico`
- `feature/fn-3-terraform-export`

### Codex Fallback

Se Codex CLI falhar (quota, rate limit, erro):

1. Logar o erro
2. Fazer review usando **Claude Code como reviewer**
3. Usar persona "Senior Code Reviewer" conforme `review-fallback.md`
4. Continuar o fluxo normalmente

### Argumentos Implícitos

Ao chamar `/flow-next:work fn-N`, tratar como:

```
/flow-next:work fn-N --branch=new --review=codex
```

Ao chamar `/flow-next:plan <descricao>`, tratar como:

```
/flow-next:plan <descricao> --review=codex
```

## Config Aplicada

```json
{
  "branch": { "default": "new" },
  "review": { "backend": "codex" }
}
```
