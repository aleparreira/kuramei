# WhatsApp Risks & Compliance Checklist — Kuramei

> Uso: revisar este checklist antes de qualquer lançamento, campanha ou mudança significativa de produto.
> Atualizar conforme políticas da Meta mudam (recorrência mínima: trimestral).
> Baseado em documentação oficial Meta (verificada fev/2026) e conhecimento prático de operações WhatsApp.

---

## Categorias de Risco

```
🔴 PROIBIDO   — Pode resultar em suspensão imediata de conta
🟠 ARRISCADO  — Requer cuidado operacional e monitoramento ativo
🟢 PERMITIDO  — OK com as políticas, desde que implementado corretamente
```

---

## Bloco 1: Conta e Configuração

### 1.1 Meta Business Portfolio
- [ ] 🟢 Business Portfolio criado com informações verdadeiras e completas
- [ ] 🟢 WABA (WhatsApp Business Account) vinculada ao Portfolio correto
- [ ] 🟠 Business Verification submetida e aprovada (sem verificação: limite de 250 conv/dia travado, sem display name aprovado)
- [ ] 🔴 NUNCA criar múltiplas contas para contornar limites de tiering
- [ ] 🔴 NUNCA usar dados falsos no cadastro do business (documentos, nome, CNPJ)

### 1.2 Número de Telefone
- [ ] 🟢 Número dedicado à plataforma (não o número pessoal do fundador)
- [ ] 🟢 Número com código de país e área (+55 11 XXXXX-XXXX)
- [ ] 🟢 Número capaz de receber SMS ou chamada de voz para verificação
- [ ] 🔴 NUNCA usar número já ativo no app WhatsApp Messenger sem primeiro excluir a conta do app
- [ ] 🔴 NUNCA usar short code (não é suportado)
- [ ] 🟠 Número VoIP: possível, mas pode ter instabilidade na verificação — preferir número móvel real

### 1.3 Display Name
- [ ] 🟢 Display name reflete nome real e conhecido do negócio (Kuramei)
- [ ] 🟢 Nome submetido para aprovação via WhatsApp Manager
- [ ] 🔴 NUNCA usar nome genérico ou marca alheia (Meta rejeita e pode reportar)
- [ ] 🔴 NUNCA usar nome enganoso que possa confundir com outras marcas

---

## Bloco 2: Opt-in e Consentimento

### 2.1 Requisitos de Opt-in
- [ ] 🟢 Opt-in documentado antes de enviar qualquer mensagem business-initiated
- [ ] 🟢 Opt-in menciona claramente: (a) o nome do negócio (Kuramei) e (b) que o usuário receberá mensagens
- [ ] 🟢 Opt-in cumpre LGPD e legislação local aplicável
- [ ] 🔴 NUNCA enviar template proativo para usuários que não deram opt-in
- [ ] 🔴 NUNCA comprar ou usar listas de telefones de terceiros sem opt-in verificado
- [ ] 🟢 Opt-in via first message (usuário manda a primeira mensagem → opt-in implícito para service conversations)
- [ ] 🟢 Para templates proativos: coletar opt-in explícito durante onboarding

### 2.2 Opt-out
- [ ] 🟢 Mecanismo de opt-out claro em todos os templates proativos ("responda PARAR" ou botão)
- [ ] 🟢 Opt-out honrado imediatamente (não enviar mais mensagens após solicitação)
- [ ] 🟢 Log de opt-outs mantido para auditoria
- [ ] 🔴 NUNCA ignorar pedidos de opt-out ou tentar contornar (violação grave de política)

### 2.3 Categorias de Opt-in por Contexto
- [ ] 🟢 Service conversations: apenas quando usuário iniciou a conversa nas últimas 24h
- [ ] 🟢 Utility templates: usuário realizou ação que justifica a notificação (criou lembrete, fez pedido)
- [ ] 🟠 Marketing templates: opt-in explícito preferido; monitorar read rate e block rate de perto
- [ ] 🔴 NUNCA usar Authentication templates para fins que não sejam autenticação real

---

## Bloco 3: Templates

