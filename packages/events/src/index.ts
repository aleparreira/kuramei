/**
 * @kuramei/events - Event store and audit functionality
 */

export type {
  EventMetadata,
  DomainEvent,
  EventFilter,
  EventType,
  KurameiEvent,
  MessageReceivedPayload,
  MessageSentPayload,
  SessionStartedPayload,
  SessionUpdatedPayload,
  IntentRecognizedPayload,
  ToolCalledPayload,
  ApprovalRequestedPayload,
  ApprovalGrantedPayload,
  ApprovalDeniedPayload,
  ActionExecutedPayload,
  MessageReceivedEvent,
  MessageSentEvent,
  SessionStartedEvent,
  SessionUpdatedEvent,
  IntentRecognizedEvent,
  ToolCalledEvent,
  ApprovalRequestedEvent,
  ApprovalGrantedEvent,
  ApprovalDeniedEvent,
  ActionExecutedEvent,
} from './types.js';

export { EventTypes } from './types.js';

export type { EventStore, ReadResult, AppendOptions, ReadOptions } from './event-store.js';
export { OptimisticLockError, StreamNotFoundError } from './event-store.js';

export type {
  DynamoDBDocumentClient,
  DynamoDBCommandFactories,
  DynamoDBEventStoreConfig,
  TransactWriteItem,
  QueryCommandInput,
  QueryCommandOutput,
} from './dynamodb-event-store.js';
export { DynamoDBEventStore, InMemoryEventStore } from './dynamodb-event-store.js';

export type {
  EventPublisher,
  EventBridgePublisherConfig,
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequestEntry,
  PutEventsResponse,
  PutEventsResultEntry,
  PutEventsCommandFactory,
} from './event-publisher.js';
export {
  EventBridgePublisher,
  NoOpPublisher,
  EventPublishError,
  EVENT_SOURCE_PREFIX,
} from './event-publisher.js';

export type { CorrelationContext } from './correlation.js';
export {
  generateCorrelationId,
  generateEventId,
  createChildContext,
  createRootContext,
  withCorrelation,
  getCurrentCorrelation,
  requireCorrelation,
  extractCorrelationFromHeaders,
} from './correlation.js';
