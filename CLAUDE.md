# CLAUDE.md — caroljardims.github.io

Portfolio pessoal e hub de projetos/brincadeiras de Carol.

## Stack

- **Astro 4** — framework SSG principal
- **React 18** — componentes interativos (`client:load`)
- **Tailwind CSS 3** — estilização
- **TypeScript**

## Estrutura

```
src/
  pages/        # Rotas (.astro)
  components/   # Componentes React (.tsx) e Astro (.astro)
  layouts/      # Layout base (Layout.astro)
  data/         # Dados estáticos (ex: projects.ts)
  styles/       # global.css
public/         # Assets estáticos
```

## Design System — Peachy (padrão)

**Sempre use o tema Peachy**, a não ser que outro design seja explicitamente solicitado.

Paleta definida em `tailwind.config.mjs`:
- `peachy-50` a `peachy-700` — tons pastéis quentes (base da UI)
- `peachy-600` (#FEC89A) — cor primária / destaque
- Fonte: Inter (Google Fonts)
- Suporte a dark mode via classe (`class` strategy do Tailwind)

Se um projeto tiver tema próprio (ex: chaveio usa paleta `chaveio-*` em verde escuro), ainda assim respeite os fundamentos visuais Peachy (arredondamentos, tipografia, espaçamentos) salvo instrução contrária.

## Regra obrigatória — CTA de apoio em novos projetos

**Todo novo projeto/brincadeira DEVE incluir um rodapé ou seção de apoio** com os dois links:

1. **Pix** → link interno `/pix`
2. **Buy Me a Coffee** → `https://buymeacoffee.com/caroljardims`

Isso já existe em `/chaveio` e `/sips`. Mantenha o padrão em qualquer página nova.

Exemplo de componente de rodapé:

```tsx
<footer className="text-center py-6 text-sm text-peachy-500">
  Gostou?{" "}
  <a href="/pix" className="underline">Me pague um café via Pix</a>
  {" "}ou{" "}
  <a href="https://buymeacoffee.com/caroljardims" target="_blank" rel="noopener noreferrer" className="underline">
    Buy Me a Coffee
  </a>{" "}☕
</footer>
```

## Páginas existentes

| Rota | Descrição |
|------|-----------|
| `/` | Portfolio — grid de projetos e contato |
| `/chaveio` | App de chaveamento de torneios |
| `/sips` | Jogo Sips |
| `/pix` | Página de pagamento Pix (QR code + chave) |
| `/escritas` | Sessão de textinhos — embeds do Notion em modal |

## Escritas — como adicionar um novo texto

Quando Carol trouxer um novo embed do Notion, adicionar no **começo** do array em **dois arquivos**:

1. `public/index.html` — array `textos` no script de Escritas (seção da home)
2. `src/data/textos.ts` — array `textos` (página `/escritas`)

```ts
// src/data/textos.ts — novo texto sempre no índice 0
{ slug: "slug-do-texto", title: "Título", date: "YYYY-MM-DD", notionUrl: "https://..." }
```

```js
// public/index.html — mesmo objeto, sem slug/date
{ title: "Título", notionUrl: "https://..." }
```

A home mostra os 3 primeiros. Com 4+, aparece botão "ver mais →" apontando para `/escritas`.

## Comportamento esperado

- Não adicione comentários, docstrings ou anotações de tipo em código que não foi alterado.
- Não crie arquivos `.md` extras além do solicitado.
- Não refatore código fora do escopo da tarefa.
- Prefira editar arquivos existentes a criar novos.
- Valide mudanças de UI iniciando o dev server quando necessário.
