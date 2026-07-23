# Checklist de Migração para AWS — Kiro Quest

> Checklist passo a passo para migrar o Kiro Quest de Cloudflare Workers para AWS (S3 + CloudFront, Cognito, Lambda + API Gateway, DynamoDB, CI/CD e DNS).
>
> Branch: `feat/aws-migration` · Documentos de apoio: [architecture.md](./architecture.md), [migration-guide.md](./migration-guide.md), [aws-free-tier.md](./aws-free-tier.md), [runbook.md](./runbook.md)

---

## Como usar este checklist

- Siga as fases **na ordem**. As stacks CDK têm dependências entre si (`BackendStack` depende de `AuthStack`; `DnsStack` depende de `FrontendStack`).
- Marque cada item `[x]` conforme concluir.
- Todos os serviços foram escolhidos para caber no **AWS Free Tier**.
- A aplicação continua funcionando **sem nenhum serviço AWS** configurado: auth e API degradam graciosamente para o modo `localStorage`.

---

## Fase 0 — Pré-requisitos

- [ ] Conta AWS criada e elegível ao Free Tier
- [ ] AWS CLI instalado e autenticado (`aws configure` / `aws sts get-caller-identity`)
- [ ] Node.js 20+ instalado (`node -v`)
- [ ] Anotar `AWS_ACCOUNT_ID` e `AWS_REGION` (usar `us-east-1` — obrigatório para certificado do CloudFront)
- [ ] (Opcional) Domínio próprio registrado + Hosted Zone no Route 53
- [ ] Projeto Google Cloud com credenciais OAuth 2.0 (Client ID + Client Secret) para login com Gmail
- [ ] Redirect URIs configurados no Google OAuth:
  - [ ] `https://{cognito-domain}.auth.{regiao}.amazoncognito.com/oauth2/idpresponse`
  - [ ] `http://localhost:5173/auth/callback` (desenvolvimento)

---

## Fase 1 — Validação local (antes de qualquer deploy)

