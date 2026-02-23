/**
 * Shared DynamoDB types for identity module
 */

export interface DynamoDBDocumentClient {
  send(command: unknown): Promise<unknown>;
}

export interface GetCommandInput {
  TableName: string;
  Key: Record<string, unknown>;
}

export interface GetCommandOutput {
  Item?: Record<string, unknown>;
}

export interface PutCommandInput {
  TableName: string;
  Item: Record<string, unknown>;
  ConditionExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
}

export interface UpdateCommandInput {
  TableName: string;
  Key: Record<string, unknown>;
  UpdateExpression: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
  ConditionExpression?: string;
}

export interface DeleteCommandInput {
  TableName: string;
  Key: Record<string, unknown>;
}

export interface QueryCommandInput {
  TableName: string;
  IndexName?: string;
  KeyConditionExpression: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
  Limit?: number;
}

export interface QueryCommandOutput {
  Items?: Record<string, unknown>[];
  LastEvaluatedKey?: Record<string, unknown>;
}

export interface DynamoDBCommandFactories {
  createGetCommand: (input: GetCommandInput) => unknown;
  createPutCommand: (input: PutCommandInput) => unknown;
  createUpdateCommand: (input: UpdateCommandInput) => unknown;
  createDeleteCommand: (input: DeleteCommandInput) => unknown;
  createQueryCommand?: (input: QueryCommandInput) => unknown;
}