### 3.1 Criação e Aprovação
- [ ] 🟢 Templates criados via WhatsApp Manager ou API com estrutura correta
- [ ] 🟢 Variáveis no formato `{{1}}`, `{{2}}` (sequencial, sem caracteres especiais)
- [ ] 🟢 Samples incluídos na submissão (obrigatório quando há variáveis)
- [ ] 🟢 Categoria correta atribuída (Marketing / Utility / Authentication)
- [ ] 🔴 NUNCA usar Authentication para enviar mensagens de marketing
- [ ] 🔴 NUNCA criar template duplicado com mesmo body/footer de outro já existente
- [ ] 🟠 Submeter templates com antecedência mínima de 3 dias antes do uso (aprovação pode levar 24h)

### 3.2 Conteúdo Proibido em Templates
- [ ] 🔴 Não solicitar número de cartão completo, CPF completo, senha, ou dados bancários completos
- [ ] 🔴 Não conter ameaças ao usuário (ação legal, exposição pública, etc.)
- [ ] 🔴 Não conter conteúdo enganoso ou promessas que o negócio não pode cumprir
- [ ] 🔴 Não conter conteúdo de apostas/jogos de azar sem autorização específica
- [ ] 🔴 Não conter conteúdo de cunho político eleitoral (candidatos, partidos, slogans)
- [ ] 🔴 Não conter conteúdo adulto, de discriminação ou ódio
- [ ] 🟠 Não terminar template com variável (causa rejeição)
- [ ] 🟠 Não ter ratio muito alto de variáveis em relação ao texto fixo

### 3.3 Monitoramento de Templates
- [ ] 🟢 Monitorar quality rating de cada template (High / Medium / Low)
- [ ] 🟢 Template com status PAUSED: investigar causa antes de tentar reativar
- [ ] 🟢 Template com status DISABLED: revisar e corrigir antes de resubmeter
- [ ] 🟠 Template com quality Medium: reduzir envios e melhorar segmentação
- [ ] 🔴 Não continuar enviando template com quality Low sem corrigir — risco de desativar o número

---

## Bloco 4: Quality Rating e Messaging Limits

### 4.1 Quality Rating do Número
- [ ] 🟢 Monitorar quality rating do número semanalmente no WhatsApp Manager
- [ ] 🟢 Quality High: operação normal
- [ ] 🟠 Quality Medium: investigar causa (block rate alto? templates ruins? volume excessivo?)
- [ ] 🔴 Quality Low: STOP em envios proativos, revisar toda estratégia de mensagens
- [ ] 🟢 Ações preventivas: segmentar bem, personalizar, não enviar spam, manter frequência razoável

### 4.2 Messaging Tiers
- [ ] 🟢 Tier inicial (250/dia): adequado para beta fechado
- [ ] 🟢 Subir para Tier 1 (1k/dia): via Business Verification ou 1k conversas em 30 dias
- [ ] 🟢 Tiers 2/3/ilimitado: via automatic scaling após Tier 1 + quality High
- [ ] 🟠 Se tier travado em 250 após verificação: abrir ticket de suporte (Messaging Tier Upgrade)
- [ ] 🔴 NUNCA tentar burlar limite de tier (múltiplos números para distribuir volume sem aprovação)

### 4.3 Rate Limiting
- [ ] 🟢 Implementar retry com backoff exponencial para erros 429 (rate limit hit)
- [ ] 🟢 Não enviar bursts de mensagens em loop sem throttling
- [ ] 🟠 Para envios em lote: distribuir ao longo de horas, não segundos

---

## Bloco 5: Webhook e Infraestrutura

### 5.1 Segurança do Webhook
- [ ] 🟢 Endpoint HTTPS com certificado válido
- [ ] 🟢 Validação de assinatura HMAC-SHA256 (X-Hub-Signature-256) em TODA requisição
- [ ] 🔴 NUNCA processar eventos sem validar assinatura — vulnerabilidade crítica
- [ ] 🟢 Token de verificação de webhook guardado como secret (não no código-fonte)

### 5.2 Confiabilidade
- [ ] 🟢 Responder ao webhook com HTTP 200 em ≤ 5 segundos
- [ ] 🟢 Processamento assíncrono: aceitar evento rapidamente, processar em background
- [ ] 🟢 Idempotência: processar o mesmo evento duas vezes não gera duplicata
- [ ] 🟠 Sem resposta: Meta reenvia eventos, mas descarta após múltiplas falhas — perda de dados
- [ ] 🟢 Logging completo de todos os eventos recebidos com timestamp e message ID

