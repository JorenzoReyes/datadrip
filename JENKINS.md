# Jenkins CI/CD Setup for DataDrip

This document explains how to set up and use Jenkins for continuous integration and deployment of the DataDrip project.

## 🚀 Quick Start

### Start Jenkins
```bash
# Start Jenkins with the project
npm run jenkins:up

# Or start Jenkins separately
docker-compose -f docker-compose.jenkins.yml up -d
```

### Access Jenkins
- **URL**: http://localhost:8081
- **Initial Setup**: Follow the setup wizard
- **Admin Password**: Get it from the container logs

## 📋 Prerequisites

- Docker and Docker Compose installed
- Git repository access
- Railway CLI (for deployment)
- GitHub credentials (for repository access)

## 🛠️ Setup Process

### 1. Start Jenkins
```bash
npm run jenkins:up
```

### 2. Get Initial Admin Password
```bash
npm run jenkins:logs
# Look for: "Please use the following password to proceed to installation:"
```

### 3. Complete Jenkins Setup
1. Open http://localhost:8081
2. Enter the admin password
3. Install suggested plugins
4. Create admin user
5. Configure system settings

### 4. Configure Credentials
Go to **Manage Jenkins > Manage Credentials > System > Global Credentials**

#### GitHub Credentials
- **Kind**: Username with password
- **ID**: `github-credentials`
- **Username**: Your GitHub username
- **Password**: Your GitHub personal access token

#### Database Password
- **Kind**: Secret text
- **ID**: `db-password`
- **Secret**: Your database password

### 5. Configure Global Tools
Go to **Manage Jenkins > Global Tool Configuration**

- **Node.js**: Install Node.js 20
- **Docker**: Use system Docker installation

## 🔄 Pipeline Overview

The Jenkins pipeline includes these stages:

1. **Checkout** - Get code from Git repository
2. **Install Dependencies** - Run `npm ci`
3. **Lint Code** - Run `npm run lint`
4. **Build Application** - Run `npm run build`
5. **Run Tests** - Run `npm test`
6. **Build Docker Image** - Create Docker image
7. **Database Setup** - Initialize and test database
8. **Security Scan** - Run `npm audit`
9. **Deploy to Development** - Deploy to Railway (development branch)
10. **Deploy to Production** - Deploy to Railway (main branch)

## 📁 File Structure

```
datadrip/
├── Jenkinsfile                    # Pipeline definition
├── docker-compose.jenkins.yml     # Jenkins Docker setup
├── jenkins/
│   └── jobs/
│       └── datadrip-pipeline/
│           └── config.xml         # Job configuration
└── scripts/
    └── setup-jenkins.sh           # Jenkins setup script
```

## 🎯 Available Commands

### Jenkins Management
```bash
# Start Jenkins
npm run jenkins:up

# Stop Jenkins
npm run jenkins:down

# View Jenkins logs
npm run jenkins:logs

# Run Jenkins setup script
npm run jenkins:setup
```

### Manual Pipeline Triggers
```bash
# Trigger pipeline manually
curl -X POST http://localhost:8081/job/datadrip-pipeline/build \
  --user admin:your-password
```

## 🔧 Configuration

### Environment Variables
The pipeline uses these environment variables:

- `NODE_VERSION`: Node.js version (default: 20)
- `DOCKER_IMAGE`: Docker image name (default: datadrip)
- `DOCKER_TAG`: Docker tag (default: BUILD_NUMBER)
- `DB_PASSWORD`: Database password (from credentials)

### Pipeline Triggers
- **SCM Trigger**: Every 5 minutes when development branch changes
- **Manual Trigger**: Available through Jenkins UI
- **Webhook Trigger**: Can be configured for GitHub webhooks

## 🚀 Deployment

### Development Deployment
- **Trigger**: Pushes to `development` branch
- **Target**: Railway development environment
- **Process**: Build → Test → Deploy

### Production Deployment
- **Trigger**: Pushes to `main` branch
- **Target**: Railway production environment
- **Process**: Build → Test → Deploy

## 🔍 Monitoring

### Build Status
- **Success**: Green indicator
- **Failure**: Red indicator
- **Unstable**: Yellow indicator

### Notifications
- **Slack Integration**: Configure in post-build actions
- **Email Notifications**: Configure in job settings
- **Webhook Notifications**: For external systems

## 🛠️ Troubleshooting

### Common Issues

#### Jenkins Won't Start
```bash
# Check Docker logs
docker logs datadrip-jenkins

# Check port conflicts
netstat -an | grep 8081

# Restart Jenkins
npm run jenkins:down
npm run jenkins:up
```

#### Pipeline Fails
1. Check build logs in Jenkins UI
2. Verify credentials are configured
3. Check Docker daemon is running
4. Verify network connectivity

#### Database Connection Issues
```bash
# Test database connection
docker exec datadrip-postgres-1 psql -U postgres -d datadrip -c "SELECT NOW();"

# Check database logs
docker logs datadrip-postgres-1
```

### Log Locations
- **Jenkins Logs**: `docker logs datadrip-jenkins`
- **Pipeline Logs**: Jenkins UI > Job > Build > Console Output
- **Docker Logs**: `docker logs datadrip-app-1`

## 🔒 Security

### Best Practices
1. **Use Secrets**: Store passwords in Jenkins credentials
2. **Limit Access**: Use role-based access control
3. **Regular Updates**: Keep Jenkins and plugins updated
4. **Secure Network**: Use HTTPS in production
5. **Backup**: Regular backup of Jenkins configuration

### Credential Management
- Store all sensitive data in Jenkins credentials
- Use different credentials for different environments
- Rotate credentials regularly
- Never commit credentials to version control

## 📊 Advanced Features

### Multi-Branch Pipeline
For multiple branches, consider using:
- **GitHub Organization Folder**: Auto-discover repositories
- **Multibranch Pipeline**: Separate pipelines per branch
- **Blue Ocean**: Modern Jenkins UI

### Integration with Other Tools
- **SonarQube**: Code quality analysis
- **Artifactory**: Artifact management
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

## 🆘 Support

### Getting Help
1. Check Jenkins documentation
2. Review pipeline logs
3. Check Docker container status
4. Verify network connectivity

### Useful Commands
```bash
# Check Jenkins status
docker ps | grep jenkins

# View Jenkins configuration
docker exec datadrip-jenkins cat /var/jenkins_home/config.xml

# Backup Jenkins data
docker run --rm -v datadrip_jenkins_home:/data -v $(pwd):/backup alpine tar czf /backup/jenkins-backup.tar.gz -C /data .

# Restore Jenkins data
docker run --rm -v datadrip_jenkins_home:/data -v $(pwd):/backup alpine tar xzf /backup/jenkins-backup.tar.gz -C /data
```

This Jenkins setup provides a robust CI/CD pipeline for the DataDrip project! 🎉
