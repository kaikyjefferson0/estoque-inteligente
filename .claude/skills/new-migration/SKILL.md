---
name: new-migration
description: Use quando o usuário pedir para criar ou alterar uma tabela, coluna, índice ou constraint do banco (qualquer mudança de schema).
---

Toda mudança de tabela passa por migration do Alembic. Siga este padrão:

1. **Model** em `backend\app\models\<recurso>.py`, herdando de `Base` (`app.core.database`).
2. **Registro**: importe o model em `backend\app\models\__init__.py`, senão o autogenerate não enxerga a tabela.
3. **Gerar** (dentro de `backend`, com o venv ativo):
   `alembic revision --autogenerate -m "descricao curta"`
4. **Revisar** o arquivo gerado em `backend\alembic\versions\` antes de aplicar: conferir `upgrade()` e `downgrade()`, nomes de constraints, `nullable`, defaults e índices. O autogenerate não detecta tudo (ex.: renomear coluna vira drop + add; mudança de tipo pode faltar).
5. **Aplicar**: `alembic upgrade head`.
6. **Conferir reversão** quando fizer sentido: `alembic downgrade -1` e `alembic upgrade head` de novo.
7. **Nunca** editar uma migration que já foi aplicada em outro ambiente (Render); crie uma nova.
8. **Nunca** colocar URL ou credencial no `alembic.ini`; a URL vem do `backend\.env` via `app.core.config.settings`.
9. Ao terminar, rode `pytest` e informe o resultado.
