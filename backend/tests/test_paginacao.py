import pytest

from app.services.products import criar_produto
from app.services.suppliers import criar_fornecedor
from app.services.users import criar_usuario


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def criar_produtos(db, quantidade: int, prefixo: str = "Produto", estoque_minimo: int = 0) -> list[int]:
    # Mínimo 0 e saldo 0: cada produto nasce com um alerta de estoque baixo (RN-13)
    return [
        criar_produto(db, nome=f"{prefixo} {i:03d}", codigo_barras=f"{prefixo[:3]}{i:05d}", estoque_minimo=estoque_minimo).id
        for i in range(quantidade)
    ]


def pagina(client, token, caminho, **params) -> dict:
    resposta = client.get(caminho, headers=auth(token), params=params)
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def test_ct65_lista_com_mais_itens_que_o_limite_devolve_so_o_limite_e_o_total(client, db, token_operador):
    ids = criar_produtos(db, 60)

    primeira = pagina(client, token_operador, "/products")
    assert (primeira["total"], primeira["limite"], primeira["deslocamento"]) == (60, 50, 0)
    assert len(primeira["itens"]) == 50

    segunda = pagina(client, token_operador, "/products", deslocamento=50)
    assert (segunda["total"], segunda["deslocamento"]) == (60, 50)
    assert len(segunda["itens"]) == 10

    # As duas páginas juntas têm cada produto uma vez só, na ordem da lista
    assert [p["id"] for p in primeira["itens"] + segunda["itens"]] == ids


@pytest.mark.parametrize(
    "caminho",
    ["/products", "/suppliers", "/stock", "/alerts", "/users", "/products/{produto_id}/movements"],
)
def test_ct66_limite_acima_de_200_e_recusado(client, token_admin, detergente, caminho):
    caminho = caminho.format(produto_id=detergente.id)
    assert client.get(caminho, headers=auth(token_admin), params={"limite": 201}).status_code == 422
    assert client.get(caminho, headers=auth(token_admin), params={"limite": 200}).status_code == 200


@pytest.mark.parametrize("params", [{"limite": 0}, {"limite": -1}, {"deslocamento": -1}, {"limite": "dez"}])
def test_limite_e_deslocamento_invalidos_sao_recusados(client, token_admin, params):
    assert client.get("/products", headers=auth(token_admin), params=params).status_code == 422


def test_deslocamento_alem_do_total_devolve_pagina_vazia_com_o_total(client, db, token_operador):
    criar_produtos(db, 3)
    resposta = pagina(client, token_operador, "/products", deslocamento=10)
    assert resposta["itens"] == []
    assert resposta["total"] == 3


def test_total_dos_produtos_respeita_a_busca(client, db, token_operador):
    criar_produtos(db, 7, prefixo="Arroz")
    criar_produtos(db, 4, prefixo="Feijao")

    resposta = pagina(client, token_operador, "/products", busca="arroz", limite=5)
    assert resposta["total"] == 7
    assert len(resposta["itens"]) == 5
    assert all("Arroz" in p["nome"] for p in resposta["itens"])


def test_produto_traz_o_nome_do_fornecedor(client, token_operador, refrigerante, detergente):
    itens = {p["id"]: p for p in pagina(client, token_operador, "/products")["itens"]}
    assert itens[refrigerante.id]["fornecedor_nome"] == "Distribuidora Central"
    assert itens[detergente.id]["fornecedor_nome"] is None


def test_fornecedores_paginados_com_busca_por_nome_ou_cnpj(client, db, token_operador):
    for i in range(5):
        criar_fornecedor(db, nome=f"Atacado {i}")
    criar_fornecedor(db, nome="Distribuidora Norte", cnpj="11222333000181")

    resposta = pagina(client, token_operador, "/suppliers", limite=2)
    assert (resposta["total"], len(resposta["itens"])) == (6, 2)

    assert pagina(client, token_operador, "/suppliers", busca="atacado")["total"] == 5
    # CNPJ com ou sem pontuação, inteiro ou só uma parte
    for busca in ("11.222.333/0001-81", "11222333", "0001-81"):
        resposta = pagina(client, token_operador, "/suppliers", busca=busca)
        assert [f["nome"] for f in resposta["itens"]] == ["Distribuidora Norte"], busca
    # Curinga do LIKE vale como texto
    assert pagina(client, token_operador, "/suppliers", busca="%")["total"] == 0


