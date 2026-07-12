# Runbook Operacional - Kiro Quest

> Guia operacional para monitoramento, troubleshooting e manutencao do Kiro Quest na AWS.

---

## Monitoramento

### CloudWatch Dashboards

Crie um dashboard customizado com as seguintes metricas:

#### Frontend (CloudFront)
- `Requests` - Total de requisicoes
- `BytesDownloaded` - Transferencia de dados
- `4xxErrorRate` - Taxa de erros 4xx
- `5xxErrorRate` - Taxa de erros 5xx
- `CacheHitRate` - Taxa de acerto do cache

#### Backend (Lambda)
- `Invocations` - Total de invocacoes por funcao
- `Duration` - Tempo de execucao (p50, p95, p99)
- `Errors` - Erros por funcao
- `Throttles` - Throttles por funcao
- `ConcurrentExecutions` - Execucoes simultaneas

#### API Gateway
- `Count` - Total de chamadas
- `4xx` - Erros do cliente
- `5xx` - Erros do servidor
- `Latency` - Latencia (p50, p95)
- `IntegrationLatency` - Latencia do backend

#### DynamoDB
- `ConsumedReadCapacityUnits` - RCUs consumidas
- `ConsumedWriteCapacityUnits` - WCUs consumidas
- `ThrottledRequests` - Requisicoes throttled
- `SystemErrors` - Erros do sistema

#### Cognito
- `SignInSuccesses` - Logins bem-sucedidos
- `SignInFailures` - Falhas de login
- `TokenRefreshSuccesses` - Renovacoes de token

### Alarmes Recomendados

| Alarme | Metrica | Threshold | Periodo |
|--------|---------|-----------|---------|
| API Errors | API Gateway 5xx | > 5 em 5 min | 5 min |
| Lambda Errors | Lambda Errors | > 3 em 5 min | 5 min |
| DDB Throttle | ThrottledRequests | > 0 em 5 min | 5 min |
| High Latency | API Latency p99 | > 3000ms | 5 min |
| Billing | EstimatedCharges | > $1.00 | 6 horas |

### Configurar Alarme via CLI

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "KiroQuest-API-5xx" \
  --metric-name "5xx" \
  --namespace "AWS/ApiGateway" \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:KiroQuest-Alerts \
  --dimensions Name=ApiId,Value=API_ID
```

---

## Troubleshooting

### Problema: Site nao carrega (CloudFront)

**Sintomas:** Pagina em branco, erro 403 ou 5xx.

**Diagnostico:**
```bash
# Verificar se o bucket tem conteudo
aws s3 ls s3://kiro-quest-site-ACCOUNT_ID/

# Verificar status do CloudFront
aws cloudfront get-distribution --id DISTRIBUTION_ID \
  --query "Distribution.Status"

# Verificar OAC
aws cloudfront get-distribution --id DISTRIBUTION_ID \
  --query "Distribution.DistributionConfig.Origins.Items[0].OriginAccessControlId"
```

**Solucoes:**
1. Se bucket vazio: re-executar deploy (`npm run build && cd infra && npm run sync`)
2. Se erro 403: verificar bucket policy e OAC
3. Se CloudFront "Disabled": habilitar via console ou CLI
4. Se erro persistir: invalidar cache (`aws cloudfront create-invalidation --distribution-id ID --paths "/*"`)

---

### Problema: Login nao funciona (Cognito)

**Sintomas:** Redirect loop, erro apos login, token invalido.

**Diagnostico:**
```bash
# Verificar User Pool
aws cognito-idp describe-user-pool \
  --user-pool-id USER_POOL_ID

# Verificar App Client
aws cognito-idp describe-user-pool-client \
  --user-pool-id USER_POOL_ID \
  --client-id CLIENT_ID

# Verificar callback URLs
aws cognito-idp describe-user-pool-client \
  --user-pool-id USER_POOL_ID \
  --client-id CLIENT_ID \
  --query "UserPoolClient.CallbackURLs"
