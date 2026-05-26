# Requirements Document

## Introduction

Este documento define os requisitos para a funcionalidade de Dark Mode na aplicação Kiro Quest. O recurso permite que os usuários alternem entre temas claro e escuro, com detecção automática da preferência do sistema operacional, persistência da escolha via localStorage, e um botão de alternância acessível sempre visível na interface.

## Glossary

- **Composable_useTheme**: Composable Vue 3 que encapsula a lógica de detecção, alternância e persistência do tema
- **ThemeToggle**: Componente Vue que renderiza o botão flutuante de alternância de tema
- **Sistema**: A aplicação Kiro Quest como um todo
- **Tema**: Modo visual da interface, podendo ser `'light'` (claro) ou `'dark'` (escuro)
- **Preferência_do_Sistema**: Configuração de tema do sistema operacional do usuário, detectada via `prefers-color-scheme`
- **Preferência_Salva**: Valor armazenado no localStorage sob a chave `kiro-quest-theme`
- **DOM**: Document Object Model do navegador, onde o atributo `data-theme` é aplicado no elemento `<html>`

## Requirements

### Requisito 1: Detecção Inicial do Tema

**User Story:** Como usuário, quero que a aplicação detecte automaticamente minha preferência de tema do sistema operacional, para que eu tenha uma experiência visual adequada desde o primeiro acesso.

#### Critérios de Aceitação

1. WHEN a aplicação é inicializada e existe um valor no localStorage (chave `kiro-quest-theme`) igual a `'light'` ou `'dark'`, THEN o Composable_useTheme SHALL usar o valor salvo como tema ativo e aplicar o atributo `data-theme` correspondente no elemento `<html>`
2. WHEN a aplicação é inicializada e não existe valor no localStorage (chave `kiro-quest-theme`) ou o valor armazenado não é `'light'` nem `'dark'`, THEN o Composable_useTheme SHALL detectar a Preferência_do_Sistema via `window.matchMedia('(prefers-color-scheme: dark)')` e usar o resultado como tema ativo
3. WHEN a aplicação é inicializada e a Preferência_do_Sistema indica modo escuro (matchMedia retorna `matches: true`), THEN o Composable_useTheme SHALL definir o tema como `'dark'`
4. WHEN a aplicação é inicializada e a Preferência_do_Sistema indica modo claro (matchMedia retorna `matches: false`), THEN o Composable_useTheme SHALL definir o tema como `'light'`
5. IF o localStorage não estiver disponível ou lançar exceção durante a leitura, THEN o Composable_useTheme SHALL usar a Preferência_do_Sistema como fallback sem propagar erro ao usuário
6. IF a API `window.matchMedia` não estiver disponível, THEN o Composable_useTheme SHALL definir `'light'` como tema padrão
7. WHEN o tema ativo é determinado durante a inicialização, THEN o Composable_useTheme SHALL aplicar o atributo `data-theme` no `document.documentElement` com valor igual ao tema ativo de forma síncrona após a execução do composable

### Requisito 2: Alternância Manual de Tema

**User Story:** Como usuário, quero alternar manualmente entre tema claro e escuro através de um botão, para que eu possa escolher o modo visual que prefiro independentemente da configuração do sistema.

#### Critérios de Aceitação

1. WHEN o usuário clica no ThemeToggle, IF o tema atual é `'light'`, THEN o Sistema SHALL atualizar o estado reativo `theme` para `'dark'`
2. WHEN o usuário clica no ThemeToggle, IF o tema atual é `'dark'`, THEN o Sistema SHALL atualizar o estado reativo `theme` para `'light'`
3. WHEN o tema é alternado, THEN o Composable_useTheme SHALL atualizar o atributo `data-theme` no elemento `<html>` do DOM para refletir o novo tema de forma síncrona após o clique
4. WHEN o tema é alternado, THEN o Composable_useTheme SHALL persistir o novo valor no localStorage sob a chave `kiro-quest-theme`
5. IF o localStorage lança exceção durante a persistência do tema, THEN o Sistema SHALL manter o novo tema aplicado no DOM e no estado reativo sem propagar erro ao usuário
6. WHEN o tema é alternado, THEN o ThemeToggle SHALL atualizar seu ícone para representar a ação oposta disponível (ícone de sol quando tema escuro está ativo, ícone de lua quando tema claro está ativo) e atualizar o `aria-label` para descrever a ação resultante do próximo clique

### Requisito 3: Persistência da Preferência

