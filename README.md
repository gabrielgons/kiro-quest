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
- [Vitest](https://vitest.dev/) + [@vue/test-utils](https://test-utils.vuejs.org/) + [fast-check](https://fast-check.dev/) (testes unitários e baseados em propriedades)
- Cloudflare Workers (hospedagem da versão pública)

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

## Licenca

Este projeto e open source. Verifique o arquivo de licenca ou abra uma issue caso precise de mais detalhes.
