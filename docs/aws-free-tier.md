# Analise de Custos - AWS Free Tier

> Analise detalhada dos custos do Kiro Quest na AWS, otimizado para o Free Tier.

---

## Resumo dos Servicos

| Servico | Free Tier (Mensal) | Uso Estimado | Custo Estimado |
|---------|-------------------|--------------|----------------|
| S3 Standard | 5 GB, 20K GET, 2K PUT | ~50 MB, 10K GET, 100 PUT | $0.00 |
| CloudFront | 1 TB transfer, 10M requests | ~5 GB, 50K requests | $0.00 |
| Lambda | 1M requests, 400K GB-s | ~10K requests, ~1.3K GB-s | $0.00 |
| DynamoDB | 25 GB, 25 WCU, 25 RCU | ~100 MB, 10 WCU, 10 RCU | $0.00 |
| Cognito | 50,000 MAUs | ~100 MAUs | $0.00 |
| API Gateway HTTP | 1M requests | ~10K requests | $0.00 |
| ACM | Ilimitado (certificados publicos) | 1 certificado | $0.00 |
| Route 53 | N/A (nao tem free tier) | 1 hosted zone | $0.50 |
| CloudWatch | 10 metricas, 5 GB logs | Basico | $0.00 |
| **Total Mensal** | | | **$0.00 - $0.50** |

> Nota: O unico custo fixo e o Route 53 ($0.50/mes) se usar dominio customizado. Sem dominio customizado, o custo e $0.00.

---

## Detalhamento por Servico

### Amazon S3 (Simple Storage Service)

**Free Tier (12 meses - novos clientes):**
- 5 GB de armazenamento Standard
- 20,000 requisicoes GET
- 2,000 requisicoes PUT

**Free Tier (sempre gratuito):**
- Nenhum (S3 Free Tier expira apos 12 meses)

**Uso do Kiro Quest:**
- Build do frontend: ~5-10 MB (HTML, JS, CSS, imagens)
- Requisicoes PUT por deploy: ~50-100 arquivos
- Requisicoes GET: servidas pelo CloudFront (cache)

**Custo apos Free Tier expirar:**
- Armazenamento: $0.023/GB/mes = ~$0.001/mes (10 MB)
- Requisicoes: $0.0004/1K GET = desprezivel

**Otimizacoes:**
- CloudFront cache reduz chamadas ao S3 drasticamente
- Versionamento desativado para economizar armazenamento
- Lifecycle rules para limpar conteudo antigo

---

### Amazon CloudFront

**Free Tier (sempre gratuito):**
- 1 TB de transferencia de dados/mes
- 10,000,000 requisicoes HTTP/HTTPS/mes
- 2,000,000 invocacoes CloudFront Functions/mes
- Invalidacoes: 1,000/mes sem custo

**Uso do Kiro Quest:**
- Transferencia: ~5 GB/mes (estimativa para ~1000 usuarios)
- Requisicoes: ~50,000/mes
- CloudFront Functions: ~50,000 invocacoes (SPA routing)
- Invalidacoes: ~10/mes (por deploy)

**Por que esta seguro:**
- 1 TB = ~200,000 page views com assets cacheados
- O quiz app e leve (~500KB total de assets)
- Cache hit ratio esperado: >90%

---

### AWS Lambda

**Free Tier (sempre gratuito):**
- 1,000,000 requisicoes/mes
- 400,000 GB-segundos de computacao/mes

**Uso do Kiro Quest:**
- 5 funcoes com 128 MB de memoria
- Duracao media: ~100ms por invocacao
- Estimativa: ~10,000 invocacoes/mes

**Calculo de GB-segundos:**
```
10,000 invocacoes x 0.128 GB x 0.1s = 128 GB-s/mes
Free Tier: 400,000 GB-s
Uso: 0.03% do Free Tier
```

**Otimizacoes:**
- Memoria configurada em 128 MB (minimo)
- Timeout de 10s (protege contra loops)
- Node.js 20 com source maps para debugging

---

### Amazon DynamoDB

**Free Tier (sempre gratuito):**
- 25 GB de armazenamento
- 25 unidades de capacidade de leitura (RCU)
- 25 unidades de capacidade de gravacao (WCU)
- 2.5 milhoes de leituras de stream/mes

