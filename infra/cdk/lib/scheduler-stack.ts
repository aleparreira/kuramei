import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

interface SchedulerStackProps extends StackProps {
  remindersTable: Table;
}

export class SchedulerStack extends Stack {
  constructor(scope: Construct, id: string, props: SchedulerStackProps) {
    super(scope, id, props);

    const schedulerFn = new NodejsFunction(this, 'ReminderScheduler', {
      functionName: 'kuramei-reminder-scheduler',
      entry: '../../apps/reminder-scheduler/src/index.ts',
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.minutes(5),
      memorySize: 256,
      bundling: {
        format: OutputFormat.ESM,
        target: 'node20',
        bundleAwsSDK: false,
      },
      environment: {
        REMINDERS_TABLE: props.remindersTable.tableName,
        // Set post-deploy: Lambda console → Environment variables
        // WHATSAPP_PHONE_NUMBER_ID: '<phone_number_id_from_meta>'
        // WHATSAPP_ACCESS_TOKEN: '<token_from_meta>'  (sensitive — set manually)
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    props.remindersTable.grantReadWriteData(schedulerFn);

    // Runs every minute to dispatch pending reminders whose `when` has passed
    new Rule(this, 'SchedulerRule', {
      ruleName: 'kuramei-reminder-tick',
      schedule: Schedule.rate(Duration.minutes(1)),
      targets: [new LambdaFunction(schedulerFn)],
    });
  }
}
