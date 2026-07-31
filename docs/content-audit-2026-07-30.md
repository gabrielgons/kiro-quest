# Auditoria das questões contra a documentação do Kiro

Data da revisão: 2026-07-30

## Escopo e resultado

- 87 questões lógicas revisadas, espelhadas em pt-BR e inglês (174 registros).
- 18 estágios e 42 URLs oficiais da documentação do Kiro verificadas.
- 55 questões receberam correção de conteúdo, precisão ou alternativas mais plausíveis, considerando também a correção anterior de `sp-004` nesta branch.
- 3 gabaritos mudaram: `ca-002`, `ps-002` e `st-004`.
- Todas as questões ficaram com `lastReviewedDate: 2026-07-30`.

## Informações incorretas ou desatualizadas encontradas

1. `sp-002` dizia que todo Spec usa `requirements.md`. Bugfix Specs usam `bugfix.md`; os outros dois arquivos são `design.md` e `tasks.md`.
2. `sp-004` colocava Analyze Requirements antes da escrita dos requisitos. A análise é opcional e ocorre depois de `requirements.md`, antes do design.
3. `fs-002` podia ser lida como se property-based testing fosse obrigatório. As propriedades são extraídas no design, mas a geração dos testes é opcional por padrão.
4. `fs-003` mencionava um “serviço de raciocínio” e resoluções automáticas não descritos na documentação atual. Analyze Requirements apresenta perguntas e correções sugeridas para revisão.
5. `bf-001` a `bf-004` e `rww-003` ensinavam um fluxo antigo centrado em “teste de exploração que deve falhar”. O fluxo atual tem Bug Analysis (`bugfix.md`), Design (`design.md`) e Tasks (`tasks.md`), com comportamento atual, esperado e inalterado, causa raiz, correção proposta e propriedades.
6. `cm-001` dizia que Supervised exige aprovação antes de cada ação. O agente continua trabalhando e marca as escritas para revisão ao fim do turno.
7. `cm-003` e `cm-007` diziam que restaurar checkpoint preserva o histórico posterior. A restauração volta arquivos rastreados e contexto; interações posteriores são descartadas. `cm-004` também sugeria que o usuário cria o checkpoint, embora ele seja automático a cada prompt.
8. `et-004` transformava uma observação de blog em comportamento normativo; `et-006` afirmava redução de tokens de aproximadamente 20% sem apoio na documentação; `et-007` prometia garantia absoluta de rename sem referências quebradas; `et-008` tratava diagnostics limpos como validação completa.
9. `ca-001`, `ca-002` e `ca-004` confundiam Custom Agents com Subagents e atribuíam isolamento de contexto ao recurso errado. `ca-005` dizia que Steering é sempre ativo, ignorando os modos de inclusão. `ca-006` chamava um perfil selecionável de automático.
10. `hk-001` a `hk-004` usavam o schema antigo (`eventType`, `hookAction`, `fileEdited`, `askAgent`, `runCommand`). O schema atual usa `trigger`, `matcher` e `action.type`, com triggers como `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `PostFileSave` e `Stop`.
11. `st-004` listava somente três modos e omitia `auto`. Os quatro modos atuais são `always`, `fileMatch`, `manual` e `auto`.
12. `mcp-002` dizia que ferramentas de MCP são acessadas por meio da interface de Powers. MCP funciona independentemente e pode expor tools, prompts e resource templates; um Power pode opcionalmente empacotar MCP.
13. `sk-003` pedia comportamento “sempre ativo”, mas marcava Skill como resposta. O cenário foi ajustado para recursos reutilizáveis sob demanda; comportamento sempre ativo é caso de Steering.
14. `web-001` prometia “todas as capacidades” sem qualificação. `web-004` atribuía o fluxo de issues também ao GitLab, enquanto a página citada documenta GitHub. `web-006` dizia que Specs eram automaticamente salvos no repositório. `web-007` descrevia o nível de Connections de forma excessivamente específica.
15. `au-001` e `au-003` afirmavam que toda execução de Automation abre PR. O PR é aberto quando a execução produz mudanças para revisão.
16. `ps-001` e `ps-004` citavam a seção errada e usavam o nome antigo “Integration Only”; o nome atual é `Connections access only`.
17. `ps-002` afirmava que código não é retido após a sessão. A documentação informa que perguntas, respostas e contexto adicional, inclusive código, podem ser armazenados; o uso para melhoria depende do tipo de usuário e do opt-out.
18. `ps-003` descrevia VPC endpoint de forma imprecisa. O recurso usa AWS PrivateLink e mantém o tráfego na rede da Amazon; não é uma instalação self-hosted.
19. `ps-005` listava Extension Registry Governance, que não aparece no conjunto atual da página citada. Os controles documentados abrangem modelos, MCP, chaves de API e ferramentas web.
20. `ps-006` generalizava a elegibilidade HIPAA para todo o Kiro. A documentação inclui Kiro IDE e CLI e exclui Kiro Web.
21. `es-001` atribuía à página Enterprise Concepts um benefício genérico não documentado ali. A questão agora testa a definição oficial de Kiro profile.
22. `es-003` usava nomes antigos de Hooks e prometia enforcement absoluto. O cenário agora combina Steering `always` com `PreToolUse` e bloqueio por código de saída 2.
23. `cli-004` misturava ACP com headless/CI/CD na mesma definição. São capacidades distintas. `cli-005` não avisava que a disponibilidade dos níveis de esforço depende do modelo.
24. `kb-004` e `rww-002` ensinavam que a execução deveria ser apenas sequencial. Run all analisa dependências e executa tarefas independentes em paralelo, em ondas.

## Revisão questão por questão

| Estágio | Questões | Resultado |
|---|---:|---|
| Automations | `au-001`–`au-006` (6) | `au-001` e `au-003` corrigidas; demais validadas |
| Bugfix Specs | `bf-001`–`bf-004` (4) | fluxo inteiro atualizado |
| Chat modes | `cm-001`–`cm-008` (8) | `cm-001`, `cm-003`, `cm-004` e `cm-007` corrigidas; fontes específicas aplicadas |
| Custom Agents | `ca-001`–`ca-006` (6) | `ca-001`, `ca-002`, `ca-004`, `ca-005` e `ca-006` corrigidas |
| Editor tools | `et-001`–`et-008` (8) | `et-004`, `et-006`, `et-007` e `et-008` corrigidas; URLs genéricas substituídas |
| Enterprise | `es-001`–`es-003` (3) | `es-001` e `es-003` corrigidas |
| Feature Specs | `fs-001`–`fs-004` (4) | `fs-002`, `fs-003` e `fs-004` refinadas |
| Hooks | `hk-001`–`hk-004` (4) | schema e triggers atualizados em todas |
| Kiro basics | `kb-001`–`kb-004` (4) | `kb-003` e `kb-004` refinadas |
| Kiro CLI | `cli-001`–`cli-007` (7) | `cli-004` e `cli-005` corrigidas; fonte de `cli-007` especificada |
| Kiro Web | `web-001`–`web-007` (7) | `web-001`, `web-004`, `web-006` e `web-007` corrigidas |
| MCP | `mcp-001`–`mcp-003` (3) | `mcp-002` corrigida; distratores de `mcp-003` melhorados |
| Powers | `pow-001`–`pow-003` (3) | validadas sem correção factual |
| Privacy & Security | `ps-001`–`ps-006` (6) | todas corrigidas ou qualificadas |
| Real-world workflows | `rww-001`–`rww-003` (3) | `rww-002` e `rww-003` corrigidas |
| Skills | `sk-001`–`sk-003` (3) | definição ampliada e `sk-003` corrigida |
| Specs | `sp-001`–`sp-004` (4) | todas corrigidas ou refinadas |
| Steering | `st-001`–`st-004` (4) | `st-001`, `st-003` e `st-004` corrigidas |

## Ajuste de dificuldade

As alternativas de resposta foram revisadas junto com o conteúdo. Nos itens alterados, distrações irrelevantes foram substituídas por confusões plausíveis entre recursos próximos, nomes antigos de configuração, ordem de revisão, escopo de ferramenta e momento de execução. Exemplos:

- Requirements-First versus Design-First e Bugfix Spec.
- `PreToolUse` versus `PostToolUse` e ação `command` versus `agent`.
- Steering `always`, `fileMatch`, `manual` e `auto`.
- Custom Agent versus Subagent, Skill e Steering.
- MCP independente versus MCP empacotado em Power.
- Diagnostics/LSP versus build e testes.
- Connections access only versus Common dependencies e Open internet.

## Principais fontes oficiais

- [Specs](https://kiro.dev/docs/specs/), [Feature Specs](https://kiro.dev/docs/specs/feature-specs/), [Bugfix Specs](https://kiro.dev/docs/specs/bugfix-specs/) e [Analyze Requirements](https://kiro.dev/docs/specs/analyze-requirements/)
- [Autopilot e Supervised](https://kiro.dev/docs/chat/autopilot/), [Checkpoints](https://kiro.dev/docs/chat/checkpoints/) e [Subagents](https://kiro.dev/docs/chat/subagents/)
- [Hooks](https://kiro.dev/docs/hooks/types/), [Steering](https://kiro.dev/docs/steering/), [Skills](https://kiro.dev/docs/skills/), [Custom Agents](https://kiro.dev/docs/custom-agents/) e [MCP](https://kiro.dev/docs/mcp/usage/)
- [Kiro Web](https://kiro.dev/docs/web/), [Automations](https://kiro.dev/docs/web/automations/) e [Internet access](https://kiro.dev/docs/web/sandbox/internet-access/)
- [Data protection](https://kiro.dev/docs/privacy-and-security/data-protection/), [VPC endpoints](https://kiro.dev/docs/privacy-and-security/vpc-endpoints/), [Enterprise governance](https://kiro.dev/docs/enterprise/governance/) e [Compliance validation](https://kiro.dev/docs/cli/privacy-and-security/compliance-validation/)
- [Kiro CLI](https://kiro.dev/docs/cli/), [ACP](https://kiro.dev/docs/cli/acp/), [Effort](https://kiro.dev/docs/cli/chat/effort/) e [Code Intelligence](https://kiro.dev/docs/cli/code-intelligence/)

## Validações técnicas

- Validador de conteúdo: aprovado.
- Testes automatizados: 233 aprovados.
- Typecheck: aprovado.
- 42 URLs oficiais referenciadas nas questões: HTTP 200 em 2026-07-30.
