# Autenticação em Dois Fatores (2FA) — TOTP

Implementação de MFA/2FA com **TOTP** (Time-based One-Time Password, RFC 6238),
compatível com Google Authenticator, Microsoft Authenticator, Authy, Aegis e
2FAS. Todo o processamento é local — sem SMS, API paga ou chamada externa.

| Item | Valor |
| :--- | :--- |
| Padrão | RFC 6238 (TOTP) sobre RFC 4226 (HOTP) · HMAC-SHA1 · janela de 30 s · 6 dígitos |
| Biblioteca | `pyotp==2.9.0` (MIT) + `qrcode` (geração do QR) |
| Segredo no banco | criptografado com **Fernet** (`cryptography`) |
| Backup codes | 8 por usuário, hash **SHA-256**, uso único, formato `1234-5678` |
| Tolerância de relógio | `valid_window=1` (±30 s) |
| Challenge token | JWT de **5 min** emitido no login quando o 2FA está ativo |

## Fluxo de ativação (usuário logado, Configurações → Segurança)

1. `POST /api/v1/accounts/totp/enable/` → gera o segredo, cria `TOTPDevice`
   (`confirmed=False`) e devolve `{ secret, qr_code, device_id }`.
2. Usuário escaneia o QR (ou digita a chave) no app autenticador.
3. `POST /api/v1/accounts/totp/confirm/` `{ code }` → valida o 1º código,
   marca `confirmed=True` e devolve `{ backup_codes: [8 códigos] }`.
4. A partir daí, o próximo login exige o 2º fator.

## Fluxo de login com 2FA

1. `POST /api/v1/accounts/login/` `{ username, password }`
   * sem 2FA → `{ requires_2fa: false, access, refresh, user }`
   * com 2FA → `{ requires_2fa: true, challenge_token }`
2. `POST /api/v1/accounts/totp/verify/` `{ challenge_token, code }`
   * `code` = 6 dígitos do app **ou** um backup code `XXXX-XXXX`
   * sucesso → `{ requires_2fa: false, access, refresh, user }`

O `challenge_token` não dá acesso a nenhum outro endpoint.

## Endpoints

| Método | Path | Auth | Descrição |
| :--- | :--- | :--- | :--- |
| GET  | `/api/v1/accounts/totp/status/`  | JWT | `{ enabled, confirmed_at, backup_codes_remaining }` |
| POST | `/api/v1/accounts/totp/enable/`  | JWT | Inicia a ativação (QR code + segredo) |
| POST | `/api/v1/accounts/totp/confirm/` | JWT | Confirma com o 1º código → backup codes |
| POST | `/api/v1/accounts/totp/disable/` | JWT | Remove dispositivo + backup codes |
| POST | `/api/v1/accounts/totp/verify/`  | Público (challenge token) | 2ª etapa do login |

## Modelos (`apps/authentication/models/__init__.py`)

```
TOTPDevice   user (OneToOne) · secret (Fernet) · confirmed · confirmed_at
BackupCode   user (FK) · code (SHA-256) · used · used_at
             UniqueConstraint(user, code) · Index(user, used)
```

## Camada de domínio

| Arquivo | Responsabilidade |
| :--- | :--- |
| `services/totp_service.py` | `generate_totp_secret`, `confirm_totp`, `generate_backup_codes`, `verify_totp_code`, `disable_totp`, `is_totp_enabled`, `get_confirmed_device`, `remaining_backup_codes`, `encrypt_secret`/`decrypt_secret` |
| `services/challenge_token.py` | `ChallengeToken` (JWT 5 min), `generate_challenge_token`, `resolve_challenge_token` |
| `api/serializers.py` | `CustomTokenObtainPairSerializer.validate` devolve `requires_2fa`; serializers `TOTP*` |
| `api/views.py` | `TOTPViewSet` (5 actions) |
| `core/middleware.py` | `_audit_login` distingue `LOGIN`, `LOGIN_2FA_CHALLENGE` e `LOGIN_FAILED`; o `LoginLog` só é gravado quando a sessão é de fato iniciada (no `/totp/verify/`) |

## Configuração (`settings.py`)

```
TOTP_ENCRYPTION_KEY   # deriva da SECRET_KEY; defina para rotacionar sem mexer no JWT
TOTP_ISSUER_NAME      # rótulo exibido no app autenticador (default: "Rede Municipal de Educação")
```

## Auditoria

`AuditLog`:
* `LOGIN_2FA_CHALLENGE` — usuário/senha corretos, aguardando o 2º fator (não é sessão).
* `LOGIN` (em `request_path=/api/v1/accounts/totp/verify/`) — sessão de fato iniciada; grava `LoginLog(success=True)`.
* `LOGIN_FAILED` — usuário/senha ou 2º fator inválidos.

## Operação

### Usuário perdeu o celular / esgotou os backup codes

```python
from django.contrib.auth import get_user_model
from apps.authentication.services import totp_service

user = get_user_model().objects.get(username='fulano')
totp_service.disable_totp(user)   # remove 2FA; usuário volta ao login simples
```

Ou pelo Django Admin: **Dispositivos 2FA (TOTP)** → excluir o registro.

### "Código sempre inválido"

* Relógio do celular precisa estar no **horário automático** (o TOTP depende dele).
* Tolerância máxima: ±30 s.

## Testes

```bash
docker compose exec backend python -m pytest apps/authentication/tests/test_totp_service.py apps/authentication/tests/test_totp_api.py -q
```

## Referências

* [RFC 6238 — TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
* [pyotp](https://pyotp.readthedocs.io/)
