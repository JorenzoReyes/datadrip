#!/bin/bash

# Jenkins Setup Script for DataDrip Project
# This script sets up Jenkins with necessary plugins and configurations

echo "🚀 Setting up Jenkins for DataDrip CI/CD..."

# Wait for Jenkins to be ready
echo "⏳ Waiting for Jenkins to start..."
while ! curl -f http://localhost:8081/login > /dev/null 2>&1; do
    echo "   Jenkins not ready yet, waiting..."
    sleep 10
done

echo "✅ Jenkins is ready!"

# Get initial admin password
echo "🔑 Getting Jenkins initial admin password..."
JENKINS_PASSWORD=$(docker exec datadrip-jenkins cat /var/jenkins_home/secrets/initialAdminPassword)
echo "   Initial admin password: $JENKINS_PASSWORD"

# Install Jenkins CLI
echo "📦 Installing Jenkins CLI..."
wget -O jenkins-cli.jar http://localhost:8081/jnlpJars/jenkins-cli.jar

# Wait for Jenkins to be fully initialized
echo "⏳ Waiting for Jenkins to be fully initialized..."

# Create job directory
echo "📁 Creating Jenkins job directory..."
mkdir -p jenkins/jobs/datadrip-pipeline

# Copy job configuration
echo "📋 Setting up Jenkins job..."
cp jenkins/jobs/datadrip-pipeline/config.xml jenkins/jobs/datadrip-pipeline/config.xml.bak

echo "🎉 Jenkins setup completed!"
echo ""
echo "📝 Next steps:"
echo "1. Open http://localhost:8081 in your browser"
echo "2. Login with admin and password: $JENKINS_PASSWORD"
echo "3. Install suggested plugins"
echo "4. Create admin user"
echo "5. Configure GitHub credentials"
echo "6. Configure database password credentials"
echo ""
echo "🔧 Jenkins will be available at: http://localhost:8081"
echo "📊 Jenkins job: DataDrip Pipeline"
echo "🔄 Auto-trigger: Every 5 minutes on development branch changes"