**User Story:** Como usuário, quero que minha escolha de tema seja lembrada entre sessões, para que eu não precise reconfigurar o tema toda vez que abro a aplicação.

#### Critérios de Aceitação

1. WHEN o usuário alterna o tema manualmente, THE Composable_useTheme SHALL salvar o valor `'light'` ou `'dark'` no localStorage de forma síncrona, antes de retornar do método toggleTheme
2. WHEN a aplicação é recarregada após uma alternância manual, THE Composable_useTheme SHALL ler o valor armazenado no localStorage e aplicar o tema correspondente como tema ativo (definindo o estado reativo e o atributo `data-theme` no elemento `<html>`)
3. THE Composable_useTheme SHALL usar a chave `kiro-quest-theme` para armazenar a preferência no localStorage
4. IF o valor lido do localStorage não for exatamente `'light'` ou `'dark'`, THEN THE Composable_useTheme SHALL ignorar o valor armazenado e determinar o tema inicial pela preferência do sistema operacional
5. IF o localStorage não estiver disponível ou lançar exceção ao ler ou gravar, THEN THE Composable_useTheme SHALL continuar funcionando normalmente usando a detecção de preferência do sistema operacional, sem exibir erro ao usuário

### Requisito 4: Sincronização com Preferência do Sistema

**User Story:** Como usuário que não fez escolha manual, quero que a aplicação acompanhe mudanças na preferência de tema do meu sistema operacional, para que a interface se adapte automaticamente.

#### Critérios de Aceitação

1. WHILE não existe Preferência_Salva válida (valor 'light' ou 'dark') no localStorage, WHEN a Preferência_do_Sistema muda (evento 'change' no MediaQueryList de prefers-color-scheme), THEN o Composable_useTheme SHALL atualizar o valor reativo `theme` e o atributo `data-theme` do elemento `<html>` para corresponder à nova preferência do sistema dentro do mesmo ciclo de evento
2. WHILE existe Preferência_Salva válida no localStorage, WHEN a Preferência_do_Sistema muda, THEN o Composable_useTheme SHALL manter o valor reativo `theme` e o atributo `data-theme` inalterados, ignorando a mudança do sistema
3. WHEN o usuário executa toggleTheme() durante uma sessão onde inicialmente não havia Preferência_Salva, THEN o Composable_useTheme SHALL parar de reagir a mudanças na Preferência_do_Sistema para o restante do ciclo de vida do escopo reativo atual
4. WHILE não existe Preferência_Salva válida no localStorage E o valor armazenado é uma string diferente de 'light' ou 'dark', WHEN a Preferência_do_Sistema muda, THEN o Composable_useTheme SHALL tratar o valor inválido como ausência de preferência e atualizar o tema conforme a nova preferência do sistema

### Requisito 5: Aplicação Visual do Tema via CSS Variables

**User Story:** Como usuário, quero que toda a interface mude de aparência de forma consistente ao alternar o tema, para que a experiência visual seja coerente em todos os componentes.

#### Critérios de Aceitação

1. WHEN o tema ativo é `'dark'`, THEN o Sistema SHALL aplicar o conjunto de CSS variables do tema escuro via seletor `[data-theme="dark"]` no arquivo `variables.css`
2. WHEN o tema ativo é `'light'`, THEN o Sistema SHALL aplicar o conjunto de CSS variables do tema claro definido em `:root` no arquivo `variables.css`
3. THE Sistema SHALL definir variantes para ambos os temas das seguintes categorias de CSS variables: cores de texto (`--color-text`, `--color-text-secondary`, `--color-text-inverse`), cores de fundo (`--color-background`, `--color-background-secondary`, `--color-background-card`, `--color-surface`), cores de borda (`--color-border`, `--color-border-focus`), cores semânticas (`--color-primary-light`, `--color-success-light`, `--color-error-light`, `--color-warning-light`) e sombras (`--shadow-sm`, `--shadow-md`, `--shadow-lg`)
4. WHEN o tema é alternado, THEN o Sistema SHALL aplicar transição suave nas propriedades `background-color` e `color` usando a variável `--transition-normal` (250ms ease) existente no projeto

### Requisito 6: Acessibilidade do Botão de Alternância

**User Story:** Como usuário que utiliza tecnologias assistivas, quero que o botão de alternância de tema seja acessível, para que eu possa identificar e usar a funcionalidade independentemente de limitações visuais ou motoras.

#### Critérios de Aceitação

