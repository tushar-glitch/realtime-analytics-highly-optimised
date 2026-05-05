#!/usr/bin/env bash
set -euo pipefail

echo "→ Starting local services..."
docker compose up -d

echo "→ Waiting for ClickHouse..."
until docker compose exec clickhouse wget -qO- http://localhost:8123/ping &>/dev/null; do sleep 2; done

echo "→ Waiting for Redpanda..."
until docker compose exec redpanda rpk cluster info &>/dev/null; do sleep 2; done

echo "→ Running database migrations..."
pnpm migrate

echo "→ Creating Kafka topics..."
pnpm setup:topics

echo ""
echo "✓ Local environment ready"
echo "  Redpanda console:  http://localhost:8080"
echo "  ClickHouse UI:     http://localhost:8123/play"
echo "  Prometheus:        http://localhost:9090"
echo "  Grafana:           http://localhost:3001  (admin/admin)"
