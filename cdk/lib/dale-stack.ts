import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Database } from './constructs/database.js';
import { Webhooks } from './constructs/webhooks.js';
import { AdminApi } from './constructs/admin-api.js';
import { WebHosting } from './constructs/web-hosting.js';

export interface DaleStackProps extends cdk.StackProps {
  envName: string;
  retainData: boolean;
}

export class DaleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DaleStackProps) {
    super(scope, id, props);

    const ssmParamArns = [
      `arn:aws:ssm:${this.region}:${this.account}:parameter/dale/*`,
    ];

    // Database
    const database = new Database(this, 'Database', {
      retainData: props.retainData,
    });

    // Webhook Lambdas
    const webhooks = new Webhooks(this, 'Webhooks', {
      table: database.table,
      ssmParamArns,
    });

    // Web Hosting (S3 + CloudFront) — before AdminApi so CloudFront domain is available
    const webHosting = new WebHosting(this, 'WebHosting', {
      envName: props.envName,
    });

    const cloudFrontUrl = `https://${webHosting.distribution.distributionDomainName}`;

    // Admin API (Cognito + API Gateway + Lambda)
    const adminApi = new AdminApi(this, 'AdminApi', {
      table: database.table,
      ssmParamArns,
      telegramWebhookUrl: webhooks.telegramUrl.url,
      stripeWebhookUrl: webhooks.stripeUrl.url,
      envName: props.envName,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      appleClientId: process.env.APPLE_CLIENT_ID,
      appleTeamId: process.env.APPLE_TEAM_ID,
      appleKeyId: process.env.APPLE_KEY_ID,
      applePrivateKey: process.env.APPLE_PRIVATE_KEY,
      callbackUrls: process.env.CALLBACK_URLS?.split(',') ?? [`${cloudFrontUrl}/callback`, 'http://localhost:5173/callback'],
      logoutUrls: process.env.LOGOUT_URLS?.split(',') ?? [cloudFrontUrl, 'http://localhost:5173/'],
    });

    // Outputs
    new cdk.CfnOutput(this, 'TelegramWebhookUrl', {
      value: webhooks.telegramUrl.url,
    });

    new cdk.CfnOutput(this, 'StripeWebhookUrl', {
      value: webhooks.stripeUrl.url,
    });

    new cdk.CfnOutput(this, 'AdminApiUrl', {
      value: adminApi.api.apiEndpoint,
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: adminApi.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: adminApi.userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, 'WebDistributionUrl', {
      value: cloudFrontUrl,
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: `dale-${props.envName}-${this.account}`,
    });

    new cdk.CfnOutput(this, 'WebBucketName', {
      value: webHosting.bucket.bucketName,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: webHosting.distribution.distributionId,
    });
  }
}