def test_estoque_paginado_com_filtro_e_busca_no_total(client, db, token_operador):
    criar_produtos(db, 6, prefixo="Baixo", estoque_minimo=5)
    criar_produtos(db, 3, prefixo="Zerado", estoque_minimo=0)

    assert pagina(client, token_operador, "/stock")["total"] == 9
    # CT-50: "baixo" inclui os sem estoque (todos aqui têm saldo 0)
    resposta = pagina(client, token_operador, "/stock", situacao="baixo", limite=4)
    assert (resposta["total"], len(resposta["itens"])) == (9, 4)
    resposta = pagina(client, token_operador, "/stock", situacao="sem_estoque", busca="zerado")
    assert resposta["total"] == 3
    assert {i["nome"] for i in resposta["itens"]} == {"Zerado 000", "Zerado 001", "Zerado 002"}
    assert pagina(client, token_operador, "/stock", busca="nada-parecido")["total"] == 0


def test_alertas_paginados_com_filtro_no_total(client, db, token_operador):
    criar_produtos(db, 8)
    resposta = pagina(client, token_operador, "/alerts", limite=3)
    assert (resposta["total"], len(resposta["itens"])) == (8, 3)
    assert pagina(client, token_operador, "/alerts", tipo="vencido")["total"] == 0
    assert len(pagina(client, token_operador, "/alerts", tipo="estoque_baixo", deslocamento=6)["itens"]) == 2


def test_usuarios_paginados_e_so_para_admin(client, db, admin, token_admin, token_operador):
    for i in range(4):
        criar_usuario(db, nome=f"Pessoa {i}", email=f"pessoa{i}@teste.com", senha="senha-segura-1", perfil="operador")
    resposta = pagina(client, token_admin, "/users", limite=2, deslocamento=4)
    # admin + operador (do token_operador) + 4 pessoas
    assert resposta["total"] == 6
    assert len(resposta["itens"]) == 2
    assert client.get("/users", headers=auth(token_operador), params={"limite": 1}).status_code == 403


def test_historico_paginado_do_mais_recente_para_o_mais_antigo(client, token_admin, detergente):
    for quantidade in range(1, 6):
        resposta = client.post(
            "/stock/entries",
            headers=auth(token_admin),
            json={"codigo_barras": detergente.codigo_barras, "quantidade": quantidade},
        )
        assert resposta.status_code == 201, resposta.text

    caminho = f"/products/{detergente.id}/movements"
    primeira = pagina(client, token_admin, caminho, limite=2)
    resto = pagina(client, token_admin, caminho, limite=2, deslocamento=2)
    assert primeira["total"] == resto["total"] == 5
    assert [m["quantidade"] for m in primeira["itens"] + resto["itens"]] == [5, 4, 3, 2]


def test_alertas_com_resolvidos_trazem_os_ativos_primeiro(client, db, token_operador):
    # O segundo produto (alerta mais novo) ganha saldo e tem o estoque baixo resolvido (RN-39);
    # o primeiro continua ativo. Só pela data, o resolvido viria antes.
    ativo, resolvido = criar_produtos(db, 2)
    resposta = client.post(
        "/stock/entries", headers=auth(token_operador), json={"codigo_barras": "Pro00001", "quantidade": 5}
    )
    assert resposta.status_code == 201, resposta.text

    itens = pagina(client, token_operador, "/alerts", incluir_resolvidos="true")["itens"]
    assert [(a["produto_id"], a["resolvido_em"] is None) for a in itens] == [(ativo, True), (resolvido, False)]


def test_nome_do_fornecedor_acompanha_a_edicao_do_produto(client, db, token_operador, refrigerante):
    outro = criar_fornecedor(db, nome="Atacado Sul")
    caminho = f"/products/{refrigerante.id}"

    # Trocar o fornecedor: a resposta e a leitura seguinte trazem o nome novo
    resposta = client.patch(caminho, headers=auth(token_operador), json={"fornecedor_id": outro.id})
    assert resposta.status_code == 200, resposta.text
    assert resposta.json()["fornecedor_nome"] == "Atacado Sul"
    assert pagina(client, token_operador, caminho)["fornecedor_nome"] == "Atacado Sul"

    # Renomear o fornecedor aparece no produto
    resposta = client.patch(f"/suppliers/{outro.id}", headers=auth(token_operador), json={"nome": "Atacado Sul Ltda"})
    assert resposta.status_code == 200, resposta.text
    # Nos testes, as requisições dividem a mesma sessão (fixture db); na API cada uma abre a sua e lê do banco
    db.expire_all()
    assert pagina(client, token_operador, caminho)["fornecedor_nome"] == "Atacado Sul Ltda"

    # Tirar o fornecedor deixa o nome vazio
    resposta = client.patch(caminho, headers=auth(token_operador), json={"fornecedor_id": None})
    assert resposta.status_code == 200, resposta.text
    assert resposta.json()["fornecedor_nome"] is None
