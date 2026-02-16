import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Runtime, FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import type { Construct } from 'constructs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class DaleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'DaleTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const ssmParamArns = [
      `arn:aws:ssm:${this.region}:${this.account}:parameter/dale/*`,
    ];

    const commonEnv = {
      TABLE_NAME: table.tableName,
      PAYMENT_LINK: process.env.PAYMENT_LINK ?? 'https://buy.stripe.com/CHANGE_ME',
      TELEGRAM_BOT_TOKEN_PARAM: '/dale/telegram-bot-token',
      TELEGRAM_WEBHOOK_SECRET_PARAM: '/dale/telegram-webhook-secret',
      STRIPE_SECRET_KEY_PARAM: '/dale/stripe-secret-key',
      STRIPE_WEBHOOK_SECRET_PARAM: '/dale/stripe-webhook-secret',
    };

    const bundling = {
      externalModules: ['@aws-sdk/*'],
      format: lambda.OutputFormat.ESM,
      target: 'node20',
    };

    const telegramHandler = new lambda.NodejsFunction(this, 'TelegramHandler', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../src/telegram/webhook.ts'),
      handler: 'handler',
      environment: commonEnv,
      bundling,
      timeout: cdk.Duration.seconds(15),
    });

    const stripeHandler = new lambda.NodejsFunction(this, 'StripeHandler', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../src/stripe/webhook.ts'),
      handler: 'handler',
      environment: commonEnv,
      bundling: {
        ...bundling,
        // Stripe SDK is not in Lambda runtime, so bundle it
        externalModules: ['@aws-sdk/*'],
        nodeModules: ['stripe'],
      },
      timeout: cdk.Duration.seconds(15),
    });

    table.grantReadWriteData(telegramHandler);
    table.grantReadWriteData(stripeHandler);

    const ssmPolicy = new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: ssmParamArns,
    });
    telegramHandler.addToRolePolicy(ssmPolicy);
    stripeHandler.addToRolePolicy(ssmPolicy);

    const telegramUrl = telegramHandler.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });

    const stripeUrl = stripeHandler.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, 'TelegramWebhookUrl', {
      value: telegramUrl.url,
    });

    new cdk.CfnOutput(this, 'StripeWebhookUrl', {
      value: stripeUrl.url,
    });
  }
}
