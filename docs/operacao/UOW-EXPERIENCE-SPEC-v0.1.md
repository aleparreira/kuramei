# Kuramei — UOW Experience Spec v0.1

## Objetivo
Definir o padrão mínimo de experiência para o usuário sentir fluidez, inteligência real e confiança contínua.

> Regra: funcional sem UOW não escala por confiança.

---

## 1) Resultado esperado (percepção do usuário)
O usuário deve sentir:
- "Ele me entende sem eu explicar tudo"
- "Ele me responde rápido"
- "Ele lembra de mim"
- "Ele resolve, não só conversa"
- "Posso confiar"

---

## 2) Pilares de UOW (obrigatórios)

### P1. Latência percebida
- Primeira resposta útil: **<= 3s** (alvo p50)
- Resposta final completa: **<= 10s** (alvo p95, tarefas simples)
- Se demorar: informar progresso de forma curta

### P2. Consistência de persona
- Tom estável por usuário
- Nome/estilo do agente persistido
- Sem oscilar entre formal/informal aleatório

### P3. Memória confiável
- Lembrar preferências declaradas
- Recuperar contexto recente relevante
- Nunca fingir memória quando não tiver

### P4. Qualidade de decisão
- Quando tiver alta confiança: agir direto
- Quando média: confirmar 1 ponto crítico
- Quando baixa: pedir clarificação curta

### P5. Resolução real de tarefa
- Cada interação deve priorizar resultado acionável
- "Conversa boa" sem ação = falha de produto

### P6. Segurança sem atrito
- Guardrails invisíveis ao usuário
- Recusa elegante com alternativa útil

---

## 3) Contrato de comportamento por confiança

### High confidence
- Executa e entrega resultado
- Não faz perguntas desnecessárias

### Medium confidence
- Faz 1 pergunta objetiva de confirmação
- Prossegue imediatamente após resposta

### Low confidence
- Explica limite em 1 frase
- Oferece 2 caminhos claros de próximo passo

---

## 4) Mínimo de memória por usuário (fase inicial)
Guardar:
- nome preferido
- preferências de tom
- preferências operacionais (ex.: horários, tipo de lembrete)
- últimos tópicos ativos

Não guardar na fase inicial:
- inferência sensível sem consentimento
- scoring comportamental/financeiro

---

## 5) UX de resposta (padrão)
- Curta por padrão
- Estruturada por ação
- Sem texto corporativo
- Sem respostas vagas quando há dado insuficiente (pedir contexto)

Formato recomendado:
1. resultado
2. justificativa curta (se necessário)
3. próximo passo

---

## 6) Métricas de UOW (sem isso não há evolução)

### Métricas de percepção
- % de mensagens com follow-up positivo do usuário
- taxa de continuidade de conversa (>3 turns)
- taxa de retorno em 7 dias

### Métricas de execução
- task success rate (resolvido/não resolvido)
- clarifications por task (quanto menor, melhor sem perder qualidade)
- rollback de ação por erro

### Métricas de confiança
- erros de memória reportados
- respostas corrigidas pelo usuário
- abandono após resposta ruim

---

## 7) Anti-padrões (proibidos)
- Verbosidade para esconder incerteza
- "Inventar" memória/contexto
- Tom inconsistente entre mensagens
- Resposta perfeita porém lenta demais
- Resposta correta porém não acionável

---

## 8) Checklist de release (UOW Gate)
Uma entrega só passa se:
- [ ] não piora latência percebida
- [ ] mantém consistência de persona
- [ ] não aumenta erro de memória
- [ ] melhora ou mantém task success
- [ ] mantém guardrails sem fricção excessiva

---

## 9) Plano de implementação (30 dias)

### Semana 1
- definir baseline de latência e task success
- implementar contrato de confiança (high/medium/low)

### Semana 2
- ativar memória mínima por usuário
- padronizar estilo de resposta

### Semana 3
- instrumentar métricas de percepção e execução
- corrigir gargalos de latência

### Semana 4
- rodar teste com 20-30 usuários
- coletar feedback estruturado
- ajustar antes de escalar

---

## 10) Definição de UOW pronto (fase beta)
Considerar UOW atingido quando, por 2 semanas seguidas:
- p95 resposta simples <= 10s
- task success >= 70%
- erro de memória crítico < 3%
- retorno 7d >= 35%
- feedback qualitativo confirma "parece meu assistente de verdade"
