#!/bin/bash

# Jenkins Plugin Installation Script
# This script installs all necessary plugins for DataDrip CI/CD

echo "🔌 Installing Jenkins plugins for DataDrip CI/CD..."

# Wait for Jenkins to be ready
echo "⏳ Waiting for Jenkins to start..."
while ! curl -f http://localhost:8080/ > /dev/null 2>&1; do
    echo "   Jenkins not ready yet, waiting..."
    sleep 5
done

echo "✅ Jenkins is ready!"

# Download Jenkins CLI
echo "📦 Downloading Jenkins CLI..."
wget -O jenkins-cli.jar http://localhost:8080/jnlpJars/jenkins-cli.jar

if [ ! -f "jenkins-cli.jar" ]; then
    echo "❌ Failed to download Jenkins CLI"
    exit 1
fi

# List of essential plugins (minimal set for faster installation)
PLUGINS=(
    "workflow-aggregator"
    "git"
    "docker-workflow"
    "nodejs"
    "blueocean"
    "build-timeout"
    "credentials-binding"
    "timestamper"
    "ws-cleanup"
    "workflow-basic-steps"
    "workflow-durable-task-step"
    "workflow-cps"
    "workflow-step-api"
    "workflow-api"
    "workflow-support"
    "workflow-job"
    "workflow-scm-step"
    "workflow-cps-global-lib"
    "pipeline-stage-view"
    "pipeline-github-lib"
    "pipeline-graph-analysis"
    "pipeline-input-step"
    "pipeline-rest-api"
    "pipeline-stage-tags-metadata"
    "pipeline-utility-steps"
    "scm-api"
    "script-security"
    "ssh-credentials"
    "plain-credentials"
    "credentials"
    "structs"
    "junit"
    "mailer"
    "matrix-auth"
    "github"
    "github-branch-source"
    "github-api"
    "ansicolor"
    "build-trigger-badge"
    "copyartifact"
    "parameterized-trigger"
    "throttle-concurrents"
    "xunit"
    "htmlpublisher"
    "dashboard-view"
    "view-job-filters"
    "nested-view"
    "sectioned-view"
    "ssh"
    "ssh-slaves"
    "matrix-project"
    "resource-disposer"
    "github-oauth"
    "git-client"
    "workflow-multibranch"
    "workflow-remote-loader"
)

echo "📦 Installing ${#PLUGINS[@]} plugins..."

# Install plugins using Jenkins CLI (no authentication needed since security is disabled)
for plugin in "${PLUGINS[@]}"; do
    echo "   Installing: $plugin"
    java -jar jenkins-cli.jar -s http://localhost:8080 install-plugin $plugin
    if [ $? -eq 0 ]; then
        echo "   ✅ $plugin installed successfully"
    else
        echo "   ⚠️  $plugin installation failed (may already be installed)"
    fi
done

echo "🔄 Restarting Jenkins to apply plugins..."
java -jar jenkins-cli.jar -s http://localhost:8080 restart

echo "⏳ Waiting for Jenkins to restart..."
sleep 30

# Test if Jenkins is back up
while ! curl -f http://localhost:8080/ > /dev/null 2>&1; do
    echo "   Waiting for Jenkins to restart..."
    sleep 10
done

echo "✅ Jenkins plugins installed successfully!"
echo ""
echo "🎉 You can now create:"
echo "   • Pipeline jobs"
echo "   • Multibranch Pipeline jobs"
echo "   • Organization Folder jobs"
echo "   • And more!"
echo ""
echo "🔧 Access Jenkins at: http://localhost:8081 (from host) or http://localhost:8080 (from container)"

# Clean up
rm -f jenkins-cli.jar