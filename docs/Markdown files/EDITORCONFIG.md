# ⚙️ EditorConfig Guide

Este guia explica cada opção do `.editorconfig`, mostra **todas as opções possíveis** e inclui
**exemplos práticos**.

---

## 🔝 `root = true`
📌 Diz que esse arquivo `.editorconfig` é a **raiz** da configuração.  
O editor **não vai procurar outro `.editorconfig` em pastas acima**.

---

## 📝 `[*]`
📌 Significa que as regras seguintes valem para **todos os arquivos** (`*`).  
Se quiser regras específicas:

```ini
[*.js]       ; apenas arquivos .js
[*.{ts,tsx}] ; apenas .ts e .tsx
[*.md]       ; apenas markdown
```

---

## 1. `indent_style = space`
📌 Define se a indentação é feita com **espaços** ou **tabs**.

- `space` → usa espaços  
- `tab` → usa tabulação  

```js
// space (2 espaços)
function hello() {
··console.log('Hi');
}

// tab
function hello() {
→console.log('Hi');
}
```

> (`·` = espaço, `→` = tab)

---

## 2. `indent_size = 2`
📌 Número de espaços usados para cada nível de indentação.

```js
// indent_size = 2
if (ok) {
··console.log('Yes');
}

// indent_size = 4
if (ok) {
····console.log('Yes');
}
```

---

## 3. `end_of_line = lf`
📌 Define o tipo de **quebra de linha** usada:

- `lf` → usado em Linux/Mac (`\n`)  
- `crlf` → usado em Windows (`\r\n`)  
- `cr` → antigo do Mac OS clássico  

```txt
// Arquivo com lf (Linux/Mac)
Line1\nLine2

// Arquivo com crlf (Windows)
Line1\r\nLine2
```

---

## 4. `charset = utf-8`
📌 Define a **codificação do arquivo**.

- `utf-8` → padrão moderno, suporta emojis e caracteres especiais.  
- `latin1` → usado em arquivos antigos.  

```txt
// utf-8
Olá, Lucas 😃

// latin1 (erro)
OlÃ¡, Lucas ??
```

---

## 5. `trim_trailing_whitespace = true`
📌 Remove automaticamente **espaços em branco no fim das linhas**.

Antes (ruim):  
```js
const name = 'Lucas';····
```

Depois (bom):  
```js
const name = 'Lucas';
```

---

## 6. `insert_final_newline = false`
📌 Controla se deve haver **uma quebra de linha no final do arquivo**.

- `true` → sempre adiciona uma linha vazia no fim.  
- `false` → não adiciona.  

```txt
// true
line1
line2
⏎   ← (linha vazia no final)

// false
line1
line2␃ ← (termina sem newline)
```

---

## 📋 Tabela Resumida

| Configuração               | O que faz                                   | Exemplo                                |
|-----------------------------|---------------------------------------------|----------------------------------------|
| `root = true`              | Define como config raiz                     | Não busca outros `.editorconfig` acima |
| `[*]`                      | Aplica regras a todos os arquivos           | `[*.js]` só aplicaria a `.js`          |
| `indent_style = space`     | Indenta com espaços                         | `··console.log()`                      |
| `indent_size = 2`          | Usa 2 espaços na indentação                 | `··code`                               |
| `end_of_line = lf`         | Quebra de linha no estilo Linux/Mac         | `Line1\nLine2`                        |
| `charset = utf-8`          | Codificação do arquivo                      | `Olá 😃` funciona                      |
| `trim_trailing_whitespace` | Remove espaços no fim das linhas            | `"Lucas";····` → `"Lucas";`            |
| `insert_final_newline`     | Garante linha em branco no fim do arquivo   | `line2⏎`                               |
