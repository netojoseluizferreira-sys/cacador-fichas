# Cacador: A Revanche - Fichas Online

Aplicacao web estatica para criar, salvar e consultar fichas de **Cacador: A Revanche 5a Edicao**.

## Como rodar localmente

Use um servidor local, porque o app carrega `data/catalogo.json` via `fetch`.

```powershell
python -m http.server 8123 --bind 127.0.0.1
```

Depois abra:

```txt
http://127.0.0.1:8123/index.html
```

## Supabase

O app usa Supabase para:

- login por email e senha;
- PostgreSQL online;
- salvamento/carregamento de fichas;
- acesso admin por email.
- Escudo do Mestre com fichas da cronica, rolagens publicas/privadas, anotacoes e iniciativa.
- Escudo do Mestre tambem mostra e limpa o historico de rolagens dos jogadores da cronica.
- Jogadores veem um historico publico com rolagens publicas do mestre e rolagens dos jogadores do subgrupo.
- O botao Admin aparece direto no menu quando a conta admin entra.
- Ao editar uma ficha pelo Escudo, o admin pode alterar livremente a ficha do jogador e salvar no banco.
- Subgrupos de cronica com valores de Desespero e Perigo visiveis nas fichas dos jogadores daquele subgrupo.
- Rolagem de Impeto usa Dados de Desespero separados; se sair 1 em Desespero, pergunta se o teste passou antes de aplicar Perigo ou Aflicao.

Configure [config/supabase-config.js](./config/supabase-config.js):

```js
window.CACADOR_SUPABASE = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "SUA_ANON_PUBLIC_KEY",
  adminEmail: "netojoseluizferreira@gmail.com"
};
```

Rode o SQL de [database/supabase-schema.sql](./database/supabase-schema.sql) no SQL Editor do Supabase. Sempre que este arquivo mudar, rode novamente no Supabase para criar/atualizar as tabelas e politicas.

No Supabase, em **Authentication > Providers > Email**, deixe o provider Email ativado e desative **Confirm email** para evitar envio de email. Assim o app usa cadastro/login com senha e nao depende de magic link.

No Supabase, em **Authentication > URL Configuration**, adicione a URL local e a URL do GitHub Pages em **Site URL** e **Redirect URLs**.

Use a URL do GitHub Pages com barra final e sem `index.html`:

```txt
https://netojoseluizferreira-sys.github.io/cacador-fichas/
```

Para testes locais, use:

```txt
http://127.0.0.1:8123/
```

## GitHub Pages

Depois de publicar no GitHub, ative:

1. **Settings**
2. **Pages**
3. **Deploy from a branch**
4. Branch `main`
5. Folder `/root`

O site ficara em:

```txt
https://netojoseluizferreira-sys.github.io/cacador-fichas/
```

Adicione essa URL no Supabase para login, cadastro e redirecionamentos do Auth.

## Estrutura

- `index.html`: interface principal.
- `assets/css/style.css`: estilos.
- `config/supabase-config.js`: configuracao publica do Supabase.
- `data/catalogo.json`: vantagens, defeitos, trunfos e distincoes.
- `database/supabase-schema.sql`: tabelas e politicas RLS.
- `src/app.js`: regras da ficha, rolagens, danos, XP, Escudo e Supabase.
- `src/utils/`: utilitarios pequenos sem regra de negocio.
- `src/modulos/`: espaco reservado para extrair dominios maiores sem misturar responsabilidades.
