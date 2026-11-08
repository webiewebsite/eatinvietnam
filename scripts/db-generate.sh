#!/usr/bin/env bash
# Generates migrations from src/db/schema.ts. The SPATIAL INDEX lives in a custom
# migration because drizzle-kit has no DSL for it; created once, never edited.
set -euo pipefail
npx drizzle-kit generate --name "${1:-schema}"
if ! ls src/db/migrations/*_spatial_index.sql >/dev/null 2>&1; then
  npx drizzle-kit generate --custom --name spatial_index
  f=$(ls src/db/migrations/*_spatial_index.sql)
  printf 'CREATE SPATIAL INDEX `restaurants_location_sidx` ON `restaurants` (`location`);\n' > "$f"
fi