**Uso do Kiro Quest:**

| Item | Tamanho Estimado | Quantidade | Total |
|------|-----------------|------------|-------|
| Progresso (por usuario/estagio) | ~2 KB | 1000 | ~2 MB |
| Resultados (por usuario/estagio) | ~500 B | 1000 | ~0.5 MB |
| Perfis | ~1 KB | 100 | ~100 KB |
| Rankings | ~200 B | 5000 | ~1 MB |
| **Total** | | | **~3.6 MB** |

**Capacidade provisionada:**
- Tabela: 5 RCU + 5 WCU
- GSI1: 5 RCU + 5 WCU
- Total: 10 RCU + 10 WCU (40% do Free Tier)

**1 RCU suporta:**
- 1 leitura strongly consistent de ate 4 KB/s
- 2 leituras eventually consistent de ate 4 KB/s

**1 WCU suporta:**
- 1 gravacao de ate 1 KB/s

**Para o Kiro Quest:**
- 5 RCU = ~10 leituras/segundo (eventually consistent)
- 5 WCU = ~5 gravacoes/segundo
- Suficiente para centenas de usuarios simultaneos

---

### Amazon Cognito

**Free Tier (sempre gratuito):**
- 50,000 MAUs (Monthly Active Users) para login direto ou com social identity providers
- Inclui login federado (Google, Facebook, etc.)

**Uso do Kiro Quest:**
- Estimativa: 10-500 MAUs
- Login com Google (federado) - incluso nos 50K

**O que conta como MAU:**
- Cada usuario unico que faz login no mes
- Refresh token nao conta como novo login
- Um usuario que faz login 100 vezes = 1 MAU

**Custo apos Free Tier (referencia):**
- 50,001 - 100,000: $0.0055/MAU
- Irrelevante para o Kiro Quest (muito abaixo de 50K)

---

### Amazon API Gateway (HTTP API)

**Free Tier (12 meses - novos clientes):**
- 1,000,000 chamadas API/mes para REST e HTTP APIs
- 750,000 minutos de conexao para WebSocket APIs

**Uso do Kiro Quest:**
- ~10,000 chamadas/mes (estimativa para 100 usuarios ativos)
- 5 endpoints x ~200 chamadas/usuario/mes x 100 usuarios = 100,000

**Custo apos Free Tier:**
- HTTP API: $1.00 por milhao de requisicoes
- 100K requisicoes = $0.10/mes

**Por que HTTP API (v2) e nao REST API (v1):**
- HTTP API: $1.00/milhao de requisicoes
- REST API: $3.50/milhao de requisicoes
- HTTP API suporta JWT authorizer nativamente
- HTTP API tem latencia menor

---

### Amazon Route 53

**Sem Free Tier para hosted zones.**

**Custos:**
- Hosted Zone: $0.50/mes por zona
- Queries: $0.40 por milhao de queries

**Para o Kiro Quest:**
- 1 hosted zone: $0.50/mes
- Queries estimadas: <10,000/mes = desprezivel

**Alternativa gratuita:**
- Usar o dominio padrao do CloudFront (`dXXXXXXX.cloudfront.net`)
- Gerenciar DNS externamente (Cloudflare DNS gratuito apontando para CloudFront)

---

### AWS Certificate Manager (ACM)

**Sempre gratuito:**
- Certificados SSL/TLS publicos sem custo
- Renovacao automatica
- Integracao nativa com CloudFront e API Gateway

---

### Amazon CloudWatch

**Free Tier (sempre gratuito):**
- 10 metricas customizadas
- 10 alarmes
- 1,000,000 requisicoes de API
- 5 GB de ingestion de logs
- 5 GB de armazenamento de logs

**Uso do Kiro Quest:**
- Metricas automaticas de Lambda, API Gateway, DynamoDB
- Logs das funcoes Lambda (~50 MB/mes estimado)
- Alarmes basicos de erro

---

## Estimativa de Trafego

### Cenario: 100 Usuarios Ativos/Mes

