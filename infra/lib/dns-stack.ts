import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export interface DnsStackProps extends cdk.StackProps {
  /**
   * The domain name for the application (e.g., "kiro-quest.example.com").
   */
  domainName: string;

  /**
   * The Route 53 hosted zone name (e.g., "example.com").
   * The hosted zone must already exist in your AWS account.
   */
  hostedZoneName: string;

  /**
   * The CloudFront distribution to point DNS records to.
   */
  distribution: cloudfront.IDistribution;
}

export class DnsStack extends cdk.Stack {
  public readonly certificate: acm.ICertificate;
  public readonly hostedZone: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    const { domainName, hostedZoneName, distribution } = props;

    // Look up existing hosted zone
    this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: hostedZoneName,
    });

    // ACM certificate with DNS validation
    // Must be in us-east-1 for CloudFront - ensure this stack is deployed there
    this.certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName,
      subjectAlternativeNames: [`www.${domainName}`],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    // A record (IPv4) - alias to CloudFront
    new route53.ARecord(this, 'SiteARecord', {
      zone: this.hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
    });

    // AAAA record (IPv6) - alias to CloudFront
    new route53.AaaaRecord(this, 'SiteAaaaRecord', {
      zone: this.hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
    });

    // www subdomain A record
    new route53.ARecord(this, 'WwwARecord', {
      zone: this.hostedZone,
      recordName: `www.${domainName}`,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
    });

    // www subdomain AAAA record
    new route53.AaaaRecord(this, 'WwwAaaaRecord', {
      zone: this.hostedZone,
      recordName: `www.${domainName}`,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
    });

    // Outputs
    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM certificate ARN',
    });

    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      description: 'Route 53 hosted zone ID',
    });
  }
}
