import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Database } from './constructs/database.js';
import { Webhooks } from './constructs/webhooks.js';
import { AdminApi } from './constructs/admin-api.js';
import { WebHosting } from './constructs/web-hosting.js';

export interface DaleStackProps extends cdk.StackProps {
  envName: string;
  retainData: boolean;
  telegramTestMode?: boolean;
  paypalBaseUrl?: string;
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
      telegramTestMode: props.telegramTestMode,
      paypalBaseUrl: props.paypalBaseUrl,
    });

    // Web Hosting (S3 + CloudFront) — before AdminApi so CloudFront domain is available
    // Set DOMAIN_NAME + CERTIFICATE_ARN env vars to enable a custom domain (e.g. dalegram.com).
    const webHosting = new WebHosting(this, 'WebHosting', {
      envName: props.envName,
      domainName: process.env.DOMAIN_NAME,
      certificateArn: process.env.CERTIFICATE_ARN,
    });

    const cloudFrontUrl = `https://${webHosting.distribution.distributionDomainName}`;
    // siteUrl is the custom domain if configured, CloudFront domain otherwise
    const siteUrl = webHosting.siteUrl;

    // Admin API (Cognito + API Gateway + Lambda)
    const adminApi = new AdminApi(this, 'AdminApi', {
      table: database.table,
      ssmParamArns,
      telegramTestMode: props.telegramTestMode,
      telegramWebhookUrl: webhooks.telegramUrl.url,
      stripeWebhookUrl: webhooks.stripeUrl.url,
      paypalWebhookUrl: webhooks.paypalUrl.url,
      paypalBaseUrl: props.paypalBaseUrl,
      envName: props.envName,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      appleClientId: process.env.APPLE_CLIENT_ID,
      appleTeamId: process.env.APPLE_TEAM_ID,
      appleKeyId: process.env.APPLE_KEY_ID,
      applePrivateKey: process.env.APPLE_PRIVATE_KEY,
      callbackUrls: process.env.CALLBACK_URLS?.split(',') ?? [`${siteUrl}/callback`, 'http://localhost:5173/callback'],
      logoutUrls: process.env.LOGOUT_URLS?.split(',') ?? [siteUrl, 'http://localhost:5173/'],
    });

    // Outputs
    new cdk.CfnOutput(this, 'TelegramWebhookUrl', {
      value: webhooks.telegramUrl.url,
    });

    new cdk.CfnOutput(this, 'StripeWebhookUrl', {
      value: webhooks.stripeUrl.url,
    });

    new cdk.CfnOutput(this, 'PayPalWebhookUrl', {
      value: webhooks.paypalUrl.url,
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

    // CloudFront domain — CNAME dalegram.com → this value
    new cdk.CfnOutput(this, 'CloudFrontDomain', {
      value: webHosting.distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, 'SiteUrl', {
      value: siteUrl,
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

    new cdk.CfnOutput(this, 'TableName', {
      value: database.table.tableName,
    });
  }
}
