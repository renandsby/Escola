#!/usr/bin/env python3
"""
Script de teste das APIs do sistema
"""

import requests
import json
from pprint import pprint

BASE_URL = "http://localhost:8000/api/v1"
TOKEN = None

def login(username, password):
    """Faz login e retorna o token"""
    global TOKEN
    response = requests.post(
        f"{BASE_URL}/accounts/login/",
        json={"username": username, "password": password}
    )
    if response.status_code == 200:
        TOKEN = response.json()["access"]
        print(f"✅ Login como {username} bem-sucedido!")
        return TOKEN
    else:
        print(f"❌ Erro ao fazer login: {response.status_code}")
        print(response.text)
        return None

def get_headers():
    """Retorna headers com autenticação"""
    return {"Authorization": f"Bearer {TOKEN}"}

def test_endpoint(method, path, data=None, expected=200):
    """Testa um endpoint"""
    url = f"{BASE_URL}{path}"
    try:
        if method == "GET":
            response = requests.get(url, headers=get_headers())
        elif method == "POST":
            response = requests.post(url, json=data, headers=get_headers())
        elif method == "PUT":
            response = requests.put(url, json=data, headers=get_headers())
        elif method == "DELETE":
            response = requests.delete(url, headers=get_headers())

        status = "✅" if response.status_code == expected else "❌"
        print(f"{status} {method} {path} -> {response.status_code}")

        if response.status_code >= 400:
            print(f"   Erro: {response.text[:200]}")

        return response.status_code == expected, response
    except Exception as e:
        print(f"❌ {method} {path} -> ERRO: {str(e)}")
        return False, None

print("=" * 60)
print("TESTE DE APIs - Sistema de Gestão Escolar")
print("=" * 60)

# 1. Login
print("\n📝 Testando Autenticação...")
if not login("admin", "admin123"):
    exit(1)

# 2. Testar endpoints principais
print("\n📚 Testando Escolas...")
test_endpoint("GET", "/schools/")
test_endpoint("GET", "/schools/")

print("\n👨‍🎓 Testando Alunos...")
test_endpoint("GET", "/students/")
success, resp = test_endpoint("GET", "/students/")
if success and resp:
    students = resp.json()
    if isinstance(students, dict) and 'results' in students:
        if students['results']:
            student_id = students['results'][0]['id']
            test_endpoint("GET", f"/students/{student_id}/")

print("\n🏫 Testando Turmas...")
test_endpoint("GET", "/classes/")

print("\n📖 Testando Disciplinas...")
test_endpoint("GET", "/subjects/")

print("\n📊 Testando Notas...")
test_endpoint("GET", "/grades/")

print("\n📅 Testando Frequência...")
test_endpoint("GET", "/attendance/")

print("\n✏️  Testando Matrículas...")
test_endpoint("GET", "/enrollments/")

print("\n👥 Testando Responsáveis...")
test_endpoint("GET", "/guardians/")

print("\n👤 Testando Perfil do Usuário...")
test_endpoint("GET", "/accounts/users/me/", expected=200)

print("\n📄 Testando Documentos...")
test_endpoint("GET", "/documents/")

print("\n💬 Testando Mensagens...")
test_endpoint("GET", "/communications/")

print("\n📊 Testando Relatórios...")
print("📄 Testando PDF Boletim...")
test_endpoint("GET", "/reports/boletim_pdf/")

print("🎫 Testando PDF Carteirinha...")
test_endpoint("GET", "/reports/carteirinha_pdf/")

print("📊 Testando Relatório Excel...")
test_endpoint("GET", "/reports/relatorio_excel/")

print("📋 Testando Relatório CSV...")
test_endpoint("GET", "/reports/relatorio_csv/")

# Testar com outro usuário
print("\n" + "=" * 60)
print("Testando com Aluno...")
print("=" * 60)

if login("aluno1", "aluno123"):
    print("\n👨‍🎓 Dados do Aluno...")
    test_endpoint("GET", "/accounts/users/me/")

    print("\n📊 Notas do Aluno...")
    test_endpoint("GET", "/grades/")

    print("\n📅 Frequência do Aluno...")
    test_endpoint("GET", "/attendance/")

    print("\n📄 Seu Boletim (PDF)...")
    test_endpoint("GET", "/reports/boletim_pdf/")

print("\n" + "=" * 60)
print("✅ Testes Concluídos!")
print("=" * 60)
