# Docs — Kuramei

Documentação viva do produto. Regra principal:

**Sem docs atualizada = task não concluída.**

## Estrutura obrigatória

Toda entrega relevante deve atualizar pelo menos uma destas frentes:

1. **Fábrica** (`docs/fabrica/`)
   - fluxo de desenvolvimento
   - testes e quality gates
   - pipelines e critérios de pronto

2. **Backoffice** (`docs/backoffice/`)
   - operações administrativas
   - suporte e atendimento
   - gestão de usuários e incidentes

3. **Operação** (`docs/operacao/`)
   - arquitetura em produção
   - deploy, monitoramento, runbooks
   - SLO/SLA e recuperação de falhas

4. **Mercado/Cliente (GTM)** (`docs/gtm/`)
   - ICP e posicionamento
   - aquisição e ativação
   - retenção, monetização e métricas

## Checklist de conclusão por task

Antes de marcar qualquer task como done:

- [ ] Código entregue e validado
- [ ] Testes relevantes executados
- [ ] Docs atualizada na(s) pasta(s) correta(s)
- [ ] Decisões registradas (quando houver trade-off)
- [ ] Próximo passo explícito

## Documentos base

- Manifesto do produto: `docs/MANIFESTO.md`
- PRD(s): `docs/` e `tasks/`
- Runbook de deploy: `docs/runbook-deploy.md`

## Convenções

- Escrever docs de forma objetiva e acionável.
- Evitar texto de marketing dentro de docs operacionais.
- Preferir exemplos reais de comando/fluxo.
- Atualizar docs **no mesmo PR/commit** da mudança.
