#!/usr/bin/env python3
"""
YouTube Gallery Full Stack Application Setup Script
Cross-platform setup for Django + PostgreSQL + React application
"""

import os
import sys
import subprocess
import platform
from pathlib import Path


def run_command(command, check=True, capture_output=False):
    """Run a shell command and return the result"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=check,
            capture_output=capture_output,
            text=True
        )
        return result
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(f"Error: {e}")
        return None


def check_docker():
    """Check if Docker is installed and running"""
    print("Checking Docker installation...")
    
    result = run_command("docker --version", check=False)
    if result is None or result.returncode != 0:
        print("Docker is not installed. Please install Docker first.")
        print("Download from: https://www.docker.com/products/docker-desktop")
        return False
    
    result = run_command("docker info", check=False)
    if result is None or result.returncode != 0:
        print("Docker daemon is not running. Please start Docker Desktop.")
        return False
    
    print("Docker is installed and running")
    return True


def check_docker_compose():
    """Check if Docker Compose is installed"""
    print("Checking Docker Compose installation...")
    
    result = run_command("docker-compose --version", check=False)
    if result is None or result.returncode != 0:
        print("Docker Compose is not installed. Please install Docker Compose first.")
        return False
    
    print("Docker Compose is installed")
    return True


def get_user_input(prompt, default_value):
    """Get user input with a default value"""
    user_input = input(f"{prompt} [{default_value}]: ").strip()
    return user_input if user_input else default_value


def create_directories(paths):
    """Create directories if they don't exist"""
    for path in paths:
        Path(path).mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {path}")


def create_docker_volumes(volume_configs):
    """Create Docker volumes with custom paths"""
    print("Creating Docker volumes with custom paths...")
    
    for volume_name, host_path in volume_configs.items():
        run_command(f"docker volume rm {volume_name}", check=False)
        
        if platform.system() == "Windows":
            device_path = str(Path(host_path).absolute()).replace("\\", "/")
        else:
            device_path = str(Path(host_path).absolute())
        
        command = f'docker volume create --driver local --opt type=none --opt o=bind --opt device="{device_path}" {volume_name}'
        result = run_command(command)
        
        if result and result.returncode == 0:
            print(f"Created volume '{volume_name}' -> {host_path}")
        else:
            print(f"Failed to create volume '{volume_name}'")


def create_env_file():
    """Create .env file if it doesn't exist"""
    env_file = Path(".env")
    
    if not env_file.exists():
        print("Creating .env file...")
        env_content = """# Django
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
"""
        env_file.write_text(env_content)
        print("Created .env file")
    else:
        print(".env file already exists")


def build_and_start_application():
    """Build and start the Docker application"""
    print("Building and starting the application...")
    
    result = run_command("docker-compose up --build -d")
    if result is None or result.returncode != 0:
        print("Failed to start the application")
        return False
    
    print("Application started successfully")
    return True


def wait_for_services():
    """Wait for services to be ready"""
    print("Waiting for services to be ready...")
    import time
    time.sleep(30)


def run_migrations():
    """Run database migrations"""
    print("Running database migrations...")
    
    result = run_command("docker-compose exec -T backend python manage.py migrate")
    if result is None or result.returncode != 0:
        print("Failed to run migrations")
        return False
    
    print("Migrations completed successfully")
    return True


def main():
    """Main setup function"""
    print("Setting up YouTube Gallery Full Stack Application")
    print("=" * 50)
    
    # Check prerequisites
    if not check_docker():
        sys.exit(1)
    
    if not check_docker_compose():
        sys.exit(1)
    
    print("\nVolume Configuration")
    print("=" * 20)
    print("Where would you like to store the application data?")
    print()
    
    # Default paths based on platform
    if platform.system() == "Windows":
        default_postgres_path = "./data/postgres"
        default_media_path = "./data/media"
    else:
        default_postgres_path = "./data/postgres"
        default_media_path = "./data/media"
    
    postgres_path = get_user_input("PostgreSQL data path", default_postgres_path)
    media_path = get_user_input("Media files path", default_media_path)
    
    print(f"\nCreating directories...")
    create_directories([postgres_path, media_path])
    
    volume_configs = {
        "postgres_data": postgres_path,
        "media_files": media_path
    }
    create_docker_volumes(volume_configs)
    
    create_env_file()
    
    if not build_and_start_application():
        sys.exit(1)
    
    wait_for_services()
    
    if not run_migrations():
        sys.exit(1)
    
    print("\nSetup complete!")
    print()
    print("Application is now running:")
    print("   Frontend: http://localhost:3000")
    print("   Backend API: http://localhost:8000/api/")
    print("   Django Admin: http://localhost:8000/admin/")
    print()
    print("Data is stored in:")
    print(f"   PostgreSQL: {postgres_path}")
    print(f"   Media files: {media_path}")
    print()
    print("To create a superuser for Django admin:")
    print("   docker-compose exec backend python manage.py createsuperuser")
    print()
    print("To import existing YouTube data:")
    print("   docker-compose exec backend python manage.py migrate_sqlite_data")
    print()
    print("To stop the application:")
    print("   docker-compose down")


if __name__ == "__main__":
    main()
