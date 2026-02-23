/**
 * @kuramei/conversation - Session and context management
 */

export type {
  SessionState,
  Message,
  PendingApproval,
  Session,
  SessionConfig,
} from './types.js';

export { DEFAULT_SESSION_CONFIG } from './types.js';

export type { SessionManager } from './session-manager.js';
export {
  SessionNotFoundError,
  SessionExpiredError,
  ApprovalExpiredError,
} from './session-manager.js';

export type {
  DynamoDBDocumentClient,
  DynamoDBCommandFactories,
  DynamoDBSessionManagerConfig,
  GetCommandInput,
  GetCommandOutput,
  PutCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
} from './dynamodb-session-manager.js';
export { DynamoDBSessionManager, InMemorySessionManager } from './dynamodb-session-manager.js';

export {
  addToContextWindow,
  formatContextForLLM,
  getLastMessages,
  estimateContextTokens,
  truncateToTokenBudget,
  createMessage,
} from './context-window.js';
