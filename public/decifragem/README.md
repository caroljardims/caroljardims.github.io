# Decifragem

Party game de mímica/desenho em grupos com Firebase **Realtime Database** (tempo real, sem backend próprio). Interface em HTML, CSS e JavaScript puro — adequado para **GitHub Pages**.

## Configuração do Firebase

1. Crie um projeto no [Console do Firebase](https://console.firebase.google.com/).
2. Adicione um app **Web** e copie o objeto de configuração.
3. Em **Build → Realtime Database**, crie o banco (comece em modo de teste só para desenvolvimento local).
4. Copie a **URL** do Realtime Database (algo como `https://SEU_ID-default-rtdb.firebaseio.com`) para o campo `databaseURL`.
5. Copie `firebase-config.example.js` para **`firebase-config.js`** na mesma pasta e preencha todos os campos (incluindo `databaseURL` e, se usar Analytics, `measurementId`).

O ficheiro **`firebase-config.js` está no `.gitignore`** para não ir para o GitHub com chaves. No deploy (GitHub Actions ou máquina local antes do build), gere ou copie esse ficheiro com os valores reais.

> **Segurança:** se já commitaste um `firebase-config.js` com dados reais num repo público, considera **restringir a API key** no Google Cloud (credenciais do Firebase) e rever o histórico do Git. A `apiKey` de apps web é exposta no cliente por natureza, mas ainda assim evita-se versioná-la em texto claro.

## Rodando localmente

Como os arquivos usam módulos ES e `import` do Firebase via CDN, sirva a pasta com um servidor HTTP (abrir o arquivo direto no navegador pode bloquear módulos):

```bash
cd public/decifragem
npx --yes serve -p 8080
```

Abra `http://localhost:8080`.

## Deploy no GitHub Pages

1. Coloque a pasta `decifragem` (ou o conteúdo dela) em **`public/`** no repositório do site estático, para que fique disponível em `https://SEU_USUARIO.github.io/SEU_REPO/decifragem/`.
2. No repositório: **Settings → Pages**, escolha a branch e pasta (`/ (root)` ou `/docs`, conforme seu build).
3. Se o site for gerado por um framework (por exemplo Astro), garanta que `public/decifragem/*` seja copiado intacto para a raiz do artefato publicado.
4. Atualize `firebase-config.js` no deploy (ou use variáveis de ambiente no pipeline que gerem esse arquivo).

### Checklist após o deploy

- A URL do jogo usa **HTTPS** (exigido por muitos recursos e boa prática com Firebase).
- O `databaseURL` e as regras do Realtime Database correspondem ao mesmo projeto Firebase.

## Regras de segurança recomendadas (produção)

O modo de teste do Realtime Database permite leitura/escrita abertas por tempo limitado — **não use isso em produção**.

Para um jogo público sem login, o modelo mais seguro é **Firebase Authentication** (por exemplo, anônima ou com provedor social) e regras que exijam `auth != null` e validem caminhos.

Exemplo de **direção** para regras (ajuste nomes de nós e validações ao seu schema; teste no Simulador do Console):

```json
{
  "rules": {
    "salas": {
      "$codigo": {
        ".read": true,
        ".write": "auth != null"
      }
    }
  }
}
```

Para um protótipo fechado entre amigos, algumas equipes usam regras permissivas e **rotacionam o projeto** ou aceitam o risco de vandalismo — documente isso para o seu grupo.

Boas práticas adicionais:

- Limite tamanho de strings (nome, prompts) nas regras com `newData.hasChildren()` e `.validate`.
- Monitore uso e habilite **App Check** se o tráfego crescer.
- Evite expor chaves em repositório: use variáveis de ambiente no build quando possível (a `apiKey` do Firebase é considerada “pública”, mas ainda assim trate o projeto com cuidado).

## Estrutura de arquivos

| Arquivo             | Função                                      |
|---------------------|---------------------------------------------|
| `jogo.html`         | Entrada: criar sala ou entrar com código (`/decifragem` no site redireciona aqui) |
| `host.html`         | Painel do host                              |
| `player.html`       | Tela do jogador                             |
| `style.css`         | Visual (tema escuro + acento)               |
| `game.js`           | Lógica e Firebase Realtime Database         |
| `prompts.js`        | Categorias e prompts em português brasileiro |
| `firebase-config.example.js` | Modelo — copiar para `firebase-config.js` (ignorado pelo Git) |

## Licença e créditos

Projeto da autora do repositório; ajuste a licença conforme o `LICENSE` do site principal.
