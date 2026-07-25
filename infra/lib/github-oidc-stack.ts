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
   * Immutable GitHub repository and owner IDs used to prevent name reuse from
   * satisfying the OIDC trust policy.
   */
  repositoryId: string;
  repositoryOwnerId: string;

  /**
   * S3 bucket ARN for frontend deployment permissions.
   */
  siteBucketArn: string;

  /**
   * CloudFront distribution ID to scope cache invalidation permissions.
   */
  distributionId: string;
}

export class GitHubOidcStack extends cdk.Stack {
  public readonly frontendDeployRole: iam.Role;
  public readonly infraDeployRole: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    // GitHub OIDC Provider
    // This creates an IAM OIDC identity provider that trusts GitHub Actions
    const githubOidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    const githubEnvironmentPrincipal = (
      environmentName: string,
      workflowName: string,
    ): iam.FederatedPrincipal => new iam.FederatedPrincipal(
      githubOidcProvider.openIdConnectProviderArn,
      {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          'token.actions.githubusercontent.com:sub':
            `repo:${props.repositoryName}:environment:${environmentName}`,
          'token.actions.githubusercontent.com:repository': props.repositoryName,
          'token.actions.githubusercontent.com:repository_id': props.repositoryId,
          'token.actions.githubusercontent.com:repository_owner_id':
            props.repositoryOwnerId,
          'token.actions.githubusercontent.com:ref': 'refs/heads/main',
          'token.actions.githubusercontent.com:environment': environmentName,
          'token.actions.githubusercontent.com:workflow': workflowName,
        },
      },
      'sts:AssumeRoleWithWebIdentity',
    );

    this.frontendDeployRole = new iam.Role(this, 'FrontendDeployRole', {
      roleName: 'KiroQuestFrontendDeployRole',
      assumedBy: githubEnvironmentPrincipal(
        'production-frontend',
        'Deploy Frontend',
      ),
      description: 'Least-privilege role for GitHub Actions frontend deployments',
      maxSessionDuration: cdk.Duration.hours(1),
    });

    this.frontendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ListFrontendBucket',
        effect: iam.Effect.ALLOW,
        actions: ['s3:ListBucket', 's3:GetBucketLocation'],
        resources: [props.siteBucketArn],
      }),
    );

    this.frontendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'DeployFrontendObjects',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject',
          's3:GetObject',
          's3:DeleteObject',
        ],
        resources: [`${props.siteBucketArn}/*`],
      }),
    );

    this.frontendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'InvalidateFrontendDistribution',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
        ],
        resources: [
          `arn:aws:cloudfront::${this.account}:distribution/${props.distributionId}`,
        ],
      }),
    );

    this.infraDeployRole = new iam.Role(this, 'InfraDeployRole', {
      roleName: 'KiroQuestInfraDeployRole',
      assumedBy: githubEnvironmentPrincipal(
        'production-infra',
        'Deploy Infrastructure',
      ),
      description: 'Least-privilege entry role for GitHub Actions CDK deployments',
      maxSessionDuration: cdk.Duration.hours(1),
    });

    const cdkRolePrefix = `arn:aws:iam::${this.account}:role/cdk-hnb659fds`;

    // The CDK CLI assumes these bootstrap roles for deployment, lookups, and
    // asset publication. CloudFormation and iam:PassRole permissions stay on
    // the bootstrap roles instead of being granted to GitHub directly.
    this.infraDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'AssumeCdkBootstrapRoles',
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [
          `${cdkRolePrefix}-deploy-role-${this.account}-${this.region}`,
          `${cdkRolePrefix}-file-publishing-role-${this.account}-${this.region}`,
          `${cdkRolePrefix}-image-publishing-role-${this.account}-${this.region}`,
          `${cdkRolePrefix}-lookup-role-${this.account}-${this.region}`,
        ],
      }),
    );

    // Outputs
    new cdk.CfnOutput(this, 'FrontendDeployRoleArn', {
      value: this.frontendDeployRole.roleArn,
      description: 'IAM role ARN for frontend deployments',
    });

    new cdk.CfnOutput(this, 'InfraDeployRoleArn', {
      value: this.infraDeployRole.roleArn,
      description: 'IAM role ARN for infrastructure deployments',
    });

    new cdk.CfnOutput(this, 'OidcProviderArn', {
      value: githubOidcProvider.openIdConnectProviderArn,
      description: 'GitHub OIDC Provider ARN',
    });
  }
}
