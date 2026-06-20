# Cacador: A Revanche - Fichas Online

Aplicacao web estatica para criar, salvar e consultar fichas de **Cacador: A Revanche 5a Edicao**.

## Como rodar localmente

Use um servidor local, porque o app carrega `catalogo.json` via `fetch`.

```powershell
python -m http.server 8123 --bind 127.0.0.1
```

Depois abra:

```txt
http://127.0.0.1:8123/index.html
```

## Supabase

O app usa Supabase para:

- login por email com magic link;
- PostgreSQL online;
- salvamento/carregamento de fichas;
- acesso admin por email.

Configure [supabase-config.js](./supabase-config.js):

```js
window.CACADOR_SUPABASE = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "SUA_ANON_PUBLIC_KEY",
  adminEmail: "netojoseluizferreira@gmail.com"
};
```

Rode o SQL de [supabase-schema.sql](./supabase-schema.sql) no SQL Editor do Supabase.

No Supabase, em **Authentication > URL Configuration**, adicione a URL local e a URL do GitHub Pages em **Site URL** e **Redirect URLs**.

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

Adicione essa URL no Supabase para o magic link funcionar.

## Arquivos principais

- `index.html`: interface.
- `style.css`: estilos.
- `app.js`: regras da ficha, rolagens, danos e Supabase.
- `catalogo.json`: vantagens, defeitos, trunfos e distincoes.
- `supabase-config.js`: configuracao publica do Supabase.
- `supabase-schema.sql`: tabela e politicas RLS.