- [ ] `npm install` na raiz
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build` (confirma que o `dist/` é gerado com code-splitting)
- [ ] **Backend primeiro** — `cd backend && npm install && npm run build` (gera `backend/dist/`)

  > O `cdk synth`/`deploy` empacota as Lambdas a partir de `backend/dist`. Se ele não existir, o synth falha com `CannotFindAsset ... backend\dist`. Por isso o backend precisa ser buildado **antes** do synth.

- [ ] (Opcional) validar o backend: `cd backend && npx tsc --noEmit && npx vitest run`
- [ ] `cd infra && npm install` (inclui o `ts-node`, exigido pelo `cdk.json` para rodar `bin/infra.ts`)
- [ ] `cd infra && npx tsc --noEmit`
- [ ] `cd infra && npx cdk synth --quiet` (valida as 4 stacks: Frontend, Auth, Backend, GitHubOidc)

---

## Fase 2 — Infraestrutura base / Frontend (S3 + CloudFront)

- [ ] Copiar `infra/.env.example` para `infra/.env` e preencher `AWS_ACCOUNT_ID` e `AWS_REGION`
- [ ] Bootstrap do CDK (primeira vez na conta/região):
  ```bash
  cd infra
  npx cdk bootstrap aws://{ACCOUNT_ID}/us-east-1
  ```
- [ ] Deploy do Frontend Stack:
  ```bash
  npx cdk deploy KiroQuestFrontendStack --require-approval never
  ```
- [ ] Anotar os outputs: **nome do bucket S3** e **CloudFront Distribution ID** + **URL do CloudFront**
- [ ] Publicar os assets no S3 e invalidar o cache:
  ```bash
  npm run build          # na raiz do projeto
  cd infra && npm run sync
  ```
- [ ] **Validação:** abrir a URL do CloudFront, confirmar carregamento da app e navegação entre páginas

---

## Fase 3 — Autenticação (Cognito + Google SSO)

- [ ] Deploy do Auth Stack com credenciais do Google:
  ```bash
  cd infra
  npx cdk deploy KiroQuestAuthStack \
    -c googleClientId=SEU_GOOGLE_CLIENT_ID \
    -c googleClientSecretArn=arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:kiro-quest/google-client-secret \
    -c cognitoDomainPrefix=kiro-quest \
    --require-approval never
  ```
  > ⚠️ **Nunca passe o Google Client Secret em plaintext via CLI.** Use o ARN do Secrets Manager conforme acima. O secret deve ser criado previamente no AWS Secrets Manager.
- [ ] Anotar outputs: `UserPoolId`, `UserPoolClientId`, `CognitoDomain`
- [ ] Configurar o frontend criando `.env.local` na raiz:
  ```
  VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxx
  VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
  VITE_COGNITO_DOMAIN=https://kiro-quest.auth.us-east-1.amazoncognito.com
  VITE_AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
  VITE_AUTH_LOGOUT_URI=http://localhost:5173/
  ```
- [ ] Confirmar que o redirect URI do Cognito está registrado no Google OAuth
- [ ] **Validação:** `npm run dev`, clicar em "Entrar", fazer login com Google e confirmar retorno autenticado ao app

> Segurança: o `googleClientSecret` é armazenado via referência do Secrets Manager (não em plaintext) — corrigido na FEAT-006.

---

## Fase 4 — Backend (Lambda + API Gateway + DynamoDB)

- [ ] Build do backend:
  ```bash
  cd backend
  npm install
  npm run build
  ```
- [ ] Deploy do Backend Stack (depende do Auth Stack já existir):
  ```bash
  cd ../infra
  npx cdk deploy KiroQuestBackendStack --require-approval never
  ```
- [ ] Anotar o output da **URL do API Gateway**
- [ ] Adicionar ao `.env.local` (e ao `.env.production` no deploy):
  ```
  VITE_API_URL=https://xxxxxxx.execute-api.us-east-1.amazonaws.com
  ```
- [ ] Confirmar que o CORS aponta para o domínio do CloudFront (+ localhost em dev) — corrigido na FEAT-006
- [ ] **Validação:**
  - [ ] Login na aplicação, completar um estágio
  - [ ] Conferir no DynamoDB que o progresso foi gravado
  - [ ] Abrir em outro navegador/dispositivo, logar e confirmar sincronização do progresso
  - [ ] Conferir ordenação de ranking (empate por score deve premiar quem alcançou primeiro) — corrigido na FEAT-006

---

## Fase 5 — CI/CD (GitHub Actions + OIDC)

- [ ] Deploy do OIDC Stack:
  ```bash
  cd infra
  npx cdk deploy KiroQuestGitHubOidcStack \
    -c githubRepo=seu-usuario/kiro-quest \
    --require-approval never
  ```
- [ ] No GitHub em **Settings > Secrets and variables > Actions > Variables**, adicionar:
  - [ ] `AWS_ACCOUNT_ID`
  - [ ] `AWS_REGION` (`us-east-1`)
  - [ ] `S3_BUCKET_NAME` (output do FrontendStack)
  - [ ] `CLOUDFRONT_DISTRIBUTION_ID` (output do FrontendStack)
- [ ] Criar o Environment `production` no GitHub
- [ ] **Validação:**
  - [ ] Abrir um PR e confirmar que `ci.yml` roda typecheck, test e build
  - [ ] Abrir um PR tocando em `infra/` e confirmar comentário do `cdk-diff.yml`
  - [ ] Push em `main` e confirmar que `deploy-frontend.yml` sincroniza o S3 e invalida o CloudFront
  - [ ] Push tocando em `backend/` e confirmar `deploy-backend.yml`

---

## Fase 6 — DNS e domínio customizado (ADIADA — usando `*.cloudfront.net` por enquanto)

> **Decisão atual:** seguir com a URL gratuita `*.cloudfront.net`. Nenhum passo desta fase precisa ser executado agora.
>
> **Por que adiar:** a taxa de registro de um domínio no Route 53 (e a renovação anual) **não é coberta por créditos AWS** — ela é cobrada direto no cartão cadastrado, mesmo com créditos disponíveis ([doc oficial](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html)). A hosted zone (~US$0,50/mês) e as queries de DNS são uso normal e costumam ser cobertos por créditos, mas a taxa do nome de domínio em si, não.
>
> Quando quiser um domínio próprio: dá pra registrar em qualquer registrador e só apontar o DNS para a AWS, ou registrar via Route 53 ciente da cobrança no cartão. Só então executar os passos abaixo.

<details>
<summary>Passos para quando adotar domínio próprio (não fazer agora)</summary>

- [ ] Deploy do DNS Stack:
  ```bash
  cd infra
  npx cdk deploy KiroQuestDnsStack \
    -c domainName=kiro-quest.seudominio.com \
    -c hostedZoneName=seudominio.com \
    --require-approval never
  ```
- [ ] Re-deploy do Frontend com o domínio + certificado ACM:
  ```bash
  npx cdk deploy KiroQuestFrontendStack \
    -c certificateArn=arn:aws:acm:us-east-1:... \
    -c domainNames=kiro-quest.seudominio.com \
    --require-approval never
  ```
- [ ] Adicionar o domínio de produção nos redirect URIs do Google OAuth e nos callback URLs do Cognito

</details>

---

## Fase 7 — Execução paralela e cutover DNS

- [ ] Manter Cloudflare e AWS ativos simultaneamente durante a transição
- [ ] Reduzir o TTL do DNS para 60s pelo menos 24h antes do cutover
- [ ] (Opção A — gradual) Roteamento ponderado no Route 53: começar com ~10% para o CloudFront e aumentar
- [ ] (Opção B — rápido) Apontar o registro para o CloudFront e aguardar propagação (~5 min)
- [ ] Monitorar métricas por 24h após o cutover
- [ ] Restaurar o TTL para 3600s após estabilizar

### Métricas a acompanhar (CloudWatch)
- [ ] Tempo de resposta (p50, p95, p99)
- [ ] Taxa de erros 4xx/5xx
- [ ] Cache hit ratio do CloudFront
- [ ] Falhas de login no Cognito
- [ ] Escritas com sucesso no DynamoDB

---

## Fase 8 — Pós-migração e limpeza

- [ ] Remover `wrangler.jsonc` e triggers/rotas do Cloudflare Workers
- [ ] Atualizar a URL pública no README e em docs externas
- [ ] Confirmar CORS restrito ao domínio de produção
- [ ] Configurar CloudWatch Alarms:
  - [ ] Erros 5xx > 1% por 5 min
  - [ ] Lambda duration p99 > 5s
  - [ ] Eventos de throttling no DynamoDB
  - [ ] Pico de falhas de sign-in no Cognito
- [ ] Revisar custos semanalmente no primeiro mês (validar Free Tier)

---

## Plano de rollback (referência rápida)

| Cenário | Ação |
|---------|------|
| Frontend (CloudFront/S3) com erro | Reverter DNS para Cloudflare **ou** re-sync do último build funcional no S3 |
| Backend (Lambda/API) com erro | Frontend segue via `localStorage`; checar CloudWatch; `cdk deploy --previous` se preciso |
| Cognito com erro | Usuários seguem em modo anônimo; revisar App Client e callback URLs |
| Rollback total | Reverter DNS + `npx wrangler deploy` no Cloudflare |

Detalhes completos em [migration-guide.md](./migration-guide.md).

---

## Status atual da branch `feat/aws-migration`

Todas as fases de implementação já foram concluídas em código (task `task-aws-migration-evolution`, status `completed`):

- FEAT-001 — Infra CDK (S3 + CloudFront + OAC) ✅
- FEAT-002 — Cognito + Google SSO (PKCE, zero dependências externas) ✅
- FEAT-003 — Backend Lambda + API Gateway + DynamoDB ✅
- FEAT-004 — CI/CD com GitHub Actions + OIDC ✅
- FEAT-005 — Documentação (arquitetura, guia, custos, runbook) ✅
- FEAT-006 — Correção das 7 issues do code review (CORS, ordenação de ranking, erro de sync, escopo do CloudFront no OIDC, validação de tamanho de body, race condition do refresh token, secret do Google) ✅

**Verificação:** build ✅ · typecheck ✅ · testes frontend 187 passando (1 falha pré-existente não relacionada) · testes backend 20 passando · `cdk synth` ok para as 4 stacks.

Este checklist cobre o que ainda falta: **provisionar de fato os recursos na AWS** (os passos acima são de deploy/operação, não de código).
