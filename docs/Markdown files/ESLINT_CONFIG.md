
# 🧹 ESLint Flat Config Guide

Este guia explica cada parte do `eslint.config.mjs`, mostra **opções comuns**, exemplos práticos e extensões úteis.

---

## ⚙️ Estrutura do Arquivo

### 1. Importações necessárias
```js
import { fileURLToPath } from 'url';
import path from 'path';
import { FlatCompat } from '@eslint/eslintrc';
```
📌 Usadas para resolver caminhos (`__dirname`) e permitir compatibilidade com configs legadas.

---

### 2. Definição de `__dirname`
```js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```
📌 Transforma `import.meta.url` em caminho absoluto.  
Necessário porque no ESM (`type: module`) não existe `__dirname` por padrão.

---

### 3. Compatibilidade com configs antigas
```js
const compat = new FlatCompat({
  baseDirectory: __dirname,
});
```
📌 Permite usar `extends` tradicionais (ex: `"next/core-web-vitals"`) no formato **Flat Config** (ESLint 9+).

---

### 4. Exportação principal
```js
export default [ ... ];
```
📌 Exporta a configuração como **array de objetos**.  
Cada item do array é um bloco de configuração.

---

## 🔍 Blocos de Configuração

### 🔹 Ignora arquivos/pastas
```js
{
  ignores: [
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ],
}
```
✔️ Evita que o ESLint analise arquivos de build, dependências ou arquivos gerados automaticamente.

---

### 🔹 Configurações base
```js
...compat.config({
  extends: ['next/core-web-vitals', 'next/typescript', 'prettier'],
})
```
- **`next/core-web-vitals`** → boas práticas de performance/acessibilidade.  
- **`next/typescript`** → integração com TS.  
- **`prettier`** → desativa regras que conflitam com o Prettier.

---

### 🔹 Regras do projeto
```js
{
  rules: {
    semi: ['error', 'always'],
    quotes: ['error', 'double', { avoidEscape: true }],
    'prefer-arrow-callback': ['error'],
    'prefer-template': ['error'],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
}
```
- **`semi`** → sempre usar `;` no final.  
- **`quotes`** → usar aspas duplas por padrão.  
- **`prefer-arrow-callback`** → usar arrow functions como callbacks.  
- **`prefer-template`** → usar template strings em vez de concatenação.  
- **`no-unused-vars`** → alerta de variáveis não usadas (ignora as que começam com `_`).  

---

### 🔹 Opções do linter
```js
{
  linterOptions: {
    reportUnusedDisableDirectives: true,
  },
}
```
✔️ Se houver `// eslint-disable` sem efeito, o ESLint avisa.

---

## 📋 Extensões úteis

- **`eslint-plugin-simple-import-sort`** → organiza imports.  
- **`eslint-plugin-unused-imports`** → remove imports não usados.  
- **`eslint-plugin-jsx-a11y`** → acessibilidade em JSX.  
- **`eslint-plugin-import`** → valida paths de imports.  

---

## 🧪 Exemplo

Antes:
```ts
function greet(name) {
  return 'Olá, ' + name
}
```

Depois (ESLint + Prettier):
```ts
const greet = (name) => {
  return `Olá, ${name}`;
};
```

---

## ✅ Checklist de instalação

```bash
# ESLint 9+ e compat
pnpm add -D eslint @eslint/js @eslint/eslintrc

# Prettier
pnpm add -D prettier

# (Opcional) Plugins extras
pnpm add -D eslint-plugin-simple-import-sort eslint-plugin-unused-imports eslint-plugin-jsx-a11y eslint-plugin-import
```
