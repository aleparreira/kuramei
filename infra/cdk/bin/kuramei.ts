import { App } from 'aws-cdk-lib';
import { DynamoStack } from '../lib/dynamo-stack.js';
import { AgentStack } from '../lib/agent-stack.js';
import { WebhookStack } from '../lib/webhook-stack.js';
import { SchedulerStack } from '../lib/scheduler-stack.js';

const app = new App();

const env = {
  account: process.env['CDK_DEFAULT_ACCOUNT'],
  region: process.env['CDK_DEFAULT_REGION'] ?? 'us-east-1',
};

const dynamo = new DynamoStack(app, 'KurameiDynamo', { env });

const agent = new AgentStack(app, 'KurameiAgent', {
  env,
  mainTable: dynamo.mainTable,
  remindersTable: dynamo.remindersTable,
});

new WebhookStack(app, 'KurameiWebhook', {
  env,
  mainTable: dynamo.mainTable,
  agentFn: agent.processorFn,
});

new SchedulerStack(app, 'KurameiScheduler', {
  env,
  remindersTable: dynamo.remindersTable,
});
