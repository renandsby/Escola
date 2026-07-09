#!/bin/bash

set -e

echo "🚀 Iniciando setup do Sistema de Gestão Escolar..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${YELLOW}⚠️  docker-compose.yml não encontrado. Execute este script na raiz do projeto.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Etapa 1: Verificando dependências...${NC}"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker não está instalado. Por favor, instale Docker.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker encontrado${NC}"

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose não está instalado.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose encontrado${NC}"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js não está instalado. Por favor, instale Node.js 20+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js encontrado (versão: $(node --version))${NC}"

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Python 3 não está instalado.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python 3 encontrado (versão: $(python3 --version))${NC}"

echo -e "${BLUE}📁 Etapa 2: Preparando ambiente...${NC}"

# Criar arquivo .env se não existir
if [ ! -f ".env" ]; then
    echo "Criando .env..."
    cp .env.example .env
    echo -e "${GREEN}✓ Arquivo .env criado${NC}"
else
    echo -e "${GREEN}✓ Arquivo .env já existe${NC}"
fi

echo -e "${BLUE}🐳 Etapa 3: Iniciando containers Docker...${NC}"

# Parar containers existentes (se houver)
docker-compose down 2>/dev/null || true

# Iniciar containers
docker-compose up -d

echo -e "${GREEN}✓ Containers iniciados${NC}"

# Aguardar banco de dados estar pronto
echo -e "${BLUE}⏳ Aguardando banco de dados ficar pronto...${NC}"
sleep 5

for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U escola_user > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL pronto${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  PostgreSQL não ficou pronto no tempo esperado${NC}"
        exit 1
    fi
    sleep 1
done

echo -e "${BLUE}🗄️  Etapa 4: Executando migrações do banco de dados...${NC}"

docker-compose exec -T backend python manage.py migrate
echo -e "${GREEN}✓ Migrações executadas${NC}"

echo -e "${BLUE}👤 Etapa 5: Criando superusuário...${NC}"

# Criar superusuário com credenciais padrão
docker-compose exec -T backend python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@localhost.com',
        password='admin123',
        first_name='Admin',
        last_name='User',
    )
    print('✓ Superusuário criado: admin / admin123')
else:
    print('✓ Superusuário admin já existe')
EOF

echo -e "${BLUE}📦 Etapa 6: Instalando dependências do frontend...${NC}"

cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Dependências instaladas${NC}"
else
    echo -e "${GREEN}✓ node_modules já existe${NC}"
fi
cd ..

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup concluído com sucesso!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🌐 URLs disponíveis:${NC}"
echo -e "  Frontend:      ${YELLOW}http://localhost:3000${NC}"
echo -e "  Backend:       ${YELLOW}http://localhost:8000${NC}"
echo -e "  Admin:         ${YELLOW}http://localhost:8000/admin${NC}"
echo -e "  Swagger:       ${YELLOW}http://localhost:8000/api/docs${NC}"
echo -e "  ReDoc:         ${YELLOW}http://localhost:8000/api/redoc${NC}"
echo ""
echo -e "${BLUE}📝 Credenciais padrão:${NC}"
echo -e "  Usuário: ${YELLOW}admin${NC}"
echo -e "  Senha:   ${YELLOW}admin123${NC}"
echo ""
echo -e "${BLUE}📚 Próximos passos:${NC}"
echo -e "  1. Abra http://localhost:3000 no navegador"
echo -e "  2. Faça login com admin/admin123"
echo -e "  3. Leia CONTRIBUTING.md para saber como contribuir"
echo ""
echo -e "${BLUE}🛑 Para parar os containers:${NC}"
echo -e "  ${YELLOW}docker-compose down${NC}"
echo ""
echo -e "${BLUE}🔄 Para ver logs:${NC}"
echo -e "  ${YELLOW}docker-compose logs -f backend${NC}"
echo -e "  ${YELLOW}docker-compose logs -f frontend${NC}"
echo ""
