/**
 * WhatsApp Cloud API Types
 *
 * Type definitions for Meta WhatsApp Cloud API webhooks and messages.
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookVerifyParams {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}

export interface WebhookPayload {
  object: 'whatsapp_business_account';
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: 'messages';
}

export interface WebhookValue {
  messaging_product: 'whatsapp';
  metadata: WebhookMetadata;
  contacts?: WebhookContact[];
  messages?: IncomingMessage[];
  statuses?: MessageStatus[];
  errors?: WebhookError[];
}

export interface WebhookMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

// ============================================================================
// Incoming Message Types
// ============================================================================

export type MessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'interactive'
  | 'button'
  | 'reaction'
  | 'order'
  | 'system'
  | 'unknown';

export interface IncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: MessageType;
  text?: TextContent;
  interactive?: InteractiveReply;
  button?: ButtonReply;
  reaction?: ReactionContent;
  context?: MessageContext;
  errors?: WebhookError[];
}

export interface TextContent {
  body: string;
}

export interface InteractiveReply {
  type: 'button_reply' | 'list_reply';
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface ButtonReply {
  payload: string;
  text: string;
}

export interface ReactionContent {
  message_id: string;
  emoji: string;
}

export interface MessageContext {
  message_id: string;
  from: string;
}

// ============================================================================
// Message Status Types
// ============================================================================

export type StatusType = 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageStatus {
  id: string;
  recipient_id: string;
  status: StatusType;
  timestamp: string;
  conversation?: {
    id: string;
    origin: {
      type: 'user_initiated' | 'business_initiated' | 'referral_conversion';
    };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: WebhookError[];
}

// ============================================================================
// Outgoing Message Types
// ============================================================================

export interface SendMessageRequest {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'interactive' | 'template' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
  text?: OutgoingText;
  interactive?: OutgoingInteractive;
  template?: OutgoingTemplate;
}

export interface OutgoingText {
  body: string;
  preview_url?: boolean;
}

export interface OutgoingInteractive {
  type: 'button' | 'list';
  body: {
    text: string;
  };
  header?: {
    type: 'text';
    text: string;
  };
  footer?: {
    text: string;
  };
  action: InteractiveAction;
}

export interface InteractiveAction {
  buttons?: InteractiveButton[];
  button?: string;
  sections?: ListSection[];
}

export interface InteractiveButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface ListSection {
  title: string | undefined;
  rows: ListRow[];
}

export interface ListRow {
  id: string;
  title: string;
  description: string | undefined;
}

export interface OutgoingTemplate {
  name: string;
  language: {
    code: string;
  };
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: TemplateParameter[];
  sub_type?: 'quick_reply' | 'url';
  index?: number;
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SendMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status?: string;
  }>;
}

export interface SendResultSuccess {
  success: true;
  messageId: string;
}

export interface SendResultFailure {
  success: false;
  error: string;
}

export type SendResult = SendResultSuccess | SendResultFailure;

export interface WebhookError {
  code: number;
  title: string;
  message?: string;
  error_data?: {
    details: string;
  };
}

// ============================================================================
// Kuramei Single-Tenant Config
// ============================================================================

/**
 * WhatsApp configuration for single-tenant Kuramei deployment
 */
export interface Tenant {
  id: string;
  name: string;
  appType: string;
  systemPrompt: string;
  config: Record<string, unknown>;
  whatsappPhoneId: string;
  whatsappTokenSecret: string;
}
