import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Architecture, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

interface WebhookStackProps extends StackProps {
  mainTable: Table;
  agentFn: IFunction;
}

export class WebhookStack extends Stack {
  constructor(scope: Construct, id: string, props: WebhookStackProps) {
    super(scope, id, props);

    const handlerFn = new NodejsFunction(this, 'WebhookHandler', {
      functionName: 'kuramei-webhook-handler',
      entry: '../../apps/webhook-handler/src/index.ts',
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      memorySize: 256,
      bundling: {
        format: OutputFormat.ESM,
        target: 'node20',
        bundleAwsSDK: false,
      },
      environment: {
        AGENT_PROCESSOR_FUNCTION_NAME: props.agentFn.functionName,
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // webhook-handler invokes agent-processor asynchronously
    props.agentFn.grantInvoke(handlerFn);

    // API Gateway — single proxy route forwards all requests to the Lambda
    new LambdaRestApi(this, 'WebhookApi', {
      restApiName: 'kuramei-webhook',
      handler: handlerFn,
      proxy: true,
      deployOptions: {
        stageName: 'prod',
      },
    });
  }
}
