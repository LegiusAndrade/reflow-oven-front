
# ⚙️ VS Code Settings Guide (settings.json)

Este guia explica, **linha a linha**, as configurações do seu `settings.json` (VS Code), no formato **JSON with Comments (JSONC)**, e sugere **opções adicionais úteis** para projetos com Next.js + TypeScript + ESLint + Prettier.

---

## ✅ Arquivo base (comentado)

```jsonc
{
  "files.eol": "\n", // Use LF line endings
  "editor.tabSize": 2, // Set tab size to 2 spaces
  "explorer.compactFolders": false, // Disable compact folders in explorer
  "workbench.editor.labelFormat": "short", // Use short labels for open editors

  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,

  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[xml]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[svg]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

> 💡 O VS Code aceita **comentários** no `settings.json` (formato JSONC).

---

## 🔍 Explicação linha a linha

### `files.eol: "\n"`
- Força **LF** como fim de linha (coerente com Unix/macOS e com o seu `.editorconfig`/Prettier).
- Evita _diff noise_ entre sistemas operacionais.

### `editor.tabSize: 2`
- Define a indentação visual como **2 espaços**. Deve estar alinhado com `tabWidth` (Prettier) e `indent_size` (.editorconfig).

### `explorer.compactFolders: false`
- Mostra pastas aninhadas **sem compactação** (melhora legibilidade em projetos com muitas subpastas).

### `workbench.editor.labelFormat: "short"`
- Mostra apenas o **nome curto** das abas abertas (útil para telas menores ou muitas abas).

### `editor.defaultFormatter: "esbenp.prettier-vscode"`
- Define o Prettier como **formatador padrão**.

### `editor.formatOnSave: true`
- Aplica formatação **ao salvar**. Em conjunto com o ESLint, reduz ruído de PR.

### `editor.codeActionsOnSave.source.fixAll.eslint: "explicit"`
- Executa **correções do ESLint** ao salvar **apenas quando houver regras habilitadas** (valor `"explicit"` evita ações indesejadas).
- Alternativas: `true` (sempre) ou `staged` (com extensão específica).

### Seções por linguagem (`[javascript]`, `[typescript]`, `[xml]`, `[svg]`, `[html]`)
- Garante que o **Prettier** seja o formatador também para cada linguagem listada — útil quando múltiplas extensões registram formatters.

---

## ➕ Sugestões úteis (adicione conforme sua necessidade)

### 1) ESLint com Flat Config e validação por linguagem
```jsonc
{
  "eslint.useFlatConfig": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```
- Garante que a extensão use o **Flat Config** (ESLint 9+) e valide os arquivos TS/TSX/JS/JSX.

### 2) Consistência com EditorConfig
```jsonc
{
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true
}
```
- Alinha comportamento com o `.editorconfig` e reduz diffs por espaços/linhas finais.

### 3) Regras visuais para linha
```jsonc
{
  "editor.rulers": [100]
}
```
- Coloca uma régua na coluna **100** (coerente com `printWidth` do Prettier se você usar 100).

### 4) Import organize (opcional, sem conflitar com linters)
```jsonc
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": false // deixe o ESLint/Plugins cuidarem dos imports
  }
}
```
- Evita que o VS Code reorganize imports automaticamente de forma diferente do ESLint/Plugins.

### 5) Melhorias de UX
```jsonc
{
  "workbench.editor.enablePreview": false, // cada arquivo abre em uma aba própria
  "editor.stickyScroll.enabled": true,     // cabeçalhos "grudam" no topo ao rolar
  "editor.renderWhitespace": "selection"   // mostra espaços apenas na seleção
}
```
- Ajuda na navegação em arquivos grandes.

### 6) Git e busca (performance e limpeza)
```jsonc
{
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/build": true,
    "**/out": true
  },
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.next/**": true
  }
}
```
- Melhora performance de busca/observação (especialmente em projetos Next).

### 7) TypeScript SDK (caso necessário)
```jsonc
{
  "typescript.tsdk": "node_modules/typescript/lib"
}
```
- Faz o VS Code usar a **versão local** do TypeScript do projeto (evita descompasso com a global do editor).

---

## 📦 Exemplo consolidado (com sugestões)

```jsonc
{
  "files.eol": "\n",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true,

  "editor.tabSize": 2,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.rulers": [100],

  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": false
  },

  "explorer.compactFolders": false,
  "workbench.editor.labelFormat": "short",
  "workbench.editor.enablePreview": false,
  "editor.stickyScroll.enabled": true,
  "editor.renderWhitespace": "selection",

  "eslint.useFlatConfig": true,
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],

  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/build": true,
    "**/out": true
  },
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.next/**": true
  },

  "typescript.tsdk": "node_modules/typescript/lib",

  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[xml]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[svg]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[html]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```

---

## ✅ Dicas finais
- Mantenha **Prettier**, `.editorconfig` e **VS Code** em **sintonia** (mesmo `printWidth`, `tabSize`, `EOL`, etc.).
- Prefira que **ESLint** e seus plugins cuidem de **imports** e **regras**; o VS Code só dispara as ações ao salvar.
- Em times, **versione** a pasta `.vscode/` com um `settings.json` mínimo para padronizar o ambiente.

```bash
# Extensões recomendadas
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
```

---

Pronto! Você pode colar esse guia no seu README (`VSCODE-SETTINGS.md`) ou guardar na pasta `.vscode/` como referência.
