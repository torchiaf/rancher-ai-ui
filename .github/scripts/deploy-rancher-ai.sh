#!/bin/bash

# Helper script to install the AI Assistant Helm chart into a Kubernetes cluster
#
# The LLM is configured to use a mock service for testing purposes.

KUBECONFIG_PATH=$1

if [ -z "$KUBECONFIG_PATH" ]; then
  echo "ERROR: kubeconfig path required (arg or KUBECONFIG env)"
  usage
fi

if [ ! -f "$KUBECONFIG_PATH" ]; then
  echo "ERROR: kubeconfig not found at $KUBECONFIG_PATH"
  exit 2
fi

export KUBECONFIG="$KUBECONFIG_PATH"

helm uninstall ai-agent -n cattle-ai-agent-system
helm uninstall llm-mock -n cattle-ai-agent-system || true

echo ""
echo "Cloning rancher-ai-agent chart repository..."

rm -rf rancher-ai-agent
rm -rf rancher-ai-llm-mock
git clone https://github.com/torchiaf/rancher-ai-agent.git
cd rancher-ai-agent
git fetch origin feature-chat-history
git checkout feature-chat-history
cd ..

echo ""
echo "Cloning llm-mock chart repository..."

git clone https://github.com/rancher-sandbox/rancher-ai-llm-mock.git

echo ""
echo "Deploying Rancher AI Helm chart with LLM mock configuration..."

helm upgrade --install ai-agent ./rancher-ai-agent/chart/agent \
  --namespace cattle-ai-agent-system \
  --create-namespace \
  --set googleApiKey=empty \
  --set ollamaUrl="" \
  --set llmModel=gemini-2.0-flash \
  --set activeLlm=gemini \
  --set aiAgent.image.tag=v1.0.51 \
  --set mcp.image.tag=v0.1.1 \
  --set chat.image.tag=v1.0.28 \
  --set chat.image.pullPolicy=Always \
  --set db.supervisor.image.tag=v1.0.12 \
  --set db.supervisor.image.pullPolicy=Always \
  --set db.supervisor.enabled=false \
  --set llmMock.enabled=true \
  --set llmMock.url=http://llm-mock \
  --set insecureSkipTls=true \
  --set log.level=debug \
  --wait --timeout 2m

kubectl -n cattle-ai-agent-system rollout status deployment/rancher-ai-agent --timeout=2m
kubectl -n cattle-ai-agent-system wait --for=condition=available --timeout=2m deployment/rancher-ai-agent

echo ""
echo "Deploying LLM mock service..."

helm upgrade --install llm-mock ./rancher-ai-llm-mock/chart/llm-mock \
  --namespace cattle-ai-agent-system \
  --create-namespace \
  --wait --timeout 1m

kubectl -n cattle-ai-agent-system rollout status deployment/llm-mock --timeout=1m
kubectl -n cattle-ai-agent-system wait --for=condition=available --timeout=1m deployment/llm-mock