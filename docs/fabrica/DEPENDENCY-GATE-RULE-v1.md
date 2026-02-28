# Dependency Gate Rule v1

## Objetivo
Evitar execução fora de ordem entre tickets dependentes (arquitetura -> implementação -> integração).

## Regra
1. Todo ticket que depende de outro deve declarar `depends_on`.
2. Se `depends_on` não estiver em `done/G3` + `ARQ-GO`, ticket dependente permanece em `G0`.
3. Forja só implementa código quando houver ARQ-GO explícito no tópico e no markdown.

## Exemplo atual
- NEXT-5 depende de NEXT-4.
- NEXT-5 só pode codar após ARQ-GO do NEXT-4.

## Enforcement
- Codex verifica dependências na abertura diária.
- Qualquer desvio: STOP imediato e correção de status no ticket.