```

**Solucoes:**
1. Callback URL incorreta: atualizar no App Client para match com o dominio atual
2. CORS error: verificar se o dominio esta nos allowed origins
3. Token expirado: verificar se refresh funciona, limpar localStorage
4. Google IdP desconfigurado: verificar Client ID/Secret no Cognito

---

### Problema: API retorna 401 (Unauthorized)

**Sintomas:** Chamadas API falham com 401.

**Diagnostico:**
1. Verificar se o token existe no localStorage
2. Verificar se o token nao expirou (decodificar JWT em jwt.io)
3. Verificar audience do token vs configuracao do authorizer

```bash
# Verificar authorizer no API Gateway
aws apigatewayv2 get-authorizers \
  --api-id API_ID
```

**Solucoes:**
1. Token expirado: o frontend deve renovar automaticamente via refresh_token
2. Audience mismatch: verificar VITE_COGNITO_CLIENT_ID vs App Client ID
3. Issuer mismatch: verificar regiao do User Pool

---

### Problema: API retorna 500 (Server Error)

**Sintomas:** Chamadas API falham com 500.

**Diagnostico:**
```bash
# Ver logs da Lambda
aws logs tail /aws/lambda/KiroQuest-SaveProgress --since 1h

# Ou filtrar por erros
aws logs filter-log-events \
  --log-group-name /aws/lambda/KiroQuest-SaveProgress \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000)
```

**Solucoes comuns:**
1. DynamoDB throttling: aumentar capacidade provisionada
2. Permissao IAM: verificar role da Lambda
3. Variavel TABLE_NAME incorreta: verificar environment da Lambda
4. Payload invalido: verificar format do request body

---

### Problema: DynamoDB Throttling

**Sintomas:** Erros intermitentes, lentidao, `ProvisionedThroughputExceededException`.

**Diagnostico:**
```bash
# Verificar capacidade consumida
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=KiroQuestTable \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**Solucoes:**
1. Temporario: aumentar WCU/RCU (lembre do Free Tier: max 25 cada)
2. Estrutural: implementar retry com exponential backoff no Lambda
3. Se consistente: considerar trocar para On-Demand (cuidado com custos)

---

### Problema: Deploy falha no GitHub Actions

**Sintomas:** Workflow falha com erro de credenciais ou permissao.

**Diagnostico:**
1. Verificar se as Repository Variables estao corretas
2. Verificar se o Environment `production` existe
3. Verificar logs do workflow no GitHub

```bash
# Verificar a role OIDC
aws iam get-role --role-name KiroQuestGitHubActionsRole \
  --query "Role.AssumeRolePolicyDocument"
```

**Solucoes:**
1. Credenciais: verificar trust policy da role (repo name correto)
2. Permissoes: verificar se a role tem as policies necessarias
3. Timeout: verificar se o CDK bootstrap foi feito na regiao correta

---

## Operacoes de Rotina

### Atualizar Conteudo (Perguntas)

1. Edite os arquivos em `content/questions/pt-BR/` e `content/answers/pt-BR/`
2. Valide:
   ```bash
   npx tsx scripts/validate-content.ts
   ```
3. Commit e push para `main`
4. O workflow `deploy-frontend.yml` fara o deploy automaticamente

**Ou manualmente:**
```bash
npm run build
cd infra
npm run sync
```

### Deploy Manual do Frontend

```bash
# Build
npm run build

# Sync com S3
aws s3 sync dist/ s3://kiro-quest-site-ACCOUNT_ID/ \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html" \
  --exclude "*.json"

# Upload index.html com cache curto
aws s3 cp dist/index.html s3://kiro-quest-site-ACCOUNT_ID/index.html \
  --cache-control "public, max-age=0, must-revalidate"

# Invalidar cache do CloudFront
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/index.html" "/assets/*"
```

### Deploy Manual do Backend

