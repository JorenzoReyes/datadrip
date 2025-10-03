#!/bin/bash

# Complete Jenkins Setup Script for New Devices
# This script sets up Jenkins with all necessary plugins for DataDrip CI/CD

set -e

echo "🚀 Setting up Jenkins for DataDrip on a new device..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ docker-compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Start Jenkins
echo "🐳 Starting Jenkins container..."
docker-compose up jenkins -d

# Wait for Jenkins to be ready
echo "⏳ Waiting for Jenkins to start..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:8081/ > /dev/null 2>&1; then
        echo "✅ Jenkins is ready!"
        break
    fi
    
    echo "   Attempt $((attempt + 1))/$max_attempts - Jenkins not ready yet..."
    sleep 10
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Jenkins failed to start within expected time"
    echo "   Check logs: docker logs datadrip-jenkins"
    exit 1
fi

# Install plugins
echo "🔌 Installing Jenkins plugins..."
docker exec -it datadrip-jenkins bash -c "
    curl -fsSL http://localhost:8080/jnlpJars/jenkins-cli.jar -o jenkins-cli.jar
    java -jar jenkins-cli.jar -s http://localhost:8080 install-plugin workflow-aggregator git docker-workflow nodejs blueocean credentials-binding timestamper ws-cleanup workflow-basic-steps workflow-cps workflow-job pipeline-stage-view
    echo 'Plugins installed, restarting Jenkins...'
    java -jar jenkins-cli.jar -s http://localhost:8080 restart
"

# Wait for Jenkins to restart
echo "⏳ Waiting for Jenkins to restart..."
sleep 30

# Verify Jenkins is back up
max_attempts=20
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:8081/ > /dev/null 2>&1; then
        echo "✅ Jenkins is back online!"
        break
    fi
    
    echo "   Waiting for Jenkins to restart... ($((attempt + 1))/$max_attempts)"
    sleep 10
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "⚠️  Jenkins restart is taking longer than expected"
    echo "   You can check status manually at http://localhost:8081"
fi

echo ""
echo "🎉 Jenkins setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Open http://localhost:8081 in your browser"
echo "2. You should see the Jenkins dashboard"
echo "3. Click 'New Item' to create Pipeline jobs"
echo "4. Available job types: Pipeline, Multibranch Pipeline, Organization Folder"
echo ""
echo "🔧 Useful commands:"
echo "   npm run jenkins:logs    # View Jenkins logs"
echo "   npm run jenkins:down    # Stop Jenkins"
echo "   npm run jenkins:up      # Start Jenkins"
echo ""
echo "📚 Documentation: See JENKINS.md for detailed usage"
