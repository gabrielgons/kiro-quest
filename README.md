# Kiro Quest

> Um quiz progressivo, interativo e gamificado para dominar os conceitos do **Kiro** — do básico aos cenários empresariais.

**Acesse agora:** [kiro-quest.trilha.workers.dev](https://kiro-quest.trilha.workers.dev/#/quiz/kiro-basics)

---

## Sobre

Kiro Quest é uma aplicação web que transforma o aprendizado sobre o Kiro em uma jornada por estágios. Cada estágio cobre um tema específico, com perguntas de múltipla escolha, verdadeiro/falso e ordenação. Ao final, você recebe feedback explicativo, links para a documentação e pode compartilhar seu resultado.

### Principais recursos

- Jornada progressiva por estágios temáticos
- Múltiplos formatos de pergunta (múltipla escolha, V/F e ordenação)
- Feedback imediato com explicação e link para a fonte
- Revisão de erros ao final de cada estágio
- Acompanhamento de progresso salvo localmente
- Tema claro/escuro
- Compartilhamento de resultados (LinkedIn / clipboard)
- Internacionalização (pt-BR)
- Acessibilidade (rótulos ARIA, navegação por teclado)

### Estágios disponíveis

1. **Kiro Básico** — fundamentos da ferramenta
2. **Specs** — visão geral de specs
3. **Feature Specs** — specs para novas funcionalidades
4. **Bugfix Specs** — specs para correção de bugs
5. **Steering** — arquivos de steering e contexto persistente
6. **Hooks** — hooks e automações
7. **MCP** — Model Context Protocol
8. **Powers** — Powers do Kiro
9. **Skills** — Skills e habilidades especializadas
10. **Fluxos Reais de Trabalho** — aplicação prática no dia a dia
11. **Cenários Empresariais** — uso em times e contextos corporativos

---

## Stack

- [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) (build & dev server)
- [Pinia](https://pinia.vuejs.org/) (gerenciamento de estado)
- [Vue Router](https://router.vuejs.org/)
- [Vitest](https://vitest.dev/) + [@vue/test-utils](https://test-utils.vuejs.org/) + [fast-check](https://fast-check.dev/) (testes unitarios e baseados em propriedades)
- **AWS S3 + CloudFront** (hospedagem do frontend)
- **AWS Lambda + API Gateway** (backend serverless)
- **Amazon DynamoDB** (banco de dados NoSQL)
- **Amazon Cognito** (autenticacao SSO com Google)
- **AWS CDK** (infraestrutura como codigo)
- **GitHub Actions + OIDC** (CI/CD)

---

## Começando

### Pré-requisitos

- Node.js 20+ e npm

### Instalação

```bash
npm install
```

### Rodando localmente

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:5173`.

---

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Type-check e build de produção |
| `npm run preview` | Servir o build de produção localmente |
| `npm test` | Executa todos os testes |
| `npm run test:properties` | Executa apenas os testes baseados em propriedades |
| `npm run typecheck` | Verifica tipos sem emitir arquivos |

---

## Estrutura do projeto

```
kiro-quest/
├── content/
│   ├── questions/pt-BR/    # Perguntas por estágio (JSON)
│   ├── answers/pt-BR/      # Gabarito e explicações
│   └── i18n/pt-BR/         # Strings da interface
├── public/                 # Assets estáticos
├── scripts/
│   └── validate-content.ts # Validação dos arquivos de conteúdo
└── src/
    ├── assets/             # Estilos e variáveis CSS
    ├── components/         # Componentes Vue (renderização de perguntas, UI)
    ├── composables/        # Composables (ex.: tema)
    ├── data/               # Carregamento de perguntas
    ├── engine/             # Motor do quiz (scoring, randomização, etc.)
    ├── i18n/               # Locale e traduções
    ├── progress/           # Persistência de progresso
    ├── router/             # Rotas
    ├── sharing/            # Geração de texto para compartilhamento
    ├── stores/             # Stores Pinia
    └── views/              # Páginas (Home, Stage Select, Quiz, Summary, etc.)
```

---

## Adicionando perguntas

Cada estágio possui dois arquivos em `content/`:

- `content/questions/pt-BR/<estagio>.json` — enunciados e opções
- `content/answers/pt-BR/<estagio>.answers.json` — respostas corretas e explicações

Após editar, você pode validar o conteúdo com:

```bash
npx tsx scripts/validate-content.ts
```

---

## Testes

```bash
npm test                  # roda toda a suíte
npm run test:properties   # apenas property-based tests (fast-check)
```

---

## Contribuindo

Contribuições são bem-vindas! Sugestões de novos estágios, perguntas, melhorias de acessibilidade ou correções de tradução podem ser abertas via issue ou pull request.

---

## Infraestrutura AWS

O projeto inclui infraestrutura como codigo (IaC) usando AWS CDK para hospedar a aplicacao na AWS, substituindo o Cloudflare Workers.

### Arquitetura

- **S3** - Bucket privado para armazenamento dos assets estaticos (dist/)
- **CloudFront** - CDN global com Origin Access Control (OAC) para servir o conteudo do S3
- **Route 53** - DNS gerenciado (opcional, para dominio customizado)
- **ACM** - Certificado SSL/TLS gratuito (opcional, para dominio customizado)

Todos os recursos sao otimizados para o AWS Free Tier:
- S3 Standard: 5GB de armazenamento, 20K GET, 2K PUT/mes
- CloudFront: 1TB de transferencia, 10M requisicoes/mes
- Route 53: $0.50/mes por hosted zone (unico custo fixo se usar dominio customizado)

### Deploy

#### Pre-requisitos

- AWS CLI configurado com credenciais validas
- Node.js 20+
- Conta AWS com permissoes para criar S3, CloudFront, Route 53, e ACM

#### Primeira vez (provisionar infraestrutura)

```bash
cd infra
npm install
cp .env.example .env  # Preencha com seus valores

# Bootstrap do CDK (apenas na primeira vez por conta/regiao)
npx cdk bootstrap

# Deploy da infraestrutura
npm run deploy
```

#### Deploy do frontend (apos build)

```bash
# Na raiz do projeto
npm run build

# Sincronizar dist/ com S3 e invalidar cache do CloudFront
cd infra
npm run sync
```

#### Usando dominio customizado (opcional)

Para usar um dominio customizado, configure as variaveis `DOMAIN_NAME` e `HOSTED_ZONE_NAME` no `.env` e faca o deploy dos dois stacks:

```bash
npx cdk deploy --all -c domainName=kiro-quest.seudominio.com -c hostedZoneName=seudominio.com
```

### Estrutura do diretorio infra/

```
infra/
├── bin/
│   └── infra.ts            # Entry point do CDK app
├── lib/
│   ├── frontend-stack.ts   # S3 + CloudFront + OAC
│   └── dns-stack.ts        # Route 53 + ACM (opcional)
├── scripts/
│   └── sync-to-s3.mjs     # Script de sync dist/ -> S3
├── cdk.json                # Configuracao do CDK
├── package.json            # Dependencias do CDK
├── tsconfig.json           # TypeScript config
└── .env.example            # Variaveis de configuracao
```

---

## CI/CD Pipeline

O projeto utiliza GitHub Actions para integracao continua e deploy automatizado. A autenticacao com a AWS e feita via OIDC (OpenID Connect), sem necessidade de chaves de acesso de longa duracao.

### Workflows

| Workflow | Trigger | Descricao |
| --- | --- | --- |
| `ci.yml` | Pull Request para `main` | Valida build, testes e typecheck (frontend, backend, infra) |
| `deploy-frontend.yml` | Push para `main` (paths: src/, content/, public/) | Build Vue app, sync S3, invalidate CloudFront |
| `deploy-infra.yml` | Push para `main` (paths: backend/, infra/) | Bundle Lambdas e deploy das stacks de infraestrutura |
| `cdk-diff.yml` | Pull Request (paths: backend/, infra/) | Typecheck e `cdk synth` offline, sem credenciais AWS |
| `kiro-code-review.yml` | `pull_request_target` (opened/synchronize/reopened) | Estagio 1: trata o PR somente como dados, analisa sem tools e publica um artefato JSON |
| `kiro-code-review-publish.yml` | `workflow_run` do estagio 1 | Estagio 2: valida o artefato e publica o review com `event=COMMENT` |

### Configuracao do OIDC

A autenticacao e feita via GitHub OIDC Provider, eliminando a necessidade de armazenar `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` como secrets.

#### Pre-requisitos

1. Faca o deploy do stack `KiroQuestGitHubOidcStack` para criar o OIDC provider e a IAM role:

```bash
cd infra
npx cdk deploy KiroQuestGitHubOidcStack -c githubRepo=seu-usuario/kiro-quest
```

2. Configure as seguintes **Repository Variables** no GitHub (`Settings > Secrets and variables > Actions > Variables`):

| Variavel | Descricao | Exemplo |
| --- | --- | --- |
| `AWS_ACCOUNT_ID` | ID da conta AWS | `123456789012` |
| `AWS_REGION` | Regiao AWS principal | `us-east-1` |
| `S3_BUCKET_NAME` | Nome do bucket S3 do frontend | `kiro-quest-site-123456789012` |
| `CLOUDFRONT_DISTRIBUTION_ID` | ID da distribuicao CloudFront | `E1234567890ABC` |

3. Mantenha as variaveis e o secret `GOOGLE_CLIENT_SECRET_ARN` no escopo do
   **Environment `production`**. Os jobs de deploy declaram `environment:
   production`, e a trust policy OIDC aceita apenas o subject desse environment.

4. No environment `production` (`Settings > Environments > production`), defina
   **Deployment branches and tags** como `main`. Sem essa restricao, qualquer
   branch que declare o environment obtem o subject OIDC e o gate perde efeito.
   Esse e tambem o lugar para ativar `Required reviewers` se quiser aprovacao
   manual antes de cada deploy.

#### Trust Relationship

A role `KiroQuestGitHubActionsRole` confia apenas em tokens OIDC emitidos pelo repositorio configurado, via condicao:

```json
{
  "StringEquals": {
    "token.actions.githubusercontent.com:sub": "repo:seu-usuario/kiro-quest:environment:production"
  }
}
```

Somente jobs que declaram `environment: production` podem assumir a role. Isso e
mais restrito que limitar por branch: um workflow novo adicionado a `main` nao
consegue credenciais AWS sem optar pelo environment. Workflows de pull request
nao recebem credenciais.

> **Ordem de aplicacao.** Ao alterar o subject da trust policy, faca
> `npx cdk deploy KiroQuestGitHubOidcStack` **antes** de mergear a mudanca nos
> workflows. Se o subject na AWS e o declarado no workflow divergirem, o step
> `Configure AWS credentials` falha com `Not authorized to perform
> sts:AssumeRoleWithWebIdentity`.

### Estrutura dos workflows

```
.github/workflows/
├── ci.yml                  # Validacao em PRs
├── deploy-frontend.yml     # Deploy frontend (S3 + CloudFront)
├── deploy-infra.yml        # Deploy backend e infraestrutura (Lambda + CDK)
├── cdk-diff.yml            # CDK synth offline em PRs
├── kiro-code-review.yml    # Revisao automatizada: analise (sem token de escrita)
└── kiro-code-review-publish.yml  # Revisao automatizada: publicacao validada
```

### Revisao automatizada de codigo

A revisao roda em dois estagios, porque o conteudo de um pull request nao e
confiavel e um agente que o le nao pode ter acesso simultaneo a segredos de CI e
a um token de escrita.

**Estagio 1 - `kiro-code-review.yml`** (evento `pull_request_target`)

- O workflow, a definicao do agente e os scripts vem sempre da **base** do PR.
- O head do PR nao e baixado para o workspace. Um script confiavel busca
  metadados, patches e conteudo textual pela API e monta um `context.json` com
  limites de arquivos e tamanho; nenhum codigo do PR e executado.
- `permissions` sao apenas de leitura. O token automatico do GitHub e usado pelo
  script preparador, mas nao e exportado ao processo do Kiro.
- O agente roda com `tools: []`: sem `read`, `write`, `shell`, ferramenta de
  rede, AWS ou MCP. O processo do CLI ainda usa a rede para falar com o servico
  Kiro; o contexto entra por `stdin` e a resposta JSON e capturada de `stdout`.
- O `KIRO_HOME` e efemero, recursos herdados e auto-update ficam desativados.
- A telemetria do CLI fica desativada neste job.
- Saida unica: `review-output/review.json`, validada e publicada como artefato.

**Estagio 2 - `kiro-code-review-publish.yml`** (evento `workflow_run`)

- Executa sempre a definicao da branch default, entao um PR nao consegue alterar
  este job nem o script de publicacao.
- Recebe `pull-requests: write`, mas nao recebe `KIRO_API_KEY` e nao roda agente.
- `.github/scripts/publish-review.mjs` valida o payload antes de chamar a API:
  usa o numero e o head SHA de um metadata separado, criado pelo workflow
  confiavel e nunca pelo modelo, confirma a origem do `workflow_run`, recusa
  publicar se o PR avancou, aceita comentarios apenas em paths e linhas que
  existem no diff, aplica limites de tamanho e quantidade, remove caracteres de
  controle e bidi, forca `event=COMMENT` e adiciona o rodape de atribuicao.
  Achados que nao ancoram no diff vao para o corpo do review.

**Pin do Kiro CLI.** O estagio 1 nao usa o instalador de conveniencia
(`cli.kiro.dev/install`), porque ele resolve sempre para `stable/latest` e o
binario mudaria entre execucoes. O workflow baixa o artefato versionado e confere
o digest; as duas constantes ficam no proprio arquivo, entao qualquer atualizacao
passa por code review:

```yaml
KIRO_CLI_VERSION: '2.14.2'
KIRO_CLI_SHA256: 'b144d4b1f8ca0083967fe13a5c35db18bd9543ecede6f1eec166f3b0a04f876a'
```

Para atualizar, leia a versao e o `sha256` da entrada
`kirocli-x86_64-linux.zip` em
`https://prod.download.cli.kiro.dev/stable/latest/manifest.json`, revise as
mudancas do CLI e abra um PR alterando os dois valores. Um step posterior roda
`kiro-cli --version` e falha se o pin nao tiver surtido efeito.

Nenhuma Repository Variable e necessaria para a revisao automatizada. O unico
segredo usado e `KIRO_API_KEY`, que precisa estar no escopo **Repository** (nao
em um Environment), porque o job de analise nao declara `environment:`.

**Limite de rede:** o desenho atual remove rede acionavel pelo modelo, mas nao
instala um firewall no runner hospedado pelo GitHub. Os steps confiaveis ainda
precisam acessar a API e o Git do GitHub, baixar o artefato versionado do Kiro e
chamar o servico Kiro. Para uma allowlist de egress efetiva, use um runner
self-hosted efemero atras de proxy/firewall, primeiro em modo de auditoria para
identificar todos os endpoints do Kiro. O conteudo textual do PR e enviado ao
servico Kiro por definicao; isso deve ser aceito pela politica de dados do
repositorio.

---

## Documentacao

Documentacao detalhada esta disponivel na pasta `docs/`:

| Documento | Descricao |
| --- | --- |
| [Arquitetura](docs/architecture.md) | Diagrama completo da arquitetura, componentes, fluxo de dados, modelo de seguranca |
| [Guia de Migracao](docs/migration-guide.md) | Passo a passo para migrar de Cloudflare Workers para AWS |
| [Custos - Free Tier](docs/aws-free-tier.md) | Analise detalhada de custos e limites do AWS Free Tier |
| [Runbook Operacional](docs/runbook.md) | Monitoramento, troubleshooting, deploy manual, gerenciamento de usuarios |

### Configuracao de Ambiente

O frontend utiliza variaveis de ambiente Vite para configuracao:

```bash
# Copie o template de desenvolvimento
cp .env.development .env.local

# Preencha com seus valores (Cognito, API URL)
# O app funciona sem backend - progresso salvo em localStorage
```

Veja `src/config/environment.ts` para a configuracao tipada e `.env.development` / `.env.production` para os templates.

---

## Licenca

Este projeto e open source. Verifique o arquivo de licenca ou abra uma issue caso precise de mais detalhes.
