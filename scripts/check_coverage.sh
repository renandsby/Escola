#!/bin/bash
# Script para verificar cobertura de testes backend e frontend

set -e

echo "🔍 Verificando cobertura de testes do projeto Escola..."

# Frontend
echo ""
echo "📊 Cobertura Frontend (Vitest):"
cd "$(dirname "$0")/../frontend"
npx vitest run --coverage

# Backend
echo ""
echo "📊 Cobertura Backend (Pytest):"
cd "$(dirname "$0")/.."
if command -v docker-compose &> /dev/null && docker-compose ps | grep -q "escola_backend"; then
    echo "Executando via Docker container existente..."
    docker-compose exec -T backend pytest --cov=apps --cov-report=term-missing
else
    echo "Para rodar cobertura do backend, use: ./backend/run_tests.sh ou suba os containers com docker-compose up -d"
fi

echo ""
echo "✅ Verificação concluída!"
