import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
  /**
   * Optional ACM certificate ARN (must be in us-east-1 for CloudFront).
   * If provided, the distribution will use this certificate for HTTPS.
   */
  certificateArn?: string;

  /**
   * Optional domain names for the CloudFront distribution.
   * Only used if certificateArn is also provided.
   */
  domainNames?: string[];
}

export class FrontendStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  public readonly siteBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: FrontendStackProps) {
    super(scope, id, props);

    // S3 bucket for static site content (private, no public access)
    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: cdk.Fn.sub('kiro-quest-site-${AWS::AccountId}'),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      // Free Tier: S3 Standard - 5GB storage, 20K GET, 2K PUT per month
      lifecycleRules: [
        {
          id: 'CleanupOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
    });

    // CloudFront function for SPA routing
    // Redirects all paths that don't have a file extension to /index.html
    // This supports future migration from hash mode to history mode
    const spaRoutingFunction = new cloudfront.Function(this, 'SpaRoutingFunction', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // If the URI has a file extension, serve it as-is
  if (uri.includes('.')) {
    return request;
  }

  // For all other paths, serve index.html (SPA routing)
  request.uri = '/index.html';
  return request;
}
      `.trim()),
      comment: 'Redirects non-file requests to index.html for SPA routing',
    });

    // Response headers policy for security
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      comment: 'Security headers for Kiro Quest frontend',
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; connect-src 'self' https://*.amazoncognito.com https://*.execute-api.*.amazonaws.com;",
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.seconds(31536000),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        xssProtection: {
          protection: true,
          modeBlock: true,
          override: true,
        },
      },
    });

    // CloudFront Origin Access Control for S3
    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
      description: 'OAC for Kiro Quest S3 bucket',
    });

    // Build distribution properties
    const distributionProps: cloudfront.DistributionProps = {
      comment: 'Kiro Quest - Vue 3 SPA Distribution',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.siteBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: spaRoutingFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
        responseHeadersPolicy,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      // Free Tier: CloudFront - 1TB data transfer out, 10M requests per month
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    };

    // Add custom domain and certificate if provided
    if (props?.certificateArn && props?.domainNames && props.domainNames.length > 0) {
      const certificate = cdk.aws_certificatemanager.Certificate.fromCertificateArn(
        this,
        'Certificate',
        props.certificateArn,
      );
      Object.assign(distributionProps, {
        certificate,
        domainNames: props.domainNames,
      });
    }

    this.distribution = new cloudfront.Distribution(this, 'Distribution', distributionProps);

    // Outputs
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID (for cache invalidation)',
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.siteBucket.bucketName,
      description: 'S3 bucket name for deploying site content',
    });
  }
}
