# Kuramei — Branching Policy v1

## Objetivo
Garantir rastreabilidade clara: o que foi feito, quando, por quem e em qual contexto (fábrica/produto/operação).

## Regras principais
1. `main` é sempre estável.
2. Cada frente relevante ganha branch própria.
3. Um branch não deve misturar naturezas diferentes de mudança.
4. Todo ticket NOW deve referenciar branch e commit.

## Convenções de nome
- `feat/<tema-curto>` — novas funcionalidades
- `fix/<tema-curto>` — correções
- `chore/<tema-curto>` — manutenção técnica
- `docs/<tema-curto>` — documentação

Exemplos:
- `feat/factory-operationalization`
- `fix/heartbeat-ci-noise`
- `docs/uow-spec`

## Escopo por branch
- Branch de feature: código + testes + docs da feature
- Branch de docs: apenas docs
- Branch de operação: ajustes de jobs/config/runbook

## Commits
- Pequenos, semânticos e com intenção clara
- Um commit por mudança lógica
- Mensagem recomendada: `<tipo>(<escopo>): <resumo>`

Exemplos:
- `test(factory): pass when package has no tests to avoid false-negative pipeline`
- `docs(factory): operationalization and heartbeat matrix`

## Fluxo padrão
1. Criar branch
2. Implementar
3. Atualizar docs obrigatórias
4. Rodar checks
5. Push
6. Abrir PR
7. Registrar no ticket fórum + markdown

## Proibições
- Comitar segredo/token/config sensível
- Misturar mudanças não relacionadas no mesmo branch
- Trabalhar direto em `main`

## Controle de risco
- Snapshot de jobs/config só com redaction
- Arquivos sensíveis fora do versionamento (gitignore)

## Integração com tickets
Todo ticket NOW deve ter:
- `branch`
- `commit(s)`
- `status/gate`
- `forum_thread_id`

Sem esses campos, ticket não é considerado rastreável.
