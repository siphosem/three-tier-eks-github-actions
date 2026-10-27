#!/usr/bin/env bash
# Copies the RDS credentials (managed by RDS in AWS Secrets Manager) into a Kubernetes Secret.
# Run once after terraform apply, and again if RDS rotates the password.
set -euo pipefail
cd "$(dirname "$0")/../terraform"

SECRET_ARN=$(terraform output -raw db_secret_arn)
DB_HOST=$(terraform output -raw db_address)
REGION=$(terraform output -raw region)

CREDS=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id "$SECRET_ARN" --query SecretString --output text)
DB_USER=$(echo "$CREDS" | python3 -c 'import json,sys; print(json.load(sys.stdin)["username"])')
DB_PASSWORD=$(echo "$CREDS" | python3 -c 'import json,sys; print(json.load(sys.stdin)["password"])')

kubectl apply -f ../k8s/namespace.yaml
kubectl -n notes create secret generic db-credentials \
  --from-literal=DB_HOST="$DB_HOST" \
  --from-literal=DB_USER="$DB_USER" \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "db-credentials secret updated in namespace notes"
