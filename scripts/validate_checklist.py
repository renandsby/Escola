#!/usr/bin/env python3
"""Smoke suite não-destrutiva contra a API SME em execução.

Requer seed via `manage.py seed_municipal`. ~20 asserções.
Qualquer alteração de nota é revertida ao final.
"""

from __future__ import annotations

import sys

import requests

BASE = "http://localhost:8000/api/v1"

CREDENCIAIS = {
    "admin": ("admin", "admin123"),
    "professor": ("professor1", "prof123"),
    "aluno": ("aluno1", "aluno123"),
}

OK, FALHA, ALERTA = "PASS", "FAIL", "WARN"
resultados: list[tuple[str, str, str]] = []


def registra(situacao: str, item: str, detalhe: str) -> None:
    resultados.append((situacao, item, detalhe))
    print(f"[{situacao}] {item}\n        {detalhe}")


def login(papel: str) -> dict | None:
    usuario, senha = CREDENCIAIS[papel]
    r = requests.post(
        f"{BASE}/accounts/login/",
        json={"username": usuario, "password": senha},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    return r.json()


def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def total(payload) -> int:
    if isinstance(payload, dict):
        return payload.get("count", len(payload.get("results", [])))
    return len(payload)


def results(payload) -> list:
    if isinstance(payload, dict):
        return payload.get("results", [])
    return payload if isinstance(payload, list) else []


# ---------------------------------------------------------------- autenticação
print("\n=== 1. LOGIN ===")
sessoes: dict[str, dict] = {}
for papel in CREDENCIAIS:
    dados = login(papel)
    if dados and "access" in dados:
        sessoes[papel] = dados
        role = (dados.get("user") or {}).get("role", "?")
        registra(OK, f"Login como {papel}", f"role={role}")
    else:
        registra(FALHA, f"Login como {papel}", "não autenticou")

if "admin" not in sessoes:
    print("\nAbortado: sem sessão de admin.")
    sys.exit(1)

admin = sessoes["admin"]["access"]
admin_role = (sessoes["admin"].get("user") or {}).get("role")
registra(
    OK if admin_role == "sme_admin" else FALHA,
    "Admin tem role sme_admin",
    f"role={admin_role}",
)

# ---------------------------------------------------------------- escolas
print("\n=== 2. ESCOLAS ===")
r = requests.get(f"{BASE}/schools/", headers=headers(admin), timeout=30)
registra(
    OK if r.status_code == 200 and total(r.json()) >= 1 else FALHA,
    "Admin lista escolas",
    f"status={r.status_code} count={total(r.json()) if r.status_code == 200 else 'n/a'}",
)

# ---------------------------------------------------------------- escopo notas
print("\n=== 3. ESCOPO DE NOTAS (aluno vs admin) ===")
r_admin = requests.get(f"{BASE}/grades/", headers=headers(admin), timeout=30)
admin_grades = total(r_admin.json()) if r_admin.status_code == 200 else None
registra(
    OK if r_admin.status_code == 200 else FALHA,
    "Admin lista notas",
    f"status={r_admin.status_code} count={admin_grades}",
)

if "aluno" in sessoes:
    aluno_tok = sessoes["aluno"]["access"]
    r_aluno = requests.get(f"{BASE}/grades/", headers=headers(aluno_tok), timeout=30)
    aluno_grades = total(r_aluno.json()) if r_aluno.status_code == 200 else None
    if r_aluno.status_code != 200:
        registra(FALHA, "Aluno lista notas", f"status={r_aluno.status_code}")
    elif admin_grades is not None and aluno_grades is not None and aluno_grades < admin_grades:
        registra(
            OK,
            "Aluno vê menos notas que admin",
            f"aluno={aluno_grades} admin={admin_grades}",
        )
    else:
        registra(
            FALHA,
            "Aluno vê menos notas que admin",
            f"aluno={aluno_grades} admin={admin_grades}",
        )

    # POST escola → 403
    r = requests.post(
        f"{BASE}/schools/",
        json={"name": "Intrusa", "school_type": "CRECHE"},
        headers=headers(aluno_tok),
        timeout=30,
    )
    registra(
        OK if r.status_code == 403 else FALHA,
        "Aluno não cria escola (403)",
        f"POST /schools/ → {r.status_code}",
    )

    # PATCH nota → 403 e reverter se necessário
    notas = results(r_admin.json()) if r_admin.status_code == 200 else []
    if notas:
        nota_id = notas[0]["id"]
        original_score = notas[0].get("score")
        r = requests.patch(
            f"{BASE}/grades/{nota_id}/",
            json={"score": "10.00"},
            headers=headers(aluno_tok),
            timeout=30,
        )
        if r.status_code == 200:
            registra(FALHA, "Aluno não altera nota", f"PATCH → {r.status_code}")
            requests.patch(
                f"{BASE}/grades/{nota_id}/",
                json={"score": original_score},
                headers=headers(admin),
                timeout=30,
            )
            registra(OK, "Revertida alteração de nota", f"score={original_score}")
        else:
            registra(OK, "Aluno não altera nota", f"PATCH → {r.status_code}")
else:
    registra(ALERTA, "Escopo aluno", "sem sessão de aluno")

# ---------------------------------------------------------------- professor
print("\n=== 4. ESCOPO PROFESSOR ===")
if "professor" in sessoes:
    tok = sessoes["professor"]["access"]
    r_all = requests.get(f"{BASE}/classes/", headers=headers(admin), timeout=30)
    r_prof = requests.get(f"{BASE}/classes/", headers=headers(tok), timeout=30)
    if r_all.status_code == 200 and r_prof.status_code == 200:
        n_all, n_prof = total(r_all.json()), total(r_prof.json())
        registra(
            OK if n_prof <= n_all and n_prof >= 1 else FALHA,
            "Professor vê turmas alocadas",
            f"professor={n_prof} admin={n_all}",
        )
    else:
        registra(
            FALHA,
            "Professor lista turmas",
            f"admin={r_all.status_code} prof={r_prof.status_code}",
        )
else:
    registra(ALERTA, "Escopo professor", "sem sessão de professor")

# ---------------------------------------------------------------- SME
print("\n=== 5. ENDPOINTS SME ===")
r = requests.get(f"{BASE}/sme/departments/", headers=headers(admin), timeout=30)
registra(
    OK if r.status_code == 200 and total(r.json()) >= 1 else FALHA,
    "SME departments acessível ao admin",
    f"status={r.status_code} count={total(r.json()) if r.status_code == 200 else 'n/a'}",
)

r = requests.get(f"{BASE}/sme/academic-years/", headers=headers(admin), timeout=30)
registra(
    OK if r.status_code == 200 else FALHA,
    "SME academic-years",
    f"status={r.status_code}",
)

# ---------------------------------------------------------------- batch / existência
print("\n=== 6. BATCH ENDPOINTS ===")
for path, label in (
    ("/grades/batch-upsert/", "grades batch-upsert"),
    ("/attendance/batch-upsert/", "attendance batch-upsert"),
):
    r = requests.options(f"{BASE}{path}", headers=headers(admin), timeout=30)
    # Alguns setups não respondem bem a OPTIONS; fallback GET/POST sem body
    if r.status_code in (200, 204, 405, 401, 403):
        # 405 Method Not Allowed em OPTIONS ainda indica rota existente
        ok = r.status_code != 404
    else:
        r2 = requests.post(f"{BASE}{path}", json=[], headers=headers(admin), timeout=30)
        ok = r2.status_code != 404
        r = r2
    registra(
        OK if ok else FALHA,
        f"Endpoint {label} existe",
        f"status={r.status_code}",
    )

# ---------------------------------------------------------------- filtros / auth
print("\n=== 7. FILTROS E AUTH ===")
r = requests.get(f"{BASE}/grades/", headers=headers(admin), timeout=30)
notas = results(r.json()) if r.status_code == 200 else []
if notas:
    # Descobrir student via enrollment
    enroll_id = notas[0].get("enrollment")
    r_enr = requests.get(
        f"{BASE}/enrollments/{enroll_id}/",
        headers=headers(admin),
        timeout=30,
    )
    student_id = r_enr.json().get("student") if r_enr.status_code == 200 else None
    if student_id:
        base_n = total(r.json())
        r_f = requests.get(
            f"{BASE}/grades/?student={student_id}",
            headers=headers(admin),
            timeout=30,
        )
        filtrado = total(r_f.json()) if r_f.status_code == 200 else None
        registra(
            OK if filtrado is not None and filtrado <= base_n else FALHA,
            "Filtro ?student= em grades",
            f"filtrado={filtrado} total={base_n}",
        )
    else:
        registra(ALERTA, "Filtro ?student=", "não foi possível resolver student")
else:
    registra(ALERTA, "Filtro ?student=", "sem notas no seed")

r = requests.get(f"{BASE}/schools/", timeout=30)
registra(
    OK if r.status_code == 401 else FALHA,
    "401 sem autenticação",
    f"status={r.status_code}",
)

r = requests.get(
    f"{BASE}/students/00000000-0000-0000-0000-000000000000/",
    headers=headers(admin),
    timeout=30,
)
registra(
    OK if r.status_code == 404 else FALHA,
    "404 recurso inexistente",
    f"status={r.status_code}",
)

# ----------------------------------------------------------------------- resumo
print("\n" + "=" * 60)
passou = sum(1 for s, _, _ in resultados if s == OK)
falhou = sum(1 for s, _, _ in resultados if s == FALHA)
alerta = sum(1 for s, _, _ in resultados if s == ALERTA)
print(f"RESUMO: {passou} PASS · {falhou} FAIL · {alerta} WARN  (total={len(resultados)})")
print("=" * 60)
if falhou:
    print("\nFalhas:")
    for s, item, detalhe in resultados:
        if s == FALHA:
            print(f"  - {item}: {detalhe}")
    sys.exit(1)
sys.exit(0)
