# Setting Up DataDrip on a New Device

This guide helps you set up the complete DataDrip project with Jenkins CI/CD on a new device.

## 📋 Prerequisites

### Required Software
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Docker Compose** - Usually included with Docker Desktop
- **Git** - [Download here](https://git-scm.com/downloads)
- **Node.js 20+** - [Download here](https://nodejs.org/)

### Verify Installation
```bash
# Check Docker
docker --version
docker-compose --version

# Check Git
git --version

# Check Node.js
node --version
npm --version
```

## 🚀 Quick Setup (Automated)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/datadrip.git
cd datadrip
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Complete Jenkins Setup
```bash
# One command to set up everything
npm run jenkins:setup:complete
```

This will:
- ✅ Start Jenkins container
- ✅ Install all necessary plugins
- ✅ Configure Jenkins for CI/CD
- ✅ Verify everything is working

### 4. Access Jenkins
- Open http://localhost:8081
- You should see the Jenkins dashboard
- Click "New Item" to create Pipeline jobs

## 🔧 Manual Setup (Step by Step)

If you prefer manual setup or the automated script fails:

### 1. Start Jenkins
```bash
npm run jenkins:up
```

### 2. Wait for Jenkins to Start
```bash
# Check if Jenkins is running
curl http://localhost:8081

# Or check logs
npm run jenkins:logs
```

### 3. Install Plugins
```bash
npm run jenkins:plugins
```

### 4. Verify Setup
- Go to http://localhost:8081
- Click "New Item"
- You should see Pipeline, Multibranch Pipeline, etc.

## 🐳 Docker Commands

### Start Services
```bash
# Start everything (app + postgres + jenkins)
docker-compose up -d

# Start only Jenkins
npm run jenkins:up

# Start only database
docker-compose up postgres -d
```

### Stop Services
```bash
# Stop everything
docker-compose down

# Stop only Jenkins
npm run jenkins:down
```

### View Logs
```bash
# Jenkins logs
npm run jenkins:logs

# All services logs
docker-compose logs -f

# Specific service logs
docker logs datadrip-jenkins
docker logs datadrip-postgres-1
```

## 🗄️ Database Setup

### Initialize Database
```bash
# With Docker (recommended)
DB_PASSWORD=postgres npm run db:init

# Without Docker (local PostgreSQL)
DB_PASSWORD=your_password npm run db:init
```

### Database Commands
```bash
# List tables
npm run db:list

# Add new tables
npm run db:add-table products

# Reset database
npm run db:reset

# Seed demo data
npm run db:seed:roles
```

## 🔍 Troubleshooting

### Common Issues

#### Jenkins Won't Start
```bash
# Check if port 8081 is available
netstat -an | grep 8081

# Check Docker logs
docker logs datadrip-jenkins

# Restart Jenkins
npm run jenkins:down
npm run jenkins:up
```

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test database connection
docker exec -it datadrip-postgres-1 psql -U postgres -d datadrip -c "SELECT NOW();"
```

#### Plugin Installation Fails
```bash
# Check Jenkins logs
npm run jenkins:logs

# Try manual plugin installation
docker exec -it datadrip-jenkins bash -c "
  curl -fsSL http://localhost:8080/jnlpJars/jenkins-cli.jar -o jenkins-cli.jar
  java -jar jenkins-cli.jar -s http://localhost:8080 install-plugin workflow-aggregator
"
```

### Port Conflicts

If you have port conflicts:

#### Jenkins Port (8081)
```bash
# Check what's using port 8081
lsof -i :8081

# Kill the process or change port in docker-compose.yml
```

#### Database Port (5432)
```bash
# Check what's using port 5432
lsof -i :5432

# Stop local PostgreSQL if running
brew services stop postgresql@15
```

## 📁 Project Structure

```
datadrip/
├── app/                    # Next.js application
├── scripts/               # Setup and utility scripts
│   ├── setup-jenkins-complete.sh  # Complete Jenkins setup
│   ├── install-jenkins-plugins.sh # Plugin installation
│   └── init-db.js         # Database initialization
├── docker-compose.yml     # Main Docker setup
├── Jenkinsfile           # CI/CD pipeline definition
├── package.json          # Dependencies and scripts
└── README.md             # Project documentation
```

## 🎯 Available Scripts

### Jenkins
```bash
npm run jenkins:up              # Start Jenkins
npm run jenkins:down            # Stop Jenkins
npm run jenkins:setup:complete  # Complete setup (new device)
npm run jenkins:plugins         # Install plugins
npm run jenkins:logs            # View logs
```

### Database
```bash
npm run db:init          # Initialize database
npm run db:reset         # Reset database
npm run db:list          # List tables
npm run db:add-table     # Add new table
npm run db:seed:roles    # Seed demo data
```

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

## 🚀 Next Steps

After setup is complete:

1. **Create your first Pipeline job** in Jenkins
2. **Set up GitHub integration** (if using Git)
3. **Configure deployment** to Railway
4. **Add more plugins** as needed
5. **Customize the pipeline** in `Jenkinsfile`

## 📚 Additional Resources

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `npm run jenkins:logs`
2. Verify all services are running: `docker ps`
3. Check port availability: `netstat -an | grep 8081`
4. Review this documentation
5. Check the main `README.md` for additional information

Happy coding! 🎉
