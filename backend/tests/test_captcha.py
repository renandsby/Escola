"""Verificação de CAPTCHA server-side (`core/captcha.py`, DX-SGE-006)."""

import pytest
import requests

from core.captcha import verify_captcha
from core.exceptions import BusinessLogicError


class _Resp:
    def __init__(self, ok=True, payload=None, boom=False):
        self.ok = ok
        self._payload = payload if payload is not None else {'success': True}
        self._boom = boom

    def json(self):
        if self._boom:
            raise ValueError('not json')
        return self._payload


def test_noop_when_disabled(settings):
    settings.CAPTCHA_ENABLED = False
    # não deve levantar mesmo sem token
    assert verify_captcha(None) is None


@pytest.fixture
def captcha_on(settings):
    settings.CAPTCHA_ENABLED = True
    settings.CAPTCHA_SECRET = 'sec'
    settings.CAPTCHA_VERIFY_URL = 'https://captcha.example/siteverify'
    return settings


def test_missing_token_raises_required(captcha_on):
    with pytest.raises(BusinessLogicError) as exc:
        verify_captcha('')
    assert exc.value.code == 'CAPTCHA_REQUIRED'


def test_valid_token_passes(captcha_on, monkeypatch):
    monkeypatch.setattr(requests, 'post', lambda *a, **k: _Resp(ok=True))
    assert verify_captcha('tok', remote_ip='1.2.3.4') is None


def test_provider_says_failure(captcha_on, monkeypatch):
    monkeypatch.setattr(
        requests, 'post', lambda *a, **k: _Resp(ok=True, payload={'success': False})
    )
    with pytest.raises(BusinessLogicError) as exc:
        verify_captcha('tok')
    assert exc.value.code == 'CAPTCHA_INVALID'


def test_provider_unreachable_raises_unavailable(captcha_on, monkeypatch):
    def _boom(*a, **k):
        raise requests.RequestException('timeout')

    monkeypatch.setattr(requests, 'post', _boom)
    with pytest.raises(BusinessLogicError) as exc:
        verify_captcha('tok')
    assert exc.value.code == 'CAPTCHA_UNAVAILABLE'
    assert exc.value.status_code == 503


def test_provider_returns_non_json(captcha_on, monkeypatch):
    monkeypatch.setattr(requests, 'post', lambda *a, **k: _Resp(ok=True, boom=True))
    with pytest.raises(BusinessLogicError) as exc:
        verify_captcha('tok')
    assert exc.value.code == 'CAPTCHA_UNAVAILABLE'
