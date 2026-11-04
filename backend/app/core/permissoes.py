"""RN-50 e RN-58: permissões do usuário da aplicação no banco.

As permissões não dependem do histórico do Alembic: uma migration roda uma vez só, e se rodou sem
a APP_DB_ROLE nunca mais concede nada. A sincronização vale em banco novo e em banco já migrado,
pode rodar quantas vezes for preciso e corrige tanto a falta quanto o excesso de permissão.
"""

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.engine import Connection

PRIVILEGIOS_DE_ESCRITA = ("SELECT", "INSERT", "UPDATE", "DELETE")
# Os que a API nunca recebe em tabela nenhuma
PRIVILEGIOS_PROIBIDOS = ("TRUNCATE", "REFERENCES", "TRIGGER")

# RN-12: o histórico só aceita leitura e inserção
TABELAS_SO_INSERCAO = ("stock_movements",)
# A API não usa: a versão das migrations e a data da recriação são só do usuário dono
TABELAS_SEM_ACESSO = ("alembic_version", "demo_resets")
SEQUENCIAS_SEM_ACESSO = ("demo_resets_id_seq",)


class PermissoesError(RuntimeError):
    """A mensagem traz nomes de usuários e de tabelas, nunca URL nem senha."""


@dataclass(frozen=True)
class Resumo:
    banco: str
    papel: str
    dono: str
    tabelas_com_escrita: int
    sequencias: int

    def __str__(self) -> str:
        return (
            f"Permissões sincronizadas no banco {self.banco} para {self.papel}: CONNECT e USAGE no schema public; "
            f"leitura e escrita em {self.tabelas_com_escrita} tabelas; {', '.join(TABELAS_SO_INSERCAO)} só com SELECT "
            f"e INSERT; {', '.join(TABELAS_SEM_ACESSO)} sem acesso; USAGE em {self.sequencias} sequências; "
            f"default privileges para as tabelas novas de {self.dono}."
        )


def _privilegios_esperados(tabela: str) -> tuple[str, ...]:
    if tabela in TABELAS_SEM_ACESSO:
        return ()
    if tabela in TABELAS_SO_INSERCAO:
        return ("SELECT", "INSERT")
    return PRIVILEGIOS_DE_ESCRITA


def problemas_de_permissao(conexao: Connection, papel: str) -> list[str]:
    """Compara o que o papel realmente pode (herança e PUBLIC incluídos) com o esperado.
    Lista vazia = tudo certo. Só lê: funciona com o dono e com o próprio usuário da aplicação."""
    problemas: list[str] = []
    parametros = {"papel": papel}

    if not conexao.scalar(text("SELECT has_database_privilege(:papel, current_database(), 'CONNECT')"), parametros):
        problemas.append("falta CONNECT no banco")
    if not conexao.scalar(text("SELECT has_schema_privilege(:papel, 'public', 'USAGE')"), parametros):
        problemas.append("falta USAGE no schema public")
    if conexao.scalar(text("SELECT has_schema_privilege(:papel, 'public', 'CREATE')"), parametros):
        problemas.append("CREATE indevido no schema public")

    privilegios = PRIVILEGIOS_DE_ESCRITA + PRIVILEGIOS_PROIBIDOS
    colunas = ", ".join(f"has_table_privilege(:papel, c.oid, '{privilegio}')" for privilegio in privilegios)
    tabelas = conexao.execute(
        text(
            f"SELECT c.relname, {colunas} FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') ORDER BY c.relname"
        ),
        parametros,
    ).all()
    for tabela in (*TABELAS_SO_INSERCAO, *TABELAS_SEM_ACESSO):
        if tabela not in {linha[0] for linha in tabelas}:
            problemas.append(f"a tabela {tabela} não existe (as migrations rodaram?)")
    for tabela, *valores in tabelas:
        esperados = _privilegios_esperados(tabela)
        for privilegio, tem in zip(privilegios, valores):
            if tem and privilegio not in esperados:
                problemas.append(f"{tabela}: {privilegio} indevido")
            elif not tem and privilegio in esperados:
                problemas.append(f"{tabela}: falta {privilegio}")

    sequencias = conexao.execute(
        text(
            "SELECT c.relname, has_sequence_privilege(:papel, c.oid, 'USAGE'), "
            "has_sequence_privilege(:papel, c.oid, 'SELECT'), has_sequence_privilege(:papel, c.oid, 'UPDATE') "
            "FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = 'public' AND c.relkind = 'S' ORDER BY c.relname"
        ),
        parametros,
    ).all()
    for sequencia, usage, select, update in sequencias:
        if sequencia in SEQUENCIAS_SEM_ACESSO:
            if usage:
                problemas.append(f"{sequencia}: USAGE indevido")
        elif not usage:
            problemas.append(f"{sequencia}: falta USAGE")
        if select or update:
            problemas.append(f"{sequencia}: permissão além de USAGE")
    return problemas


