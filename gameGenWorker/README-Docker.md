# Docker Deployment for MateQuest GameGen Worker

This document explains how to deploy the MateQuest GameGen Worker using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Appwrite project configured with database and collection

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id_here
APPWRITE_API_KEY=your_api_key_here

# Database Configuration
DATABASE_GAMES_ID=your_database_id_here
COLLECTION_PGN_ID=your_collection_id_here

# Optional: Stockfish Configuration
# STOCKFISH_PATH=/usr/bin/stockfish
```

## Building and Running

### Option 1: Using Docker Compose (Recommended)

```bash
# Build and start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Option 2: Using Docker directly

```bash
# Build the image
docker build -t matequest-gamegen-worker .

# Run the container
docker run -d \
  --name matequest-gamegen-worker \
  --env-file .env \
  matequest-gamegen-worker
```

## Features

- **Automatic Stockfish Installation**: The Dockerfile installs Stockfish from the Ubuntu package manager
- **Security**: Runs as non-root user for better security
- **Resource Management**: Configured with CPU and memory limits
- **Health Checks**: Built-in health monitoring
- **Logging**: Persistent log storage (when using docker-compose)

## Customization

### Resource Limits
Edit the `docker-compose.yml` file to adjust CPU and memory limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # Maximum 2 CPU cores
      memory: 2G       # Maximum 2GB RAM
    reservations:
      cpus: '1.0'      # Guaranteed 1 CPU core
      memory: 1G       # Guaranteed 1GB RAM
```

### Stockfish Configuration
If you need a specific Stockfish version or path, you can:

1. Set the `STOCKFISH_PATH` environment variable
2. Modify the Dockerfile to install a specific Stockfish version
3. Use a custom Stockfish binary by mounting it as a volume

## Monitoring

View container logs:
```bash
docker-compose logs -f gamegen-worker
```

Check container status:
```bash
docker-compose ps
```

## Troubleshooting

### Stockfish Not Found
If you encounter Stockfish path issues:
1. Check that the container has Stockfish installed: `docker exec -it matequest-gamegen-worker which stockfish`
2. Verify the path in logs when the container starts

### Environment Variables
Ensure all required environment variables are set:
```bash
docker exec -it matequest-gamegen-worker env | grep -E "(APPWRITE|DATABASE|COLLECTION)"
```

### Resource Issues
If the container is being killed due to resource limits:
1. Increase memory limits in `docker-compose.yml`
2. Monitor resource usage: `docker stats matequest-gamegen-worker`
