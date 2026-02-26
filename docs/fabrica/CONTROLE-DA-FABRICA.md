# Fábrica — Controle Operacional

## Canal oficial da fábrica
Canal único para decisões de execução, gate e rollback:

- **Discord #forja** (`1475300717987368960`)

## Regra
Toda decisão operacional relevante deve ser registrada no canal oficial.
Sem registro no canal oficial = decisão não oficial.

## O que registrar obrigatoriamente
1. Entrada de ticket em execução (Now)
2. Resultado de gates (0→3)
3. Decisão de ship / ajuste / rollback
4. Risco aberto (se existir)
5. Encerramento do ciclo

## Formato padrão de registro
```
[TICKET] <id/nome>
[STATUS] em execução | bloqueado | aprovado | rollback
[GATES] G0:ok|fail G1:ok|fail G2:ok|fail G3:ok|fail
[RISCO] <resumo curto>
[DECISÃO] <ship|ajustar|rollback>
```

## Guardrail
Não discutir decisão crítica em múltiplos canais paralelos.
Discussão paralela é permitida; decisão final só vale no canal oficial.
