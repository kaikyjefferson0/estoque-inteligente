from datetime import date, datetime

import pytest

from app.core import clock


@pytest.mark.parametrize(
    ("agora_utc", "dia_em_brasilia"),
    [
        ("2026-11-02T02:59:59+00:00", date(2026, 11, 1)),
        ("2026-11-02T03:00:00+00:00", date(2026, 11, 2)),
        ("2026-11-02T03:00:01+00:00", date(2026, 11, 2)),
        ("2027-01-01T00:00:00+00:00", date(2026, 12, 31)),
        ("2027-01-01T03:00:00+00:00", date(2027, 1, 1)),
    ],
)
def test_dia_usado_nas_regras_de_validade(monkeypatch, agora_utc, dia_em_brasilia):
    monkeypatch.setattr(clock, "_agora_utc", lambda: datetime.fromisoformat(agora_utc))
    assert clock.hoje() == dia_em_brasilia