### 5.3 Credenciais e Segurança
- [ ] 🟢 Token de acesso da API armazenado em secret manager (AWS Secrets Manager, não hardcoded)
- [ ] 🟢 Rotação de tokens seguindo boas práticas da Meta
- [ ] 🔴 NUNCA expor token de acesso em logs, código-fonte ou repositório público
- [ ] 🟢 Permissões mínimas necessárias configuradas no app Meta

---

## Bloco 6: Categorias de Negócio

### 6.1 Setores Permitidos para Kuramei (como assistente pessoal)
- [ ] 🟢 Produtividade pessoal: OK
- [ ] 🟢 Informações gerais e pesquisa: OK
- [ ] 🟢 Lembretes e agendamentos: OK
- [ ] 🟢 Notícias e informações de eventos: OK (neutro, factual)
- [ ] 🟢 Utilidades do dia-a-dia: OK

### 6.2 Setores Restritos — Requer Atenção
- [ ] 🟠 Informações financeiras/investimentos: se o Kuramei der recomendações de investimento, pode ser classificado como serviço financeiro regulado → verificar escopo exato da feature
- [ ] 🟠 Saúde: informações gerais são OK; diagnósticos ou recomendações médicas não são
- [ ] 🟠 Notícias: curadoria de notícias é OK; geração de notícias falsas é violação grave
- [ ] 🟠 Loteria/sorteios com prêmio: restrito, precisa de aprovação por mercado

### 6.3 Setores Proibidos
- [ ] 🔴 Armas e munição (qualquer venda ou facilitação)
- [ ] 🔴 Drogas e substâncias controladas
- [ ] 🔴 Conteúdo adulto
- [ ] 🔴 Apostas com dinheiro real (sem autorização específica)
- [ ] 🔴 Serviços de espionagem ou vigilância não autorizada
- [ ] 🔴 Produtos de contrafação

---

## Bloco 7: Conteúdo Gerado por IA

### 7.1 Riscos Específicos de LLM em Produto WhatsApp

- [ ] 🟠 **Alucinação:** o modelo pode gerar informação falsa com confiança. Validar em domínios críticos (saúde, finanças, jurídico, eleições)
- [ ] 🟠 **Conteúdo inadequado:** filtro de saída obrigatório para detectar conteúdo proibido pelas políticas da Meta antes de enviar
- [ ] 🔴 **Desinformação eleitoral:** outputs sobre eleições/candidatos devem ser revisados ou bloqueados via guardrail
- [ ] 🟠 **Dados pessoais do usuário em prompts:** garantir que dados sensíveis não vazam para logs de API de terceiros
- [ ] 🟠 **Prompt injection via mensagem do usuário:** o usuário pode tentar manipular o comportamento do Kuramei via mensagem; aplicar sanitização e limites de escopo

### 7.2 Políticas de IA da Meta
- [ ] 🟢 Não usar a Cloud API para criar conteúdo de desinformação em massa
- [ ] 🔴 Não usar WhatsApp para enviar conteúdo gerado por IA em escala sem supervisão (risco de violação de política de spam + AI misuse)
- [ ] 🟢 Transparência com o usuário: quando pertinente, deixar claro que está interagindo com IA

---

## Bloco 8: LGPD e Privacidade

### 8.1 Dados Coletados no WhatsApp
- [ ] 🟢 Política de privacidade publicada e acessível (link no perfil do WhatsApp Business)
- [ ] 🟢 Mapeamento dos dados coletados: número de telefone, nome, histórico de mensagens, preferências
- [ ] 🟢 Base legal para tratamento (consentimento + legítimo interesse documentados)
- [ ] 🟢 Retenção de dados definida: histórico de conversa por quanto tempo?
- [ ] 🟢 Direito de exclusão: usuário pode pedir que dados sejam apagados → processo definido e funcional
- [ ] 🔴 NUNCA compartilhar histórico de conversas com terceiros sem consentimento explícito
- [ ] 🟠 Dados de menores: WhatsApp é 13+ (16+ em alguns países). Não coletar dados de menores sem processo específico.

### 8.2 Armazenamento
- [ ] 🟢 Mensagens armazenadas criptografadas em repouso
- [ ] 🟢 Acesso ao banco de dados restrito (princípio de menor privilégio)
- [ ] 🟢 DynamoDB (stack atual do Kuramei): dados em região adequada (sa-east-1 preferível para dados de brasileiros)

---

## Bloco 9: Monitoramento Contínuo e Alertas

### 9.1 Sinais de Alerta Operacional

Monitorar e agir imediatamente se:

