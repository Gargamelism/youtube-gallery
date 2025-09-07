FROM python:3.12-slim AS test

# Set environment variables for test stage
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TESTING=1
ENV DJANGO_SETTINGS_MODULE=config.settings

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
    && rm -rf /var/lib/apt/lists/*

# Install test dependencies first
COPY requirements.txt .
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt pytest pytest-django

# Copy the entire project for testing
COPY . .

# Create required directories
RUN mkdir -p /app/media /app/config/credentials

# Make test directories writable
RUN chmod -R 777 /app/media /app/config/credentials

# Base stage with common setup
FROM python:3.12-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        gcc \
        g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy project
COPY . .

# Create required directories
RUN mkdir -p /app/media /app/config/credentials

# Development stage with debugging tools
FROM base AS development

# Install Python dependencies (includes debugpy)
COPY requirements.txt .
COPY requirements-dev.txt .
RUN /usr/local/bin/pip install --no-cache-dir -r requirements-dev.txt

# Expose ports
EXPOSE 8000 5678

# Run the application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Production stage
FROM base AS production

# Install Python dependencies
COPY requirements.txt .
RUN /usr/local/bin/pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
