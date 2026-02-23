/**
 * @kuramei/whatsapp - Meta WhatsApp Cloud API adapter
 */

export * from './types.js';

export {
  validateSignature,
  computeSignature,
  createSignatureHeader,
  InvalidSignatureError,
} from './signature.js';

export {
  buildButtonMessage,
  buildListMessage,
  createSection,
  createRow,
  InteractiveMessageError,
  MAX_BUTTONS,
  MAX_LIST_SECTIONS,
  MAX_ROWS_PER_SECTION,
  MAX_BUTTON_TITLE_LENGTH,
  MAX_BODY_LENGTH,
  MAX_HEADER_LENGTH,
  MAX_FOOTER_LENGTH,
  type ButtonDefinition,
  type ButtonMessageOptions,
  type ListMessageOptions,
} from './interactive.js';

export {
  TenantBoundSender,
  createTenantAwareSender,
  SendMessageError,
  type WhatsAppSender,
  type WhatsAppSenderConfig,
  type SecretsProvider,
} from './sender.js';

export {
  WebhookHandler,
  createWebhookHandler,
  WebhookVerificationError,
  type WebhookHandlerConfig,
  type ParsedMessage,
  type ParsedStatus,
  type WebhookProcessResult,
} from './webhook-handler.js';
