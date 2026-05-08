#!/usr/bin/env bash
# Bootstrap K3s on Oracle Cloud A1 Flex (ARM, Ubuntu 22.04).
# Run once as root on the VM: curl -fsSL <raw-url>/bootstrap-k3s.sh | sudo bash
set -euo pipefail

DOMAIN=${DOMAIN:-"yourdomain.com"}
EMAIL=${EMAIL:-"admin@yourdomain.com"}

echo "==> Installing K3s (disabling built-in Traefik — we install cert-manager separately)"
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

echo "==> Waiting for K3s to be ready..."
until kubectl get nodes 2>/dev/null | grep -q Ready; do sleep 3; done

echo "==> Installing Helm"
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

echo "==> Installing Traefik v3 (with Let's Encrypt)"
helm repo add traefik https://traefik.github.io/charts
helm repo update
helm upgrade --install traefik traefik/traefik \
  --namespace kube-system \
  --set ports.websecure.tls.enabled=true \
  --set certificatesResolvers.letsencrypt.acme.email="${EMAIL}" \
  --set certificatesResolvers.letsencrypt.acme.storage=/data/acme.json \
  --set certificatesResolvers.letsencrypt.acme.httpChallenge.entryPoint=web \
  --set persistence.enabled=true \
  --set persistence.size=128Mi

echo "==> Installing KEDA (autoscales processor on Kafka lag)"
helm repo add kedacore https://kedacore.github.io/charts
helm upgrade --install keda kedacore/keda --namespace keda --create-namespace

echo "==> Creating analytics namespace and applying base manifests"
kubectl apply -k /opt/analytics/infra/k8s/base

echo "==> Setting up Redpanda topics"
# Wait for Redpanda to be ready
kubectl rollout status statefulset/redpanda -n analytics --timeout=120s
kubectl exec -n analytics redpanda-0 -- \
  rpk topic create events.raw --partitions 6 --replicas 1
kubectl exec -n analytics redpanda-0 -- \
  rpk topic create events.dlq --partitions 1 --replicas 1

echo "==> Running ClickHouse migrations"
kubectl rollout status statefulset/clickhouse -n analytics --timeout=120s
# Port-forward temporarily to run migrations from this node
kubectl port-forward -n analytics svc/clickhouse 8123:8123 &
PF_PID=$!
sleep 3
CLICKHOUSE_HOST=http://localhost:8123 \
CLICKHOUSE_DB=analytics \
CLICKHOUSE_USER=analytics \
CLICKHOUSE_PASSWORD="$(kubectl get secret analytics-secrets -n analytics -o jsonpath='{.data.CLICKHOUSE_PASSWORD}' | base64 -d)" \
  node /opt/analytics/packages/clickhouse/dist/migrate.js
kill $PF_PID

echo ""
echo "✓ Bootstrap complete."
echo ""
echo "Next steps:"
echo "  1. Point DNS A records:"
echo "     collect.${DOMAIN} → $(curl -s ifconfig.me)"
echo "     analytics.${DOMAIN} → $(curl -s ifconfig.me)"
echo "  2. Add KUBECONFIG_B64 secret to GitHub:"
echo "     cat /etc/rancher/k3s/k3s.yaml | base64 -w0"
echo "  3. Push to main — CI will build images and deploy."
