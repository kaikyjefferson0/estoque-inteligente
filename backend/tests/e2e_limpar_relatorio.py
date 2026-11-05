"""Troca as senhas por *** dentro do relatório HTML do Playwright, gerado só no CI.

O index.html guarda os passos num zip embutido em base64 (ex.: Fill "<senha>"), que uma troca de
texto no arquivo não alcança. O relatório vira artifact, e as senhas não podem ir para arquivo.

Uso (o npm run test:e2e chama sozinho, dentro de backend):
    py -m tests.e2e_limpar_relatorio <pasta do relatório>

As senhas chegam pelas variáveis E2E_SENHA_*. Sai com erro se não encontrar o zip: o rodar.mjs
então apaga o relatório, em vez de publicar algo que não foi limpo.
"""

import base64
import io
import os
import re
import sys
import zipfile
from pathlib import Path

ZIP_EMBUTIDO = re.compile(r"(data:application/zip;base64,)([A-Za-z0-9+/=]+)")


def _limpar_zip(conteudo: bytes, senhas: list[str]) -> bytes:
    saida = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(conteudo)) as origem, zipfile.ZipFile(saida, "w", zipfile.ZIP_DEFLATED) as destino:
        for nome in origem.namelist():
            texto = origem.read(nome).decode("utf-8")
            for senha in senhas:
                texto = texto.replace(senha, "***")
            destino.writestr(nome, texto)
    return saida.getvalue()


def limpar_html(arquivo: Path, senhas: list[str]) -> None:
    html = arquivo.read_text(encoding="utf-8")

    def trocar(achado: re.Match[str]) -> str:
        limpo = _limpar_zip(base64.b64decode(achado.group(2)), senhas)
        return achado.group(1) + base64.b64encode(limpo).decode("ascii")

    novo, quantos = ZIP_EMBUTIDO.subn(trocar, html)
    if quantos == 0:
        raise RuntimeError(f"Zip embutido não encontrado em {arquivo}.")
    arquivo.write_text(novo, encoding="utf-8")


def main() -> int:
    senhas = [valor for nome, valor in os.environ.items() if nome.startswith("E2E_SENHA_") and valor]
    if not senhas:
        print("[e2e] Nenhuma senha E2E_SENHA_* recebida para limpar o relatório.", file=sys.stderr)
        return 1
    try:
        for arquivo in Path(sys.argv[1]).rglob("index.html"):
            limpar_html(arquivo, senhas)
    except (RuntimeError, OSError, ValueError, zipfile.BadZipFile) as erro:
        print(f"[e2e] Não foi possível limpar o relatório: {erro}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
