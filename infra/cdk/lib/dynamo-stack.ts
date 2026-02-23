import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DynamoStack extends Stack {
  public readonly mainTable: Table;
  public readonly remindersTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Main single-table: sessions, events, identities
    this.mainTable = new Table(this, 'MainTable', {
      tableName: 'kuramei-main',
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'ttl',
    });

    // Reminders table: scheduled follow-ups
    this.remindersTable = new Table(this, 'RemindersTable', {
      tableName: 'kuramei-reminders',
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // GSI for querying reminders by status + scheduled time
    this.remindersTable.addGlobalSecondaryIndex({
      indexName: 'status-when-index',
      partitionKey: { name: 'status', type: AttributeType.STRING },
      sortKey: { name: 'when', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });
  }
}
