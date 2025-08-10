#!/bin/bash

echo "Setting up YouTube Gallery Full Stack Application"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "Docker and Docker Compose are installed"

# Ask user for volume paths
echo ""
echo "Volume Configuration"
echo "==================="
echo "Where would you like to store the application data?"
echo ""

# Default paths
DEFAULT_POSTGRES_PATH="./data/postgres"
DEFAULT_MEDIA_PATH="./data/media"

# Ask for PostgreSQL data path
read -p "PostgreSQL data path [$DEFAULT_POSTGRES_PATH]: " POSTGRES_PATH
POSTGRES_PATH=${POSTGRES_PATH:-$DEFAULT_POSTGRES_PATH}

# Ask for media files path
read -p "Media files path [$DEFAULT_MEDIA_PATH]: " MEDIA_PATH
MEDIA_PATH=${MEDIA_PATH:-$DEFAULT_MEDIA_PATH}

echo ""
echo "Creating directories..."
mkdir -p "$POSTGRES_PATH"
mkdir -p "$MEDIA_PATH"

# Create named volumes with custom paths
echo "Creating Docker volumes with custom paths..."
docker volume create --driver local --opt type=none --opt o=bind --opt device="$POSTGRES_PATH" postgres_data
docker volume create --driver local --opt type=none --opt o=bind --opt device="$MEDIA_PATH" media_files

echo "Volumes created successfully!"
echo "  PostgreSQL data: $POSTGRES_PATH"
echo "  Media files: $MEDIA_PATH"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Django
SECRET_KEY=django-insecure-change-this-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=youtube_gallery
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432

# Frontend
REACT_APP_API_URL=http://localhost:8000/api
EOF
    echo "Created .env file"
else
    echo ".env file already exists"
fi

# Build and start the application
echo "Building and starting the application..."
docker-compose up --build -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 30

# Run database migrations
echo "Running database migrations..."
docker-compose exec -T backend python manage.py migrate

echo "Setup complete!"
echo ""
echo "Application is now running:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000/api/"
echo "   Django Admin: http://localhost:8000/admin/"
echo ""
echo "Data is stored in:"
echo "   PostgreSQL: $POSTGRES_PATH"
echo "   Media files: $MEDIA_PATH"
echo ""
echo "To create a superuser for Django admin:"
echo "   docker-compose exec backend python manage.py createsuperuser"
echo ""
echo "To import existing YouTube data:"
echo "   docker-compose exec backend python manage.py migrate_sqlite_data"
echo ""
echo "To stop the application:"
echo "   docker-compose down"

