# WhatsApp Event Engagement Strategy v1 — Kuramei

> Contexto: o Brasil tem um calendário de eventos culturais e nacionais que criam picos massivos de atenção coletiva. Este documento define como o Kuramei pode se beneficiar dessas janelas de maneira legítima, respeitando as políticas da Meta e evitando oportunismo tóxico.

---

## 1. Por Que Eventos Importam para o Kuramei

Eventos de massa criam três fenômenos exploráveis:

- **Pico de conversa:** pessoas estão no WhatsApp mais do que o normal, compartilhando opiniões, tirando dúvidas, procurando informações em tempo real.
- **Contexto emocional compartilhado:** o usuário está mais receptivo a interações que reconhecem o momento que ele está vivendo.
- **Gatilho de ativação:** eventos são pretextos naturais para o Kuramei contatar usuários inativos (com template aprovado) ou para usuários novos descobrirem o produto.

O risco: explorar isso de forma descuidada resulta em spam percebido, bloqueios, queda de quality rating e violação de políticas da Meta.

---

## 2. Calendário de Eventos Prioritários — Brasil

### Eventos de Alta Intensidade Cultural

**Copa do Mundo / Copa América / Brasileirão:**
- Audiência: dezenas de milhões. Copa do Mundo: pico histórico de uso de WhatsApp no Brasil.
- Oportunidade: informações em tempo real (escalações, resultados, tabelas), quiz de palpites, bolão de apostas (atenção: regras de gambling da Meta — ver seção 4).
- Janela: dias de jogo do Brasil especificamente têm o maior pico.

**BBB / A Fazenda / The Voice / outros reality shows:**
- Audiência engajada semanalmente; paredão/eliminação são momentos de pico.
- Oportunidade: palpites semanais, alertas de votação (atenção: politicamente neutro), recaps para quem não viu.
- Janela: domingo (paredão BBB) e quinta (eliminação Fazenda) são os dias quentes.

**Carnaval:**
- Oportunidade: programação de blocos, alertas de horário, informações sobre destinos, clima.
- Janela: 1 semana antes até quarta de cinzas.

**Eleições (municipais / estaduais / federais):**
- Audiência: todo o país durante o período eleitoral.
- **Alto risco político:** ver seção 4 e 5.
- Oportunidade legítima e segura: alertas de prazo (título, biometria), horário de votação, como votar, resultados oficiais.
- O que evitar absolutamente: qualquer conteúdo que pareça partidário ou eleitoral.

**Black Friday / Natal / Ano Novo:**
- Oportunidade: alertas de lista de compras, lembretes pessoais, organizador de presentes.
- Baixo risco político; alto potencial de utilidade.

**Dias temáticos de alto engajamento:**
- Dia das Mães (maio), Dia dos Pais (agosto), Dia dos Namorados (junho), Dia da Criança (outubro)
- Oportunidade: lembretes proativos, sugestões personalizadas (se o Kuramei conhece o usuário)

**Eventos de interesse local (hipótese, não confirmado):**
- Shows de artistas populares, lançamentos culturais, festivais regionais
- Oportunidade de engajamento localizado se Kuramei souber localização do usuário

---

## 3. Estratégias de Engajamento por Tipo de Evento

### 3.1 Padrão "Utilidade Situacional" (baixo risco, alto valor)

**Conceito:** o Kuramei resolve um problema concreto que o evento cria.

**Exemplos:**
- Copa do Mundo: "Jogo do Brasil hoje às 21h. Quer que eu te avise 30 min antes?"
- BBB: "Paredão fecha às 23h59. Quer um lembrete para votar?"
- Black Friday: "Você tem alguma lista de compras para acompanhar? Me manda que eu monitoro."
- Eleições: "Sua seção eleitoral é [X]. Votação abre às 8h. Quer lembrete?"

**Por que funciona:**
- Parte do usuário (inbound ou ativado por lembrete opt-in)
- Não depende de template de Marketing se o usuário já está em conversa ativa
- Adiciona valor real ao momento de vida do usuário
- Não é percebido como spam

**Política:** seguro. Enquadra-se como Utility ou service conversation.

### 3.2 Padrão "Contexto de Reativação" (risco médio, precisa de template)

**Conceito:** usuário inativo há mais de 24h. Kuramei envia template aprovado usando o evento como contexto.

**Exemplo de template:**
```
"Olá {{1}}, tá assistindo o jogo hoje? Posso te dar as informações mais rápido aqui pelo WhatsApp — 
tabela, escalação, horário. Me manda uma mensagem quando quiser saber algo. 
Para não receber mais, responda PARAR."
```

**Regras de ouro para esse padrão:**
- Template deve ser pré-aprovado antes do evento (submeter com 2-3 dias de antecedência)
- Deve conter opt-out claro
- Frequência máxima: 1 mensagem de reativação por evento / por usuário inativo
- Segmentar por engajamento passado: só reativar usuários que já usaram o produto (não cold list)
- Categoria correta: Marketing (se for engajamento) ou Utility (se for informação útil vinculada a uma ação anterior)

