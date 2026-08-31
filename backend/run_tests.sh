#!/bin/bash
# Script para executar testes do backend via Docker

set -e

echo "🧪 Executando testes do backend..."

# Garantir que os containers estão rodando
docker-compose up -d postgres redis backend

# Aguardar postgres estar pronto
echo "⏳ Aguardando PostgreSQL..."
docker-compose exec -T postgres pg_isready -U ${DB_USER:-escola_user} || true

# Instalar dependências de dev no container se necessário
echo "📦 Verificando dependências de teste no container..."
docker-compose exec -T backend pip install -q -e ".[dev]"

# Executar testes com cobertura
echo "🔬 Executando pytest..."
docker-compose exec -T backend pytest \
  --cov=apps \
  --cov-report=html \
  --cov-report=term-missing \
  --cov-branch \
  -v

echo "✅ Testes concluídos! Relatório gerado em backend/htmlcov/index.html"
