#!/bin/sh
# RN-50: cria o usuário da aplicação, separado do dono. O Postgres só roda este script com o volume
# vazio; as permissões nas tabelas vêm do app.scripts.sincronizar_permissoes, ao subir a API.
psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    -v papel="$APP_DB_ROLE" \
    -v senha="$APP_DB_PASSWORD" <<'SQL'
CREATE ROLE :"papel" LOGIN PASSWORD :'senha';
SQL