def sincronizar(conexao: Connection, papel: str, dono: str | None) -> Resumo:
    """Deixa o papel exatamente com as permissões da RN-50. Roda na transação de quem chama (usuário
    dono): se a conferência final falhar, nada do que foi feito aqui vale."""
    papel = papel.strip()
    if not papel or not dono:
        raise PermissoesError("Sincronização recusada: informe o usuário da aplicação e o usuário dono.")
    if papel == dono:
        raise PermissoesError(f"Sincronização recusada: {papel} é o usuário dono; a API precisa de um usuário separado.")
    if conexao.scalar(text("SELECT 1 FROM pg_roles WHERE rolname = :nome"), {"nome": papel}) is None:
        raise PermissoesError(f"O usuário de banco {papel} não existe. Crie-o por SQL antes do deploy (docs\\deploy.md).")

    aspas = conexao.dialect.identifier_preparer.quote
    banco = conexao.scalar(text("SELECT current_database()"))
    r, d = aspas(papel), aspas(dono)
    escrita = ", ".join(PRIVILEGIOS_DE_ESCRITA)
    padrao = f"ALTER DEFAULT PRIVILEGES FOR ROLE {d} IN SCHEMA public"

    comandos = [
        # Concedidos sempre, e nunca revogados aqui
        f"GRANT CONNECT ON DATABASE {aspas(banco)} TO {r}",
        f"GRANT USAGE ON SCHEMA public TO {r}",
        f"REVOKE CREATE ON SCHEMA public FROM {r}",
        # Zera e concede de novo: corrige a falta e o excesso, numa transação só (quem está
        # conectado nunca vê o meio do caminho)
        f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {r}",
        f"REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM {r}",
        f"GRANT {escrita} ON ALL TABLES IN SCHEMA public TO {r}",
        # USAGE basta para o nextval dos INSERT; a API não lê nem altera as sequências
        f"GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO {r}",
        # Tabelas e sequências criadas depois pelo dono já nascem liberadas. Uma tabela nova
        # que também só aceite inserção precisa entrar em TABELAS_SO_INSERCAO
        f"{padrao} REVOKE ALL ON TABLES FROM {r}",
        f"{padrao} REVOKE ALL ON SEQUENCES FROM {r}",
        f"{padrao} GRANT {escrita} ON TABLES TO {r}",
        f"{padrao} GRANT USAGE ON SEQUENCES TO {r}",
    ]
    comandos += [f"REVOKE UPDATE, DELETE ON {aspas(tabela)} FROM {r}" for tabela in TABELAS_SO_INSERCAO]
    comandos += [f"REVOKE ALL ON {aspas(tabela)} FROM {r}" for tabela in TABELAS_SEM_ACESSO]
    comandos += [f"REVOKE ALL ON SEQUENCE {aspas(sequencia)} FROM {r}" for sequencia in SEQUENCIAS_SEM_ACESSO]

    # Sem as tabelas das regras acima, avisa com clareza em vez de um erro de SQL no meio do caminho
    ausentes = [
        tabela
        for tabela in (*TABELAS_SO_INSERCAO, *TABELAS_SEM_ACESSO)
        if conexao.scalar(text("SELECT to_regclass(:nome)"), {"nome": f"public.{tabela}"}) is None
    ]
    if ausentes:
        raise PermissoesError(f"Faltam as tabelas {', '.join(ausentes)}: rode alembic upgrade head antes.")

    for comando in comandos:
        conexao.exec_driver_sql(comando)

    # Um GRANT sem direito de concessão só gera um aviso do Postgres; aqui ele vira erro
    problemas = problemas_de_permissao(conexao, papel)
    if problemas:
        raise PermissoesError(f"Permissões de {papel} erradas depois da sincronização: {'; '.join(problemas)}.")

    tabelas = conexao.scalar(
        text(
            "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')"
        )
    )
    sequencias = conexao.scalar(
        text(
            "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = 'public' AND c.relkind = 'S'"
        )
    )
    return Resumo(
        banco=banco,
        papel=papel,
        dono=dono,
        tabelas_com_escrita=tabelas - len(TABELAS_SO_INSERCAO) - len(TABELAS_SEM_ACESSO),
        sequencias=sequencias - len(SEQUENCIAS_SEM_ACESSO),
    )


def verificar_usuario_da_aplicacao(conexao: Connection) -> None:
    """RN-58: conferência feita ao subir a API, conectada como o próprio usuário da aplicação."""
    papel = conexao.scalar(text("SELECT current_user"))
    problemas = problemas_de_permissao(conexao, papel)
    if problemas:
        raise PermissoesError(
            f"O usuário {papel} está com as permissões erradas e a API não vai subir: {'; '.join(problemas)}. "
            "Rode python -m app.scripts.sincronizar_permissoes (docs\\deploy.md)."
        )