**Política:** permitido, mas monitorar quality rating de perto. Se read rate cair abaixo de 40% ou block rate subir, pausar campanha.

### 3.3 Padrão "Feature Sazonal" (baixo risco, alto diferencial)

**Conceito:** o Kuramei lança uma feature temporária vinculada ao evento, que o usuário pode ativar voluntariamente.

**Exemplos:**
- "Ative o modo Copa: te aviso dos gols do Brasil em tempo real."
- "Quer acompanhar o BBB comigo? Te mando um resumo toda manhã do que aconteceu na madrugada."
- "Modo Eleição: te aviso quando os primeiros resultados oficiais saírem."

**Por que funciona:**
- Usuário opt-in explícito na feature = alta receptividade
- Cria motivo de abrir o Kuramei organicamente
- Diferencia o produto de assistentes genéricos
- Pode ser divulgado externamente (landing page, social) como call-to-action de aquisição

**Política:** seguro. Usuário solicitou. Se usar templates para entregas subsequentes (gols, resultados), categoria Utility.

### 3.4 Padrão "Aquisição via Evento" (risco médio, precisa de cuidado)

**Conceito:** usar o evento como tema de marketing externo (ads, posts, links) para atrair novos usuários ao WhatsApp.

**Canais possíveis:**
- Link "Fale com o Kuramei" em posts de redes sociais com contexto do evento
- QR code em material impresso (se aplicável)
- Campanha no Instagram/TikTok/YouTube com CTA para WhatsApp

**Regra:** o primeiro contato via link externo → usuário manda mensagem → abre service conversation. Está dentro das regras de opt-in (usuário iniciou).

**Para escalar:** WhatsApp Click-to-Chat ads (via Meta Ads Manager) permitem criar campanha paga com botão que abre conversa no WhatsApp diretamente. Free Entry Point conversation: primeiro janela de 72h grátis (não 24h).

**Política:** seguro se usuário inicia. Ads do WhatsApp são o canal mais limpo de aquisição.

---

## 4. Guardrails — O Que Não Fazer

### 4.1 Jamais: Apostas e Bolões com Dinheiro Real

- **Político:** WhatsApp Business Policy proíbe facilitação de jogos de azar sem autorização explícita por mercado.
- **Risco prático:** template com conteúdo de aposta é rejeitado; account pode ser suspensa.
- **O que é permitido:** bolão de palpites sem dinheiro envolvido, resultado de copa como curiosidade, quiz.
- **O que é proibido:** qualquer funcionalidade onde o Kuramei processa, facilita ou referencia apostas com dinheiro real.

### 4.2 Jamais: Conteúdo Eleitoral Partidário

- Não enviar mensagem que favoreça candidato X ou partido Y, mesmo que disfarçada de informação
- Não usar WhatsApp para mobilização eleitoral (é ilegal no Brasil em certos períodos — TSE regula isso)
- Não criar template com nomes de candidatos, siglas de partido ou slogan político
- **Meta proíbe ativamente:** conteúdo de desinformação eleitoral; conta pode ser suspensa rapidamente

**O que é seguro:**
- "Eleições municipais são este domingo. Lembrete de votação às 8h?"
- "Seu horário de votação: 8h às 17h. Leva documento com foto."
- Apenas logística, datas, procedimentos — sem opinião ou direcionamento

### 4.3 Jamais: Explorar Tragédias ou Crises como Gancho de Marketing

- Desastres naturais, acidentes com vítimas, violência — nunca usar como contexto de engajamento
- Permitido: oferecer utilidade real (ex: canal de ajuda durante enchente), mas nunca transformar em campanha
- Regra: se parece oportunista, não fazer

### 4.4 Jamais: Volume Antes de Qualidade

- Não enviar template de reativação de evento para toda a base de uma vez
- Começar com 5-10% da base, medir read rate e block rate, escalar só se números forem bons
- Block rate acima de 2% = parar tudo e revisar

### 4.5 Evitar: Templates Genéricos de "Felicitação"

- "Feliz Natal! Clique aqui para conhecer o Kuramei" → spam percebido
- Templates sem contexto de uso anterior do produto têm read rate baixo e block rate alto
- **Regra:** personalização mínima obrigatória. Se não sabe nada do usuário, não mande template de evento.

---

## 5. Eventos de Alto Risco Político — Protocolo Específico

### Por Que Política é Categoria Especial

O Brasil tem clima político polarizado. Qualquer percepção de viés do Kuramei:
- Gera reports em massa (block + report = queda severa de quality rating)
- Pode resultar em cobertura negativa de mídia ("AI que faz campanha política")
- Pode atrair regulação do TSE ou órgãos de proteção ao consumidor
- Viola explicitamente as políticas da Meta sobre desinformação

### Protocolo para Eleições

1. **Modo neutro ativado:** o Kuramei não opina sobre candidatos, partidos ou políticas
2. **Respostas a perguntas políticas:** "Sobre candidatos e partidos, prefiro não opinar. Posso te ajudar com informações de horário, local de votação, ou outras coisas."
3. **Templates de período eleitoral:** submeter apenas com conteúdo 100% logístico/factual; incluir fonte oficial (TSE)
4. **Nunca responder com IA generativa sobre temas eleitorais** sem validação humana do output — risco de alucinação com informação política

