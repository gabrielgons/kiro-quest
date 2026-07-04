#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FrontendStack } from '../lib/frontend-stack';
import { DnsStack } from '../lib/dns-stack';
import { AuthStack } from '../lib/auth-stack';

const app = new cdk.App();

// Environment configuration
// These can be set via CDK context (-c), cdk.json context, or environment variables
const account = app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const region = app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1';
const domainName = app.node.tryGetContext('domainName') || process.env.DOMAIN_NAME;
const hostedZoneName = app.node.tryGetContext('hostedZoneName') || process.env.HOSTED_ZONE_NAME;

// Auth configuration (optional - Google OAuth credentials)
const googleClientId = app.node.tryGetContext('googleClientId') || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = app.node.tryGetContext('googleClientSecret') || process.env.GOOGLE_CLIENT_SECRET;
const cognitoDomainPrefix = app.node.tryGetContext('cognitoDomainPrefix') || process.env.COGNITO_DOMAIN_PREFIX || 'kiro-quest';

const env: cdk.Environment = {
  account,
  region,
};

// Frontend Stack - S3 + CloudFront (always deployed)
const frontendStack = new FrontendStack(app, 'KiroQuestFrontendStack', {
  env,
  description: 'Kiro Quest - Frontend hosting with S3 and CloudFront',
});

// Auth Stack - Cognito User Pool with Google OAuth (always deployed)
// Google IdP is only configured if credentials are provided via context/env
new AuthStack(app, 'KiroQuestAuthStack', {
  env,
  description: 'Kiro Quest - Authentication with Amazon Cognito',
  googleClientId,
  googleClientSecret,
  domainPrefix: cognitoDomainPrefix,
});

// DNS Stack - Route 53 + ACM (optional, only if domain is configured)
// This stack must be deployed in us-east-1 for CloudFront certificate compatibility
if (domainName && hostedZoneName) {
  new DnsStack(app, 'KiroQuestDnsStack', {
    env: {
      account,
      region: 'us-east-1', // ACM certificates for CloudFront must be in us-east-1
    },
    description: 'Kiro Quest - DNS and SSL certificate configuration',
    domainName,
    hostedZoneName,
    distribution: frontendStack.distribution,
    crossRegionReferences: true,
  });
}

// Tags applied to all resources
cdk.Tags.of(app).add('Project', 'KiroQuest');
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('CostCenter', 'FreeTier');
