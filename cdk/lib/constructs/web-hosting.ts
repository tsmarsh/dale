import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface WebHostingProps {
  envName: string;
  /** Custom domain name, e.g. "dalegram.com". When provided, certificateArn must also be set. */
  domainName?: string;
  /** ARN of an ACM certificate (must be in us-east-1) covering domainName and www.domainName. */
  certificateArn?: string;
}

export class WebHosting extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  /** The primary URL for the site — custom domain if configured, CloudFront domain otherwise. */
  public readonly siteUrl: string;

  constructor(scope: Construct, id: string, props: WebHostingProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'WebBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const certificate = props.domainName && props.certificateArn
      ? acm.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn)
      : undefined;

    const domainNames = props.domainName && certificate
      ? [props.domainName, `www.${props.domainName}`]
      : undefined;

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      domainNames,
      certificate,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    this.siteUrl = props.domainName
      ? `https://${props.domainName}`
      : `https://${this.distribution.distributionDomainName}`;
  }
}
