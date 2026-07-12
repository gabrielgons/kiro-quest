---
inclusion: manual
---

# Commit & Push Seguro

Quando este comando for invocado, execute TODOS os passos abaixo de forma autônoma:

## 1. Verificar/Criar branch feature

- Verifique a branch atual com `git branch --show-current`.
- Se já estiver numa branch `feature/*`, continue nela.
- Se NÃO estiver numa feature branch:
  - Analise os arquivos modificados para inferir uma descrição curta no imperativo (ex: "adicionar-validacao-de-login").
  - Crie a branch no formato `feature/<descricao-no-imperativo>`.
  - Faça checkout nela.

## 2. Stage de todas as mudanças

- Execute `git add -A` para preparar todos os arquivos.

## 3. Auditoria de segurança

Percorra TODOS os arquivos que estão no staging (`git diff --cached --name-only`) e verifique:

### Arquivos sensíveis (por nome/extensão):
- `.env`, `.env.local`, `.env.*.local` (exceto `.env.example`)
- Chaves privadas: `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `id_rsa*`, `id_ed25519*`
- Credenciais: `credentials.json`, `service_account*.json`, `token.json`
- Configs de auth: `.npmrc`, `.pypirc`, `.aws/credentials`, `.docker/config.json`
- Secrets: `*secret*`, `*password*` (em nomes de arquivo)

### Arquivos indevidos (build artifacts, deps):
- `node_modules/`
- `dist/`, `build/`, `out/`
- `*.log`
- `.DS_Store`, `Thumbs.db`
- `coverage/`
- `*.tsbuildinfo`
- `__pycache__/`, `*.pyc`
- Binários: `*.exe`, `*.dll`, `*.so`, `*.dylib`

### Conteúdo sensível (dentro de arquivos):
- Se o arquivo tiver extensão suspeita (.env, .pem, .key), verifique se contém `PRIVATE KEY`, `AWS_SECRET_ACCESS_KEY`, `api_key=`, `password=`, etc.

## 4. Correções automáticas

Para cada arquivo problemático encontrado:
1. Remova do staging: `git reset HEAD -- <arquivo>`
2. Adicione ao `.gitignore` (se ainda não estiver lá)
3. Re-stage o `.gitignore` atualizado

Reporte no chat quais arquivos foram removidos e por quê.

## 5. Commit

- Se ainda houver arquivos no staging após a auditoria:
  - Gere uma mensagem de commit descritiva baseada nas mudanças (em português, formato: `feat: <descrição>` ou `fix: <descrição>` ou `chore: <descrição>`)
  - Execute `git commit -m "<mensagem>"`

## 6. Push

- Execute `git push -u origin <nome-da-branch>` para enviar e configurar tracking.

## 7. Relatório final

Apresente um resumo com:
- Branch utilizada
- Quantidade de arquivos commitados
- Arquivos removidos por segurança (se houver)
- Link sugerido para criação de PR (se aplicável)