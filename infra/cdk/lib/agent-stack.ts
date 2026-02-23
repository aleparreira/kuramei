import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface AgentStackProps extends StackProps {
  mainTable: Table;
  remindersTable: Table;
}

export class AgentStack extends Stack {
  public readonly processorFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: AgentStackProps) {
    super(scope, id, props);

    this.processorFn = new NodejsFunction(this, 'AgentProcessor', {
      functionName: 'kuramei-agent-processor',
      // entry is relative to the infra/cdk directory (where cdk deploy is run)
      entry: '../../apps/agent-processor/src/index.ts',
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(60),
      memorySize: 512,
      bundling: {
        format: OutputFormat.ESM,
        target: 'node20',
        // Bundle workspace packages inline since Lambda can't resolve pnpm workspaces
        bundleAwsSDK: false,
      },
      environment: {
        DYNAMODB_TABLE: props.mainTable.tableName,
        REMINDERS_TABLE: props.remindersTable.tableName,
        // Runtime secrets loaded from AWS Secrets Manager — see runbook
        // OPENROUTER_API_KEY, KURAMEI_JWT_SECRET, WHATSAPP_ACCESS_TOKEN
        // are NOT set here; Lambda reads them from Secrets Manager at startup
        KURAMEI_BASE_URL: 'https://app.kuramei.app',
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    props.mainTable.grantReadWriteData(this.processorFn);
    props.remindersTable.grantReadWriteData(this.processorFn);
  }
}
