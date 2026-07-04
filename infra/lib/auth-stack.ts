import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface AuthStackProps extends cdk.StackProps {
  /**
   * The callback URLs for the Cognito hosted UI.
   * Typically includes the app URL with /auth/callback path.
   * Defaults to localhost for development.
   */
  callbackUrls?: string[];

  /**
   * The logout URLs for the Cognito hosted UI.
   * Defaults to localhost for development.
   */
  logoutUrls?: string[];

  /**
   * Google OAuth 2.0 Client ID for federated sign-in.
   * If not provided, Google IdP will not be configured.
   */
  googleClientId?: string;

  /**
   * Google OAuth 2.0 Client Secret for federated sign-in.
   * If not provided, Google IdP will not be configured.
   */
  googleClientSecret?: string;

  /**
   * Cognito hosted UI domain prefix.
   * The full domain will be: {domainPrefix}.auth.{region}.amazoncognito.com
   */
  domainPrefix?: string;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props?: AuthStackProps) {
    super(scope, id, props);

    // Read configuration from CDK context or props
    const googleClientId =
      props?.googleClientId ||
      this.node.tryGetContext('googleClientId') ||
      '';
    const googleClientSecret =
      props?.googleClientSecret ||
      this.node.tryGetContext('googleClientSecret') ||
      '';
    const domainPrefix =
      props?.domainPrefix ||
      this.node.tryGetContext('cognitoDomainPrefix') ||
      'kiro-quest';
    const callbackUrls = props?.callbackUrls || [
      'http://localhost:5173/auth/callback',
      'http://localhost:4173/auth/callback',
    ];
    const logoutUrls = props?.logoutUrls || [
      'http://localhost:5173/',
      'http://localhost:4173/',
    ];

    // Cognito User Pool
    // Free Tier: 50,000 MAUs for users who sign in directly or with social identity providers
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'KiroQuestUserPool',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: false,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Google Identity Provider (optional - only configured if credentials are provided)
    let supportedIdentityProviders: cognito.UserPoolClientIdentityProvider[] = [
      cognito.UserPoolClientIdentityProvider.COGNITO,
    ];

    if (googleClientId && googleClientSecret) {
      const googleProvider = new cognito.UserPoolIdentityProviderGoogle(
        this,
        'GoogleProvider',
        {
          userPool: this.userPool,
          clientId: googleClientId,
          clientSecretValue: cdk.SecretValue.unsafePlainText(googleClientSecret),
          scopes: ['profile', 'email', 'openid'],
          attributeMapping: {
            email: cognito.ProviderAttribute.GOOGLE_EMAIL,
            fullname: cognito.ProviderAttribute.GOOGLE_NAME,
            profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
          },
        },
      );

      supportedIdentityProviders.push(
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      );

      // Ensure the provider is created before the client
      this.userPoolClient = this.createUserPoolClient(
        callbackUrls,
        logoutUrls,
        supportedIdentityProviders,
      );
      this.userPoolClient.node.addDependency(googleProvider);
    } else {
      this.userPoolClient = this.createUserPoolClient(
        callbackUrls,
        logoutUrls,
        supportedIdentityProviders,
      );
    }

    // Hosted UI Domain (Cognito prefix domain - free)
    this.userPoolDomain = this.userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'KiroQuest-UserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool App Client ID',
      exportName: 'KiroQuest-UserPoolClientId',
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: this.userPoolDomain.domainName,
      description: 'Cognito Hosted UI domain prefix',
      exportName: 'KiroQuest-CognitoDomain',
    });

    new cdk.CfnOutput(this, 'CognitoDomainUrl', {
      value: `https://${domainPrefix}.auth.${this.region}.amazoncognito.com`,
      description: 'Full Cognito Hosted UI URL',
      exportName: 'KiroQuest-CognitoDomainUrl',
    });
  }

  private createUserPoolClient(
    callbackUrls: string[],
    logoutUrls: string[],
    supportedIdentityProviders: cognito.UserPoolClientIdentityProvider[],
  ): cognito.UserPoolClient {
    return this.userPool.addClient('AppClient', {
      userPoolClientName: 'KiroQuestWebApp',
      generateSecret: false, // SPA - no client secret (PKCE flow)
      authFlows: {
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true, // Authorization Code + PKCE for SPA
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls,
        logoutUrls,
      },
      supportedIdentityProviders,
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });
  }
}