### Protocolo para Copa / BBB (eventos de baixo risco político mas alta sensibilidade)

- Não tomar partido em discussões de torcida de forma que gere conflito
- "Estou torcendo para o Brasil" é OK. "Time X é melhor que time Y" pode gerar resposta hostil de torcedores do time Y → monitorar

---

## 6. Calendário Operacional de Eventos — Exemplo Prático (2026)

```
Janeiro:
- Sem grande evento nacional; foco em retenção de base

Fevereiro:
- Carnaval (dias exatos a confirmar)
  → Feature: "Programação de blocos na sua cidade"
  → Template utility: "Carnaval chegou! Quer que eu te ajude a organizar sua programação?"

Março–Junho:
- Campeonatos de futebol (Brasileirão, Libertadores)
  → Feature: "Modo Futebol: resultados e tabela pelo chat"

Junho:
- Copa América / competições internacionais (verificar calendário)
- Dia dos Namorados (12/06)
  → Feature: "Lembretes e sugestões de presentes"

Julho–Agosto:
- A Fazenda (data de estreia a confirmar)
- Dia dos Pais (agosto)

Outubro:
- Eleições Municipais (anos ímpares) — 2026 não tem
- Dia da Criança (12/10)

Novembro:
- Black Friday (última sexta de novembro)
  → Template marketing: lista de compras, alertas de preço (se feature existir)

Dezembro:
- Natal / Ano Novo
  → Templates utility: lembretes de presentes, organizador de festas
```

**2026 especial:** Copa do Mundo (EUA/Canadá/México, junho-julho 2026) — maior evento do ano.
Preparação deve começar em abril/2026 com definição de features, templates submetidos e infraestrutura escalável.

---

## 7. Framework de Decisão para Qualquer Evento

Antes de criar campanha ou feature para evento, responder:

1. **O usuário pediu isso ou vai genuinamente querer?** (Se não, não fazer)
2. **Tem utilidade concreta ou é só marketing disfarçado?** (Se só marketing, repensar)
3. **Já tenho template aprovado ou tenho tempo hábil para aprovação?** (2-3 dias de antecedência mínimo)
4. **Vou segmentar por relevância ou mandar para toda a base?** (Segmentar sempre)
5. **Tenho opt-out claro e funcional?** (Obrigatório)
6. **Vou monitorar read rate e block rate em tempo real?** (Obrigatório; pausar se block rate > 2%)
7. **Tem algum risco político, de gambling ou de sensibilidade cultural?** (Se sim, revisar com protocolo específico)
8. **Seria vergonhoso se isso fosse publicado num jornal como "empresa explorou evento X"?** (Teste do jornal — se sim, não fazer)

---

## 8. Métricas de Sucesso para Campanhas de Evento

- **Read rate de template:** meta > 60% (industry benchmark gira em 40-60%)
- **Response rate:** % de usuários que respondem após receber template (meta: > 15%)
- **Retention lift:** usuários que receberam campanha de evento têm retenção D7 maior que quem não recebeu?
- **Block rate:** < 1% é aceitável; > 2% = campanha problemática, pausar
- **Conversão:** % de usuários que ativaram feature sazonal / completaram flow
- **New user acquisition:** usuários novos adquiridos via CTA externo durante o evento

---

## 9. Visão Ambiciosa: Kuramei como Companheiro de Evento

O sonho de longo prazo não é "mandar mensagem na Copa" — é o Kuramei ser o **companheiro natural de brasileiros em momentos de pico cultural**.

- Durante o jogo, o usuário não abre Google — abre o Kuramei para saber resultado, escalação, VAR.
- Durante o BBB, o Kuramei sabe quem o usuário torce e manda resumo da madrugada às 7h.
- Na Black Friday, o Kuramei já sabe a lista de desejos do usuário e avisa quando o preço caiu.

Esse nível de integração com o cotidiano — especialmente em momentos emocionais coletivos — cria moat de memória e de contexto que nenhum LLM genérico tem.

O diferencial não é o modelo de IA. É o contexto acumulado de meses de uso combinado com o timing certo.

---

## Referências

- WhatsApp Business Messaging Policy: https://business.whatsapp.com/policy
- Template Guidelines: https://web.archive.org/web/20241226223005/https://developers.facebook.com/docs/whatsapp/message-templates/guidelines/
- Opt-in Requirements: https://web.archive.org/web/20250115022754/https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/
- Pricing (Free Entry Point Conversations): https://web.archive.org/web/20241222163826/https://developers.facebook.com/docs/whatsapp/pricing/
- Quality Rating & Messaging Limits: https://web.archive.org/web/20250107084438/https://developers.facebook.com/docs/whatsapp/messaging-limits
- TSE (regulação eleitoral Brasil): https://www.tse.jus.br/comunicacao/noticias/
