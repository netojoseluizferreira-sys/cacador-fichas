Esta pasta reserva os módulos de domínio da aplicação.

O código principal ainda fica em `../app.js` para preservar o carregamento
estático sem build. Ao extrair novas partes, prefira separar por domínio:
ficha, dano, rolagens, xp, escudo do mestre e autenticação.
