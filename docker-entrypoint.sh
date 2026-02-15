#!/bin/sh
set -e

DB_PATH="/data/taskmanager.db"

# Initialize database from seed if it doesn't exist
if [ ! -f "$DB_PATH" ]; then
    echo "Initializing database..."
    cp /app/seed.db "$DB_PATH"
    echo "Database initialized at $DB_PATH"
else
    echo "Database already exists at $DB_PATH"
fi

echo "Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