- [ ] 🔴 Quality rating do número caiu para Low
- [ ] 🔴 Template com status DISABLED (usuários bloqueando em massa)
- [ ] 🔴 Webhook com taxa de falha > 5% em janela de 1h
- [ ] 🔴 Alerta da Meta: `INCREASED_CAPABILITIES_ELIGIBILITY_FAILED` (tier não subiu)
- [ ] 🟠 Read rate de template abaixo de 40% (revisar targeting e conteúdo)
- [ ] 🟠 Block rate acima de 1% em campanha de template
- [ ] 🟠 Erros 130429 (rate limit) aparecendo frequentemente

### 9.2 Webhooks de Sistema para Monitorar
- [ ] 🟢 `messages` — status de entrega de todas as mensagens
- [ ] 🟢 `message_template_status_update` — template mudou de status
- [ ] 🟢 `account_alerts` — alertas de conta (tier, qualidade)
- [ ] 🟢 `business_capability_update` — mudança de limite de mensagens
- [ ] 🟢 `phone_number_name_update` — aprovação/rejeição de display name

### 9.3 Revisão Periódica de Compliance
- [ ] Revisão mensal: templates ativos, quality rating, tier atual
- [ ] Revisão trimestral: políticas da Meta (atualizar este documento se houve mudanças)
- [ ] Revisão semestral: LGPD compliance completo, política de privacidade atualizada
- [ ] Revisão imediata: se Meta anunciar mudança de política ou pricing

---

## Bloco 10: Plano de Contingência

### 10.1 Se o Número for Suspenso/Banido
1. Verificar notificação da Meta (WhatsApp Manager + email)
2. Identificar causa: quality rating? violação de política? volume excessivo?
3. Corrigir causa raiz antes de qualquer apelação
4. Submeter apelação via Business Support Home (para bans injustos)
5. Se ban permanente: registrar novo número (mas a conta WABA pode também estar comprometida)
6. **Prevenção:** manter backup de número para emergências (segundo número registrado no WABA)

### 10.2 Se Template for Desativado em Massa
1. STOP imediato nos envios daquele template
2. Verificar qual feedback causou o disable (block rate? report rate?)
3. Revisar template para remover problema
4. Resubmeter com melhorias
5. Não reativar antes de entender a causa

### 10.3 Se Quality Rating Cair
1. Parar envios proativos imediatamente
2. Analisar últimas campanhas: quais templates foram enviados? Para quem? Com que frequência?
3. Identificar o template ou segmento com problema
4. Aguardar melhora orgânica (usuários param de bloquear → rating recupera em ~7 dias)
5. Retomar envios com volume reduzido e segmentação mais precisa

---

## Checklist de Pré-Lançamento (Go/No-Go)

Antes de qualquer lançamento para usuários reais, confirmar:

- [ ] Business Verification aprovada (ou no mínimo submetida)
- [ ] Display name aprovado
- [ ] Webhook com validação HMAC funcionando
- [ ] Resposta de webhook < 5s (testado em staging)
- [ ] Idempotência do processamento validada
- [ ] Templates do onboarding aprovados
- [ ] Template de opt-out / reativação aprovado
- [ ] Mecanismo de opt-out funcional e testado
- [ ] Políticas de privacidade publicadas
- [ ] Monitoramento de quality rating ativo
- [ ] Alertas de webhook failure configurados
- [ ] Plano de contingência documentado (este documento)
- [ ] Logs de produção acessíveis sem acesso direto ao banco

---

## Referências e Links Oficiais

- WhatsApp Business Policy: https://business.whatsapp.com/policy
- WhatsApp Commerce Policy: https://www.whatsapp.com/legal/commerce-policy/
- Business Verification: https://www.facebook.com/business/help/2058515294227817
- Template Guidelines: https://web.archive.org/web/20241226223005/https://developers.facebook.com/docs/whatsapp/message-templates/guidelines/
- Messaging Limits & Quality Rating: https://web.archive.org/web/20250107084438/https://developers.facebook.com/docs/whatsapp/messaging-limits
- Opt-in Requirements: https://web.archive.org/web/20250115022754/https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/
- Webhook Security (assinatura): https://developers.facebook.com/docs/messenger-platform/webhooks#security
- LGPD (Lei Geral de Proteção de Dados): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Business Support Home (apelações): https://business.facebook.com/business-support-home
- Developer Support WhatsApp: https://developers.facebook.com/docs/whatsapp/support