| Acao | Frequencia | API Calls | Lambda Invocacoes | DynamoDB Ops |
|------|-----------|-----------|-------------------|--------------|
| Login | 1x/mes | 0 | 0 | 0 |
| Carregar progresso | 5x/mes | 500 | 500 | 500 reads |
| Salvar progresso | 20x/mes | 2,000 | 2,000 | 2,000 writes |
| Submeter resultado | 5x/mes | 500 | 500 | 500 writes |
| Ver rankings | 3x/mes | 300 | 300 | 300 reads |
| Ver perfil | 2x/mes | 200 | 200 | 200 reads |
| **Total** | | **3,500** | **3,500** | **3,500** |

**Conclusao:** Muito abaixo de todos os limites do Free Tier.

### Cenario: 1000 Usuarios Ativos/Mes

| Metrica | Valor | Free Tier | % Utilizado |
|---------|-------|-----------|-------------|
| API calls | 35,000 | 1,000,000 | 3.5% |
| Lambda invocacoes | 35,000 | 1,000,000 | 3.5% |
| Lambda GB-s | 448 | 400,000 | 0.1% |
| DynamoDB storage | ~36 MB | 25 GB | 0.1% |
| DynamoDB reads/s (pico) | ~5 | 25 RCU | 20% |
| DynamoDB writes/s (pico) | ~3 | 25 WCU | 12% |
| Cognito MAUs | 1,000 | 50,000 | 2% |
| CloudFront transfer | ~50 GB | 1 TB | 5% |

**Conclusao:** Mesmo com 1000 usuarios, o uso fica abaixo de 20% do Free Tier em todos os servicos.

---

## Alertas de Billing

### Configuracao Recomendada

1. **AWS Budgets** (gratuito - primeiros 2 budgets):
   ```
   Budget mensal: $1.00
   Alerta em: 80% ($0.80)
   Notificacao: email
   ```

2. **CloudWatch Billing Alarm:**
   ```
   Metrica: EstimatedCharges
   Threshold: $1.00
   Periodo: 6 horas
   Acao: SNS -> email
   ```

3. **Free Tier Usage Alerts:**
   - Ativado automaticamente no AWS Billing Console
   - Alerta quando atinge 85% de qualquer limite do Free Tier

### Como Configurar (Console)

1. Acesse AWS Console > Billing > Budgets
2. Clique "Create a budget"
3. Selecione "Monthly cost budget"
4. Defina Amount: $1.00
5. Configure alertas por email

---

## Servicos NAO Utilizados (Economia)

| Servico Evitado | Custo Mensal | Alternativa Usada |
|----------------|--------------|-------------------|
| EC2 | $8-30+ | Lambda (serverless) |
| RDS | $15-30+ | DynamoDB (Free Tier) |
| ECS/EKS | $10-50+ | Lambda (serverless) |
| ALB | $16+ | API Gateway HTTP API |
| NAT Gateway | $32+ | Nao necessario |
| ElastiCache | $12+ | Nao necessario (app stateless) |
| Elasticsearch | $20+ | Nao necessario |

**Economia estimada:** >$100/mes comparado com arquitetura tradicional.

---

## Quando o Free Tier Expira

Alguns servicos tem Free Tier limitado a 12 meses (novos clientes):
- S3: 5 GB (expira)
- API Gateway: 1M requests (expira)

**Servicos com Free Tier permanente (nao expiram):**
- Lambda: 1M requests + 400K GB-s
- DynamoDB: 25 GB + 25 WCU + 25 RCU
- CloudFront: 1 TB + 10M requests
- Cognito: 50K MAUs
- CloudWatch: Basico
- ACM: Certificados gratuitos

**Custo estimado apos 12 meses:**
- S3 (10 MB): ~$0.001/mes
- API Gateway (100K requests): ~$0.10/mes
- Route 53: $0.50/mes
- **Total: ~$0.60/mes**

---

## Recomendacoes

1. **Mantenha billing alerts ativos** - Previne surpresas
2. **Use provisioned capacity no DynamoDB** - Evita custos variaveis inesperados
3. **Nao ative Point-in-Time Recovery** - Custa $0.20/GB/mes
4. **Use HTTP API (v2)** - 70% mais barato que REST API
5. **Monitore o CloudWatch Logs** - Pode crescer se houver muitos erros
6. **Considere DynamoDB On-Demand** apenas se o trafego for muito imprevisivel