1. THE ThemeToggle SHALL fornecer um atributo `aria-label` que indica a ação resultante do clique, refletindo o tema oposto ao ativo (ex: "Mudar para tema claro" quando o tema escuro está ativo, "Mudar para tema escuro" quando o tema claro está ativo)
2. THE ThemeToggle SHALL ter dimensão mínima de toque de 44px por 44px
3. WHILE o tema ativo é `'dark'`, THE ThemeToggle SHALL exibir um ícone de sol indicando que o clique mudará para tema claro
4. WHILE o tema ativo é `'light'`, THE ThemeToggle SHALL exibir um ícone de lua indicando que o clique mudará para tema escuro
5. THE ThemeToggle SHALL ser posicionado de forma fixa na tela com z-index suficiente para permanecer visível sobre o conteúdo da página independentemente da rolagem
6. THE ThemeToggle SHALL ser focalizável via navegação por teclado (tecla Tab) e ativável via teclas Enter e Space
7. WHEN o ThemeToggle recebe foco via teclado, THE ThemeToggle SHALL exibir um indicador de foco visível com contraste mínimo de 3:1 em relação às cores adjacentes

### Requisito 7: Consistência entre Estado e DOM

**User Story:** Como desenvolvedor, quero que o estado reativo do tema esteja sempre sincronizado com o atributo no DOM, para que não haja inconsistências visuais.

#### Critérios de Aceitação

1. THE Composable_useTheme SHALL manter o valor de `theme` igual ao atributo `data-theme` no elemento `<html>` após qualquer operação que altere o tema (inicialização, alternância manual ou mudança de preferência do sistema)
2. WHEN o tema é inicializado, THE Composable_useTheme SHALL aplicar o atributo `data-theme` no DOM de forma síncrona, antes de retornar a interface `UseThemeReturn` ao chamador
3. WHEN `toggleTheme()` é chamado, THE Composable_useTheme SHALL atualizar o estado reativo (`theme.value`) e o atributo `data-theme` no DOM dentro da mesma execução síncrona, sem estado intermediário observável em que os dois valores divirjam
4. WHEN a preferência do sistema operacional muda e não existe preferência salva no localStorage, THE Composable_useTheme SHALL atualizar o estado reativo e o atributo `data-theme` no DOM para refletir a nova preferência do sistema, mantendo ambos os valores idênticos

### Requisito 8: Tratamento de Erros e Valores Inválidos

**User Story:** Como usuário, quero que a aplicação funcione corretamente mesmo quando o localStorage está indisponível ou contém dados corrompidos, para que eu sempre tenha uma experiência funcional.

#### Critérios de Aceitação

1. IF o localStorage não está disponível (modo privado ou desabilitado), THEN o Composable_useTheme SHALL usar a Preferência_do_Sistema como fallback e SHALL não lançar exceções nem exibir mensagens de erro na interface do usuário
2. IF o valor armazenado no localStorage não é `'light'` nem `'dark'`, THEN o Composable_useTheme SHALL ignorar o valor inválido e usar a Preferência_do_Sistema como fallback
3. IF a API `matchMedia` não está disponível, THEN o Composable_useTheme SHALL usar `'light'` como tema padrão
4. THE Composable_useTheme SHALL sempre retornar exatamente `'light'` ou `'dark'` como valor de tema, independentemente do estado do localStorage ou da API matchMedia
5. IF o localStorage não está disponível e o usuário invoca toggleTheme(), THEN o Composable_useTheme SHALL alternar o tema em memória e aplicar no DOM sem persistência, e SHALL não lançar exceções
6. IF o localStorage não está disponível e a API matchMedia não está disponível, THEN o Composable_useTheme SHALL usar `'light'` como tema padrão e SHALL manter a funcionalidade de alternância em memória sem lançar exceções

### Requisito 9: Limpeza de Recursos

**User Story:** Como desenvolvedor, quero que os event listeners sejam removidos quando o componente é desmontado, para evitar vazamentos de memória.

#### Critérios de Aceitação

1. WHEN o escopo reativo do Composable_useTheme é destruído, THEN o Composable_useTheme SHALL remover o listener de evento 'change' registrado no MediaQueryList retornado por `window.matchMedia('(prefers-color-scheme: dark)')`
2. THE Composable_useTheme SHALL registrar a limpeza do listener via `onScopeDispose` do Vue 3
3. WHEN o listener é removido, THEN mudanças subsequentes na Preferência_do_Sistema SHALL não causar atualizações no estado reativo `theme` nem no atributo `data-theme` do DOM