```bash
# Build das Lambdas
cd backend
npm run build

# Deploy via CDK
cd ../infra
npx cdk deploy KiroQuestBackendStack --require-approval never
```

### Invalidar Cache do CloudFront

```bash
# Invalidar tudo (cuidado - 1000 paths/mes gratuitos)
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"

# Invalidar apenas index.html
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/index.html"

# Verificar status da invalidacao
aws cloudfront get-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --id INVALIDATION_ID
```

---

## Gerenciamento de Usuarios (Cognito)

### Listar Usuarios

```bash
aws cognito-idp list-users \
  --user-pool-id USER_POOL_ID \
  --limit 20
```

### Buscar Usuario por Email

```bash
aws cognito-idp list-users \
  --user-pool-id USER_POOL_ID \
  --filter "email = \"usuario@gmail.com\""
```

### Desabilitar Usuario

```bash
aws cognito-idp admin-disable-user \
  --user-pool-id USER_POOL_ID \
  --username USERNAME
```

### Reabilitar Usuario

```bash
aws cognito-idp admin-enable-user \
  --user-pool-id USER_POOL_ID \
  --username USERNAME
```

### Deletar Usuario

```bash
aws cognito-idp admin-delete-user \
  --user-pool-id USER_POOL_ID \
  --username USERNAME
```

### Ver Detalhes do Usuario

```bash
aws cognito-idp admin-get-user \
  --user-pool-id USER_POOL_ID \
  --username USERNAME
```

### Forcar Logout (Invalidar Tokens)

```bash
aws cognito-idp admin-user-global-sign-out \
  --user-pool-id USER_POOL_ID \
  --username USERNAME
```

---

## Consultas DynamoDB

### Ver Progresso de um Usuario

```bash
aws dynamodb query \
  --table-name KiroQuestTable \
  --key-condition-expression "pk = :pk AND begins_with(sk, :sk)" \
  --expression-attribute-values '{
    ":pk": {"S": "USER#user-id-aqui"},
    ":sk": {"S": "PROGRESS#"}
  }'
```

### Ver Rankings de um Estagio

```bash
aws dynamodb query \
  --table-name KiroQuestTable \
  --index-name GSI1 \
  --key-condition-expression "gsi1pk = :pk" \
  --expression-attribute-values '{
    ":pk": {"S": "STAGE#kiro-basics"}
  }' \
  --scan-index-forward false \
  --limit 10
```

### Contar Itens na Tabela

```bash
aws dynamodb describe-table \
  --table-name KiroQuestTable \
  --query "Table.ItemCount"
```

### Verificar Consumo de Capacidade

```bash
aws dynamodb describe-table \
  --table-name KiroQuestTable \
  --query "Table.[ProvisionedThroughput, TableSizeBytes, ItemCount]"
```

---

## Backup e Restauracao

### Criar Backup Manual do DynamoDB

```bash
aws dynamodb create-backup \
  --table-name KiroQuestTable \
  --backup-name "kiro-quest-backup-$(date +%Y%m%d)"
```

### Listar Backups

```bash
aws dynamodb list-backups \
  --table-name KiroQuestTable
```

### Exportar Dados (para JSON)

```bash
aws dynamodb scan \
  --table-name KiroQuestTable \
  --output json > backup-$(date +%Y%m%d).json
```

---

## Checklist Semanal

- [ ] Verificar custos no AWS Billing Dashboard
- [ ] Revisar metricas de erro no CloudWatch
- [ ] Confirmar que deploys recentes estao funcionando
- [ ] Verificar se ha throttling no DynamoDB
- [ ] Monitorar uso do Free Tier no Billing > Free Tier page

## Checklist Mensal

- [ ] Revisar e limpar logs antigos no CloudWatch
- [ ] Verificar certificados SSL (ACM renova automaticamente, mas confirmar)
- [ ] Atualizar dependencias do projeto (npm audit)
- [ ] Testar procedimento de rollback
- [ ] Revisar IAM permissions (least privilege)
