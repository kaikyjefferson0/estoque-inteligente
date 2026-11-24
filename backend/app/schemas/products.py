import re
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    PlainSerializer,
    StringConstraints,
    WithJsonSchema,
    model_validator,
)
from pydantic_core import PydanticCustomError

from app.schemas.comum import MAX_INTEGER, EntradaBase

# RN-60: limite da coluna NUMERIC(10,2), 8 dígitos inteiros e 2 casas
PRECO_MAXIMO = Decimal("99999999.99")
CENTAVO = Decimal("0.01")

# RN-26: 10 anos. O banco repete o teto na CHECK ck_products_dias_alerta_validade_maximo
DIAS_ALERTA_MAXIMO = 3650
MENSAGEM_DIAS_ALERTA = f"Informe de 1 a {DIAS_ALERTA_MAXIMO} dias de alerta (no máximo 10 anos)."


def normalizar_codigo_barras(codigo: str) -> str:
    """RN-04: o código de barras não tem espaço em branco, em nenhuma posição. Tira espaço, tabulação,
    quebra de linha (copiar o código mostrado em grupos pode trazer uma) e espaço inseparável."""
    return "".join(codigo.split())


def _codigo_sem_espacos(valor: object) -> object:
    # Roda antes da validação de texto, para o tamanho (1 a 50) valer para o código já sem espaços.
    # O que não é texto segue igual e é recusado pela validação, com a mensagem de sempre.
    return normalizar_codigo_barras(valor) if isinstance(valor, str) else valor


Nome = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
# Usado também na entrada e na saída (schemas.stock) e na busca exata (GET /products/by-barcode)
CodigoBarras = Annotated[str, BeforeValidator(_codigo_sem_espacos), StringConstraints(min_length=1, max_length=50)]
EstoqueMinimo = Annotated[int, Field(ge=0, le=MAX_INTEGER)]


def _dias_de_alerta_na_faixa(valor: int) -> int:
    # Mensagem própria em vez do ge/le do Pydantic, que responderia em inglês
    if not 1 <= valor <= DIAS_ALERTA_MAXIMO:
        raise PydanticCustomError("dias_alerta_fora_da_faixa", MENSAGEM_DIAS_ALERTA)
    return valor


# RN-26: de 1 a 3650 dias. A coerência com controla_validade é checada no service, que também repete a faixa
DiasAlerta = Annotated[
    int,
    AfterValidator(_dias_de_alerta_na_faixa),
    WithJsonSchema({"type": "integer", "minimum": 1, "maximum": DIAS_ALERTA_MAXIMO}),
]
FornecedorId = Annotated[int, Field(ge=1, le=MAX_INTEGER)]


# Só dígitos ASCII, com ponto e casas opcionais; a quantidade de dígitos é conferida à parte, com a
# mensagem certa para cada caso
_PRECO_TEXTO = re.compile(r"(\d+)(?:\.(\d+))?", re.ASCII)
_PRECO_MAX_INTEIROS = 8


def _preco_so_texto(valor: object) -> object:
    """RN-60: o preço chega como texto ("79.90"). Número do JSON é recusado: o FastAPI lê o corpo com
    json.loads, que o transforma em float antes do Pydantic (12.5000000000000001 viraria 12.5). Também
    recusa o que o Decimal do Python aceitaria fora do formato ("1e2", "1_000.50", " 5 ", dígitos não
    ASCII, sinal) e "12.340", que tem 3 casas escritas. O Field do Preco repete os limites como defesa."""
    if not isinstance(valor, str):
        raise PydanticCustomError("preco_texto", 'Envie o preço como texto, com ponto e até 2 casas. Exemplo: "12.50".')
    if valor.startswith("-"):
        raise PydanticCustomError("preco_negativo", "O preço não pode ser negativo. Use 0 ou mais, ou deixe vazio.")
    partes = _PRECO_TEXTO.fullmatch(valor)
    if not partes:
        raise PydanticCustomError("preco_formato", 'Use só dígitos, com ponto e até 2 casas. Exemplo: "12.50".')
    inteiro, casas = partes.group(1), partes.group(2) or ""
    if len(casas) > 2:
        raise PydanticCustomError("preco_casas", "Use no máximo 2 casas decimais no preço.")
    if len(inteiro.lstrip("0")) > _PRECO_MAX_INTEIROS:
        raise PydanticCustomError("preco_maximo", "Use um preço de até 99999999.99.")
    return valor


def _preco_com_duas_casas(valor: Decimal) -> Decimal:
    # Exato: o valor já tem no máximo 2 casas ("12.5" vira 12.50)
    return valor.quantize(CENTAVO)


def _preco_em_texto(valor: Decimal) -> str:
    # Texto, nunca número: o JSON não guarda casas decimais exatas ("79.90", não 79.9)
    return f"{valor.quantize(CENTAVO):f}"


# RN-60: preço opcional, >= 0, até 2 casas e até 99.999.999,99, recebido só como texto
Preco = Annotated[
    Decimal,
    BeforeValidator(_preco_so_texto),
    Field(ge=0, le=PRECO_MAXIMO, max_digits=10, decimal_places=2, allow_inf_nan=False),
    AfterValidator(_preco_com_duas_casas),
]
PrecoOut = Annotated[Decimal, PlainSerializer(_preco_em_texto, return_type=str, when_used="json")]


class ProductCreate(EntradaBase):
    """RN-05: estoque mínimo, controle de validade e dias de alerta."""

    nome: Nome
    codigo_barras: CodigoBarras
    estoque_minimo: EstoqueMinimo
    controla_validade: bool = False
    dias_alerta_validade: DiasAlerta | None = None
    fornecedor_id: FornecedorId | None = None
    preco: Preco | None = None  # RN-60: sem preço = null


class ProductUpdate(EntradaBase):
    """Envie só os campos a alterar. dias_alerta_validade, fornecedor_id e preco aceitam null
    (preco: null apaga o preço)."""

    nome: Nome | None = None
    codigo_barras: CodigoBarras | None = None
    estoque_minimo: EstoqueMinimo | None = None
    controla_validade: bool | None = None
    dias_alerta_validade: DiasAlerta | None = None
    fornecedor_id: FornecedorId | None = None
    preco: Preco | None = None

    @model_validator(mode="after")
    def campos_obrigatorios_nao_nulos(self):
        anulaveis = {"dias_alerta_validade", "fornecedor_id", "preco"}
        nulos = [
            campo for campo in self.model_fields_set if campo not in anulaveis and getattr(self, campo) is None
        ]
        if nulos:
            raise ValueError(f"Preencha ou retire do envio: {', '.join(sorted(nulos))}.")
        return self


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    codigo_barras: str
    estoque_minimo: int
    controla_validade: bool
    dias_alerta_validade: int | None
    fornecedor_id: int | None
    fornecedor_nome: str | None
    preco: PrecoOut | None  # RN-60: texto com 2 casas ("79.90") ou null
    criado_em: datetime
