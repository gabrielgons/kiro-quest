#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FrontendStack } from '../lib/frontend-stack';
import { DnsStack } from '../lib/dns-stack';
import { AuthStack } from '../lib/auth-stack';
import { BackendStack } from '../lib/backend-stack';
import { GitHubOidcStack } from '../lib/github-oidc-stack';

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
const googleClientSecretArn = app.node.tryGetContext('googleClientSecretArn') || process.env.GOOGLE_CLIENT_SECRET_ARN;
const cognitoDomainPrefix = app.node.tryGetContext('cognitoDomainPrefix') || process.env.COGNITO_DOMAIN_PREFIX || 'kiro-quest';
const githubRepo = app.node.tryGetContext('githubRepo') || process.env.GITHUB_REPOSITORY || 'owner/kiro-quest';

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
// Prefer Secrets Manager ARN for the client secret (avoid plaintext in templates)
// Callback/logout URLs for the Cognito hosted UI.
// Includes the CloudFront distribution domain (production) + localhost (dev).
const appDomain = `https://${frontendStack.distribution.distributionDomainName}`;
const authStack = new AuthStack(app, 'KiroQuestAuthStack', {
  env,
  description: 'Kiro Quest - Authentication with Amazon Cognito',
  googleClientId,
  googleClientSecret,
  googleClientSecretArn,
  domainPrefix: cognitoDomainPrefix,
  callbackUrls: [
    `${appDomain}/auth/callback`,
    'http://localhost:5173/auth/callback',
    'http://localhost:4173/auth/callback',
  ],
  logoutUrls: [
    `${appDomain}/`,
    'http://localhost:5173/',
    'http://localhost:4173/',
  ],
});

// Backend Stack - API Gateway + Lambda + DynamoDB (always deployed)
// CORS is restricted to the CloudFront distribution domain + localhost for dev
const backendAllowedOrigins = [
  `https://${frontendStack.distribution.distributionDomainName}`,
  'http://localhost:5173',
  'http://localhost:4173',
];

new BackendStack(app, 'KiroQuestBackendStack', {
  env,
  description: 'Kiro Quest - Backend API with Lambda, API Gateway, and DynamoDB',
  userPool: authStack.userPool,
  userPoolClientId: authStack.userPoolClient.userPoolClientId,
  allowedOrigins: backendAllowedOrigins,
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

// GitHub OIDC Stack - IAM role for GitHub Actions CI/CD
new GitHubOidcStack(app, 'KiroQuestGitHubOidcStack', {
  env,
  description: 'Kiro Quest - GitHub Actions OIDC authentication for CI/CD',
  repositoryName: githubRepo,
  distributionId: frontendStack.distribution.distributionId,
});

// Tags applied to all resources
cdk.Tags.of(app).add('Project', 'KiroQuest');
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('CostCenter', 'FreeTier');
