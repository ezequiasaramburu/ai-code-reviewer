import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class RevelioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // SQS review queue + DLQ (BullMQ/Redis analog)
    const reviewDlq = new sqs.Queue(this, 'ReviewDlq', {
      queueName: 'revelio-review-dlq',
      retentionPeriod: Duration.days(14),
    });

    const reviewQueue = new sqs.Queue(this, 'ReviewQueue', {
      queueName: 'revelio-review',
      visibilityTimeout: Duration.seconds(300),
      deadLetterQueue: {
        queue: reviewDlq,
        maxReceiveCount: 5,
      },
    });

    // Webhook Lambda (Fastify analog) + API Gateway
    const webhookFn = new lambda.Function(this, 'WebhookFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        // Placeholder Lambda that simply returns 200.
        // In a real deployment, this would proxy to the Fastify webhook logic.
        `
        exports.handler = async function(event) {
          console.log("Received webhook event", JSON.stringify(event));
          return { statusCode: 200, body: "ok" };
        };
      `.trim(),
      ),
      timeout: Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    const api = new apigw.RestApi(this, 'RevelioApi', {
      restApiName: 'Revelio Webhook API',
      deployOptions: {
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
      },
    });

    const webhookResource = api.root.addResource('webhook');
    webhookResource.addMethod('POST', new apigw.LambdaIntegration(webhookFn));

    // SSM Parameter Store — placeholders for secrets/env (GitHub App + LLM keys)
    const secrets: Record<string, ssm.StringParameter> = {
      githubAppId: new ssm.StringParameter(this, 'GitHubAppId', {
        parameterName: '/revelio/github/app-id',
        stringValue: 'REPLACE_WITH_APP_ID',
      }),
      githubPrivateKey: new ssm.StringParameter(this, 'GitHubPrivateKey', {
        parameterName: '/revelio/github/private-key',
        stringValue: 'REPLACE_WITH_PRIVATE_KEY',
      }),
      githubWebhookSecret: new ssm.StringParameter(this, 'GitHubWebhookSecret', {
        parameterName: '/revelio/github/webhook-secret',
        stringValue: 'REPLACE_WITH_WEBHOOK_SECRET',
      }),
      llmProvider: new ssm.StringParameter(this, 'LlmProvider', {
        parameterName: '/revelio/llm/provider',
        stringValue: 'claude',
      }),
      anthropicApiKey: new ssm.StringParameter(this, 'AnthropicApiKey', {
        parameterName: '/revelio/llm/anthropic-api-key',
        stringValue: 'REPLACE_WITH_ANTHROPIC_API_KEY',
      }),
      openaiApiKey: new ssm.StringParameter(this, 'OpenAiApiKey', {
        parameterName: '/revelio/llm/openai-api-key',
        stringValue: 'REPLACE_WITH_OPENAI_API_KEY',
      }),
      geminiApiKey: new ssm.StringParameter(this, 'GeminiApiKey', {
        parameterName: '/revelio/llm/gemini-api-key',
        stringValue: 'REPLACE_WITH_GEMINI_API_KEY',
      }),
    };

    // ECS Fargate worker service (local worker process analog)
    const cluster = new ecs.Cluster(this, 'RevelioCluster', {
      clusterName: 'revelio-cluster',
    });

    const workerLogGroup = new logs.LogGroup(this, 'WorkerLogGroup', {
      logGroupName: '/revelio/worker',
      retention: logs.RetentionDays.ONE_WEEK,
    });

    const workerTaskDefinition = new ecs.FargateTaskDefinition(this, 'WorkerTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    const workerContainer = workerTaskDefinition.addContainer('WorkerContainer', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/amazonlinux/amazonlinux:latest'),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: workerLogGroup,
        streamPrefix: 'worker',
      }),
      environment: {
        // Placeholder env wiring; in a real deployment these would be read from SSM.
        REVIEW_QUEUE_URL: reviewQueue.queueUrl,
      },
    });

    workerContainer.addPortMappings({
      containerPort: 3000,
    });

    const workerService = new ecsp.QueueProcessingFargateService(this, 'WorkerService', {
      cluster,
      taskDefinition: workerTaskDefinition,
      queue: reviewQueue,
      maxScalingCapacity: 5,
    });

    // Permissions — allow worker to consume SQS and read SSM parameters
    reviewQueue.grantConsumeMessages(workerService.taskDefinition.taskRole);
    reviewDlq.grantSendMessages(workerService.taskDefinition.taskRole);

    Object.values(secrets).forEach(param => {
      param.grantRead(workerService.taskDefinition.taskRole);
    });

    // Allow webhook Lambda to read GitHub webhook secret if needed.
    secrets.githubWebhookSecret.grantRead(webhookFn);
  }
}


