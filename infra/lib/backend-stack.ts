import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
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
      pointInTimeRecovery: false, // Keep costs at zero
    });

    // GSI for rankings queries (optional, for more flexible access patterns)
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
      readCapacity: 5,
      writeCapacity: 5,
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Shared Lambda environment variables
    const lambdaEnvironment = {
      TABLE_NAME: this.table.tableName,
      NODE_OPTIONS: '--enable-source-maps',
    };

    // Lambda functions - Node.js 20 runtime
    const saveProgressFn = new lambda.Function(this, 'SaveProgressFn', {
      functionName: 'KiroQuest-SaveProgress',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'saveProgress.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: lambdaEnvironment,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
    });

    const getProgressFn = new lambda.Function(this, 'GetProgressFn', {
      functionName: 'KiroQuest-GetProgress',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'getProgress.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: lambdaEnvironment,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
    });

    const submitResultFn = new lambda.Function(this, 'SubmitResultFn', {
      functionName: 'KiroQuest-SubmitResult',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'submitResult.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: lambdaEnvironment,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
    });

    const getRankingsFn = new lambda.Function(this, 'GetRankingsFn', {
      functionName: 'KiroQuest-GetRankings',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'getRankings.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: lambdaEnvironment,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
    });

    const getProfileFn = new lambda.Function(this, 'GetProfileFn', {
      functionName: 'KiroQuest-GetProfile',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'getProfile.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: lambdaEnvironment,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
    });

    // Grant DynamoDB permissions (least privilege)
    this.table.grantReadWriteData(saveProgressFn);
    this.table.grantReadData(getProgressFn);
    this.table.grantReadWriteData(submitResultFn);
    this.table.grantReadData(getRankingsFn);
    this.table.grantReadWriteData(getProfileFn);

    // API Gateway HTTP API (cheaper than REST API)
    this.httpApi = new apigatewayv2.HttpApi(this, 'KiroQuestApi', {
      apiName: 'KiroQuestAPI',
      description: 'Kiro Quest Backend API',
      corsPreflight: {
        allowOrigins: ['*'],
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
      path: '/api/results',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration(
        'SubmitResultIntegration',
        submitResultFn,
      ),
      authorizer: jwtAuthorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/rankings',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration(
        'GetRankingsIntegration',
        getRankingsFn,
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
