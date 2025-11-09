#!/bin/bash
set -e

echo "🚀 Starting Dev Container setup..."

# Install Azure Functions Core Tools
echo "📦 Installing Azure Functions Core Tools..."
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/debian/$(lsb_release -rs | cut -d'.' -f 1)/prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
sudo apt-get update
sudo apt-get install -y azure-functions-core-tools-4

# Install Prompt Flow CLI
echo "📦 Installing Prompt Flow..."
pip install --upgrade pip
pip install promptflow==1.15.0 promptflow-tools==1.4.0

# Install Node dependencies (root)
echo "📦 Installing Node dependencies..."
npm install

# Install dependencies for all demos
echo "📦 Installing demo dependencies..."
cd demos/02-rag-search/ingest && npm install && cd ../../..
cd demos/03-agent-with-tools/function-tool && npm install && cd ../../..
cd demos/03-agent-with-tools/agent && npm install && cd ../../..

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r demos/01-triage-promptflow/requirements.txt
pip install -r demos/02-rag-search/requirements.txt

# Copy .env.example if .env doesn't exist
if [ ! -f .env ]; then
  echo "📄 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Remember to configure .env with your Azure credentials"
fi

echo "✅ Dev Container setup complete!"
echo ""
echo "Next steps:"
echo "  1. Configure .env with your Azure credentials"
echo "  2. Run: make infra-up AZ_SUBSCRIPTION=<your-subscription-id>"
echo "  3. Run: ./scripts/export-outputs.sh"
echo "  4. Try demos: make demo01, make demo02-ingest, etc."
