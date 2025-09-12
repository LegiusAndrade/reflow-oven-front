# 🎨 Prettier Config Guide

Este guia explica cada opção do `prettierrc.json`, mostra **todas as opções possíveis** e inclui
**exemplos práticos**.

---

## ⚙️ Opções Detalhadas

### 1. **arrowParens**

📌 Controla se funções arrow com **um único parâmetro** devem usar parênteses.

- **Opções:**
  - `'always'` → Sempre usa parênteses.
  - `'avoid'` → Evita quando possível.

```js
// always
const sum = x => x + 1;

// avoid
const sum = x => x + 1;
```

---

### 2. **bracketSpacing**

📌 Espaçamento entre chaves em objetos.

- **true** → Adiciona espaços
- **false** → Remove espaços

```js
// true
const obj = { name: 'Lucas' };

// false
const obj = { name: 'Lucas' };
```

---

### 3. **htmlWhitespaceSensitivity**

📌 Como lidar com espaços em HTML.

- `'css'` → Segue regras do CSS
- `'strict'` → Mantém espaços
- `'ignore'` → Ignora espaços extras

```html
<!-- ignore -->
<div>Lucas</div>
<!-- Pode reduzir espaços -->
```

---

### 4. **insertPragma**

📌 Adiciona `/** @format */` no topo de arquivos formatados.

- **true** → Adiciona
- **false** → Não adiciona

```js
/** @format */
const x = 1;
```

---

### 5. **jsxBracketSameLine**

📌 Posição do `>` em JSX.

- **true** → Mesma linha
- **false** → Nova linha

```jsx
// true
<MyComponent
  prop1='a'
  prop2='b' />

// false
<MyComponent
  prop1='a'
  prop2='b'
/>
```

---

### 6. **jsxSingleQuote**

📌 Usa aspas simples no JSX.

```jsx
// true
<MyComponent title='Hello' />

// false
<MyComponent title="Hello" />
```

---

### 7. **printWidth**

📌 Número máximo de caracteres por linha.

```js
// printWidth: 20
const name = 'Lucas de Andrade da Silva'; // Vai quebrar antes dos 20 caracteres
```

---

### 8. **quoteProps**

📌 Quando usar aspas em chaves de objetos.

- `'as-needed'` → Só quando necessário
- `'consistent'` → Ou todas ou nenhuma
- `'preserve'` → Mantém como está

```js
// as-needed
const obj = { name: 'Lucas', 'user-id': 1 };

// consistent
const obj = { name: 'Lucas', 'user-id': 1 };
```

---

### 9. **semi**

📌 Adiciona `;` no final das linhas.

- **true** → Com ponto e vírgula
- **false** → Sem ponto e vírgula

```js
const x = 1;
```

---

### 10. **requirePragma**

📌 Só formata arquivos com `/** @format */`?

- **true** → Sim
- **false** → Não

---

### 11. **singleQuote**

📌 Usa aspas simples em JavaScript.

```js
const name = 'Lucas';
```

---

### 12. **tabWidth**

📌 Quantidade de espaços por indentação.

```js
// tabWidth: 2
function test() {
  console.log('Lucas');
}
```

---

### 13. **trailingComma**

📌 Vírgula no final de arrays e objetos.

- `'none'` → Nunca
- `'es5'` → Onde o ES5 permite
- `'all'` → Sempre

```
// all
const arr = [1, 2, 3,];
```

```js
// es5
const arr = [1, 2, 3];
```

---

### 14. **useTabs**

📌 Usa tabs em vez de espaços.

- **true** → Tabs
- **false** → Espaços

---

## 📋 Tabela Resumida

| Opção                         | Valores possíveis                     | Exemplo escolhido | Exemplo de saída                  |
| ----------------------------- | ------------------------------------- | ----------------- | --------------------------------- |
| **arrowParens**               | `always`, `avoid`                     | `avoid`           | `x => x + 1`                      |
| **bracketSpacing**            | `true`, `false`                       | `true`            | `{ name: 'Lucas' }`               |
| **htmlWhitespaceSensitivity** | `css`, `strict`, `ignore`             | `ignore`          | Ignora espaços extras             |
| **insertPragma**              | `true`, `false`                       | `false`           | Sem `/** @format */`              |
| **jsxBracketSameLine**        | `true`, `false`                       | `false`           | Fecha `>` em nova linha           |
| **jsxSingleQuote**            | `true`, `false`                       | `true`            | Aspas simples no JSX              |
| **printWidth**                | Número                                | `100`             | Quebra linhas após 100 caracteres |
| **quoteProps**                | `as-needed`, `consistent`, `preserve` | `as-needed`       | Aspas só quando necessário        |
| **semi**                      | `true`, `false`                       | `true`            | Com ponto e vírgula               |
| **requirePragma**             | `true`, `false`                       | `false`           | Formata todos os arquivos         |
| **singleQuote**               | `true`, `false`                       | `true`            | Aspas simples                     |
| **tabWidth**                  | Número                                | `2`               | 2 espaços por tabulação           |
| **trailingComma**             | `none`, `es5`, `all`                  | `es5`             | Onde o es5 permitir               |
| **useTabs**                   | `true`, `false`                       | `false`           | Usa espaços                       |
