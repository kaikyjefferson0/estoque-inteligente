from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

# RN-31, RN-36 e alertas: "hoje" é o dia em Brasília, não o do servidor (UTC no Render)
FUSO_HORARIO = ZoneInfo("America/Sao_Paulo")


def _agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def hoje() -> date:
    return _agora_utc().astimezone(FUSO_HORARIO).date()
