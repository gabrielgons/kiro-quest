import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GitHubOidcStackProps extends cdk.StackProps {
  /**
   * The GitHub repository in the format "owner/repo".
   * Used to scope the OIDC trust relationship.
   */
  repositoryName: string;

  /**
   * S3 bucket ARN for frontend deployment permissions.
   */
  siteBucketArn?: string;

  /**
   * CloudFront distribution ID to scope cache invalidation permissions.
   * If not provided, no CloudFront permissions are granted.
   */
  distributionId?: string;
}

export class GitHubOidcStack extends cdk.Stack {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    // GitHub OIDC Provider
    // This creates an IAM OIDC identity provider that trusts GitHub Actions
    const githubOidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    // IAM Role for GitHub Actions
    // Scoped to the specific repository for least privilege
    this.role = new iam.Role(this, 'GitHubActionsRole', {
      roleName: 'KiroQuestGitHubActionsRole',
      assumedBy: new iam.FederatedPrincipal(
        githubOidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': `repo:${props.repositoryName}:*`,
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
      description: 'Role assumed by GitHub Actions for CI/CD deployments',
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // S3 permissions for frontend deployment
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'S3FrontendDeploy',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject',
          's3:GetObject',
          's3:DeleteObject',
          's3:ListBucket',
        ],
        resources: [
          `arn:aws:s3:::kiro-quest-site-${this.account}`,
          `arn:aws:s3:::kiro-quest-site-${this.account}/*`,
        ],
      }),
    );

    // CloudFront permissions for cache invalidation (scoped to specific distribution)
    const distributionArn = props.distributionId
      ? `arn:aws:cloudfront::${this.account}:distribution/${props.distributionId}`
      : `arn:aws:cloudfront::${this.account}:distribution/*`;

    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFrontInvalidation',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
        ],
        resources: [distributionArn],
      }),
    );

    // CDK deployment permissions (for backend and infra stacks)
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CDKDeploy',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeStackEvents',
          'cloudformation:GetTemplate',
          'cloudformation:CreateStack',
          'cloudformation:UpdateStack',
          'cloudformation:DeleteStack',
          'cloudformation:CreateChangeSet',
          'cloudformation:ExecuteChangeSet',
          'cloudformation:DescribeChangeSet',
          'cloudformation:DeleteChangeSet',
          'cloudformation:GetTemplateSummary',
        ],
        resources: [
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/KiroQuest*/*`,
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/CDKToolkit/*`,
        ],
      }),
    );

    // SSM parameter access for CDK context lookups
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SSMParameterRead',
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/cdk-bootstrap/*`],
      }),
    );

    // S3 access for CDK asset bucket
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CDKAssetBucket',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:ListBucket',
          's3:GetBucketLocation',
        ],
        resources: [
          `arn:aws:s3:::cdk-*-assets-${this.account}-${this.region}`,
          `arn:aws:s3:::cdk-*-assets-${this.account}-${this.region}/*`,
        ],
      }),
    );

    // IAM pass role for CDK deployment roles
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CDKPassRole',
        effect: iam.Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [
          `arn:aws:iam::${this.account}:role/cdk-*`,
        ],
      }),
    );

    // STS assume role for CDK (needed for cross-account/cross-region operations)
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CDKAssumeRole',
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:aws:iam::${this.account}:role/cdk-*`,
        ],
      }),
    );

    // Outputs
    new cdk.CfnOutput(this, 'RoleArn', {
      value: this.role.roleArn,
      description: 'IAM Role ARN for GitHub Actions OIDC authentication',
    });

    new cdk.CfnOutput(this, 'OidcProviderArn', {
      value: githubOidcProvider.openIdConnectProviderArn,
      description: 'GitHub OIDC Provider ARN',
    });
  }
}
