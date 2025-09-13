# ⚙️ VS Code Settings Guide (settings.json)

Este guia explica, **linha a linha**, as configurações do seu `settings.json` (VS Code), no formato **JSON with Comments (JSONC)**.

---

## ✅ Arquivo base (comentado)

```jsonc
{
  "files.eol": "\n", // Use LF for all files
  "files.insertFinalNewline": false, // Do not insert a final newline
  "files.trimTrailingWhitespace": true, // Trim trailing whitespace

  "editor.tabSize": 2, // Set tab size to 2 spaces
  "editor.defaultFormatter": "esbenp.prettier-vscode", // Use Prettier as the default formatter
  "editor.formatOnSave": true, // Format files on save
  "editor.rulers": [150], // Add a ruler at 150 characters

  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit", // Fix all ESLint issues on save
    "source.organizeImports": true // Enable organize imports on save
  },

  "explorer.compactFolders": false, // Do not compact folders in the explorer
  "workbench.editor.labelFormat": "short", // Use short labels for open editors
  "workbench.editor.enablePreview": false, // Disable preview mode for editors
  "editor.stickyScroll.enabled": true, // Enable sticky scroll for better code navigation

  "eslint.useFlatConfig": true, // Enable ESLint Flat Config support
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

## 🔍 Explicação linha a linha

- **`files.eol: "\n"`** → Força LF como final de linha.
- **`files.insertFinalNewline: false`** → Não adiciona linha vazia no final dos arquivos.
- **`files.trimTrailingWhitespace: true`** → Remove espaços no final das linhas.
- **`editor.tabSize: 2`** → Indentação de 2 espaços.
- **`editor.defaultFormatter: "esbenp.prettier-vscode"`** → Usa Prettier como formatador padrão.
- **`editor.formatOnSave: true`** → Formata automaticamente ao salvar.
- **`editor.rulers: [150]`** → Linha guia na coluna 150.
- **`editor.codeActionsOnSave.source.fixAll.eslint: "explicit"`** → Corrige problemas de ESLint ao salvar.
- **`editor.codeActionsOnSave.source.organizeImports: true`** → Reorganiza imports ao salvar.
- **`explorer.compactFolders: false`** → Exibe pastas expandidas no Explorer.
- **`workbench.editor.labelFormat: "short"`** → Abas de arquivos exibem apenas o nome curto.
- **`workbench.editor.enablePreview: false`** → Cada arquivo abre em uma aba fixa.
- **`editor.stickyScroll.enabled: true`** → Cabeçalhos permanecem visíveis ao rolar.
- **`eslint.useFlatConfig: true`** → Usa o novo formato Flat Config (ESLint 9+).
- **`eslint.validate`** → Linguagens verificadas pelo ESLint.
- **`search.exclude` / `files.watcherExclude`** → Ignora pastas pesadas (node_modules, build, out).
- **`typescript.tsdk`** → Força o VS Code a usar a versão local do TypeScript.
- **Blocos `[javascript]`, `[typescript]`, `[xml]`, `[svg]`, `[html]`** → Garante que Prettier seja o formatador para cada linguagem.

---
