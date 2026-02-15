# Docker Deployment Guide

## Quick Start

```bash
# Clone the repository
git clone <repo-url> taskmanager
cd taskmanager

# Start with Docker Compose
docker compose up -d

# The app is now available at http://localhost:3000
```

## Environment Variables

| Variable       | Default                      | Description                        |
| -------------- | ---------------------------- | ---------------------------------- |
| `DATABASE_URL` | `file:/data/taskmanager.db`  | SQLite database file path          |
| `PORT`         | `3000`                       | Port the server listens on         |
| `NODE_ENV`     | `production`                 | Node environment                   |

## Building the Docker Image

```bash
# Build the image
docker build -t taskmanager .

# Run directly with Docker
docker run -d \
  --name taskmanager \
  -p 3000:3000 \
  -v taskmanager-data:/data \
  -e DATABASE_URL=file:/data/taskmanager.db \
  -e NODE_ENV=production \
  taskmanager
```

## Data Persistence

SQLite data is stored in a named Docker volume (`taskmanager-data`). This volume persists across container restarts and image updates.

### Backup

```bash
# Create a backup of the database
docker run --rm -v taskmanager-data:/data -v $(pwd)/backups:/backups \
  alpine cp /data/taskmanager.db /backups/taskmanager-$(date +%Y%m%d-%H%M%S).db

# Or copy directly from the volume
docker cp taskmanager:/data/taskmanager.db ./backup.db
```

### Restore

```bash
# Stop the container first
docker compose down

# Restore from backup
docker run --rm -v taskmanager-data:/data -v $(pwd)/backups:/backups \
  alpine cp /backups/taskmanager-20260215-120000.db /data/taskmanager.db

# Start the container again
docker compose up -d
```

## Updating

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose up -d --build
```

The entrypoint script automatically applies database schema changes on startup via `prisma db push`.

## Reverse Proxy (Nginx)

To run behind Nginx with HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name tasks.example.com;

    ssl_certificate /etc/letsencrypt/live/tasks.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tasks.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Reverse Proxy (Caddy)

```
tasks.example.com {
    reverse_proxy localhost:3000
}
```

## Health Check

The container includes a health check that queries `GET /api` every 30 seconds. Check container health with:

```bash
docker inspect --format='{{.State.Health.Status}}' taskmanager
```

## Troubleshooting

**Container exits immediately:**
```bash
docker compose logs taskmanager
```

**Database permission errors:**
The `/data` directory is owned by the `nextjs` user (UID 1001). If mounting a host directory instead of a named volume, ensure proper permissions:
```bash
mkdir -p ./data && chown 1001:1001 ./data
```

**Port conflict:**
Change the host port mapping in `docker-compose.yml` or set the `PORT` environment variable:
```bash
PORT=8080 docker compose up -d
```
