import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigatewayv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface BackendStackProps extends cdk.StackProps {
  /**
   * The Cognito User Pool to use for API authorization.
   */
  userPool: cognito.IUserPool;

  /**
   * The Cognito User Pool Client ID(s) for JWT audience validation.
   */
  userPoolClientId: string;

  /**
   * Allowed origins for CORS.
   * Defaults to localhost for development if not provided.
   */
  allowedOrigins?: string[];
}

export class BackendStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // DynamoDB Table - Single-table design
    // Free Tier: 25 GB storage, 25 WCU, 25 RCU (always free)
    this.table = new dynamodb.Table(this, 'KiroQuestTable', {
      tableName: 'KiroQuestTable',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: false, // Keep costs at zero
      },
    });

    // Allowed CORS origins - restrict to specific domains instead of wildcard
    const allowedOrigins = props.allowedOrigins || [
      'http://localhost:5173',
      'http://localhost:4173',
    ];

    // Shared Lambda environment variables
    const lambdaEnvironment = {
      TABLE_NAME: this.table.tableName,
      NODE_OPTIONS: '--enable-source-maps',
      ALLOWED_ORIGINS: allowedOrigins.join(','),
    };

    // Low concurrency protects the account from runaway invocation volume.
    // Reserved concurrency does not pre-warm functions and has no hourly charge.
    const saveProgressFn = new lambda.Function(this, 'SaveProgressFn', {
      functionName: 'KiroQuest-SaveProgress',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'saveProgress.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: lambdaEnvironment,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      reservedConcurrentExecutions: 2,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    const getProgressFn = new lambda.Function(this, 'GetProgressFn', {
      functionName: 'KiroQuest-GetProgress',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'getProgress.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: lambdaEnvironment,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      reservedConcurrentExecutions: 2,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    const getProfileFn = new lambda.Function(this, 'GetProfileFn', {
      functionName: 'KiroQuest-GetProfile',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'getProfile.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: lambdaEnvironment,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      reservedConcurrentExecutions: 2,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant DynamoDB permissions (least privilege)
    this.table.grantReadWriteData(saveProgressFn);
    this.table.grantReadData(getProgressFn);
    this.table.grantReadData(getProfileFn);

    // API Gateway HTTP API (cheaper than REST API)
    this.httpApi = new apigatewayv2.HttpApi(this, 'KiroQuestApi', {
      apiName: 'KiroQuestAPI',
      description: 'Kiro Quest Backend API',
      corsPreflight: {
        allowOrigins: allowedOrigins,
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Cognito JWT Authorizer
    const jwtAuthorizer = new apigatewayv2Authorizers.HttpJwtAuthorizer(
      'CognitoAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`,
      {
        jwtAudience: [props.userPoolClientId],
      },
    );

    // Routes with JWT authorization
    this.httpApi.addRoutes({
      path: '/api/progress',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration(
        'SaveProgressIntegration',
        saveProgressFn,
      ),
      authorizer: jwtAuthorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/progress',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration(
        'GetProgressIntegration',
        getProgressFn,
      ),
      authorizer: jwtAuthorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/profile',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration(
        'GetProfileIntegration',
        getProfileFn,
      ),
      authorizer: jwtAuthorizer,
    });

    // Stage/route throttling is free to configure and rejects bursts before
    // Lambda or DynamoDB work is performed. Detailed metrics stay disabled.
    const defaultStage = this.httpApi.defaultStage?.node.defaultChild as
      | apigatewayv2.CfnStage
      | undefined;
    if (!defaultStage) {
      throw new Error('HTTP API default stage was not created');
    }

    defaultStage.defaultRouteSettings = {
      detailedMetricsEnabled: false,
      throttlingBurstLimit: 5,
      throttlingRateLimit: 2,
    };
    defaultStage.addPropertyOverride('RouteSettings', {
      'POST /api/progress': {
        DetailedMetricsEnabled: false,
        ThrottlingBurstLimit: 3,
        ThrottlingRateLimit: 1,
      },
      'GET /api/progress': {
        DetailedMetricsEnabled: false,
        ThrottlingBurstLimit: 5,
        ThrottlingRateLimit: 2,
      },
      'GET /api/profile': {
        DetailedMetricsEnabled: false,
        ThrottlingBurstLimit: 5,
        ThrottlingRateLimit: 2,
      },
    });

    // Store API URL
    this.apiUrl = this.httpApi.url || '';

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.httpApi.url || '',
      description: 'API Gateway HTTP API URL',
      exportName: 'KiroQuest-ApiUrl',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB Table Name',
      exportName: 'KiroQuest-TableName',
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB Table ARN',
      exportName: 'KiroQuest-TableArn',
    });
  }
}
