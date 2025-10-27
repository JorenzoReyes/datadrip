# DataDrip

A Next.js application with PostgreSQL database, containerized with Docker for deployment on Railway.

## Project Overview

This project is deployed to three environments on Railway:
- **Production**: `main` branch → production environment
- **Development**: `development` branch → development environment  
- **Testing**: `test` branch → testing environment

## Local Development

### Prerequisites

#### Option 1: With Docker (Recommended)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)

#### Option 2: Without Docker
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/download/) (v13 or higher)
- npm or yarn

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd datadrip
   ```

2. **Start Docker Desktop** (if not already running)

3. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Initialize the database** (in a new terminal)
   ```bash
   # Set the correct password for your environment
   DB_PASSWORD=postgres npm run db:init
   ```

5. **Access the application**
   - Application: `http://localhost:3000`
   - Health check: `http://localhost:3000/api/health`
   - PostgreSQL: `localhost:5432`

6. **Access the database thru CLI**
   ```bash
   # Connect to database via CLI
   docker exec -it datadrip-postgres-1 psql -U postgres -d datadrip
   ```

### Access Local PostgreSQL (without Docker)

If you are running the local PostgreSQL instance on your machine (default port 5432), you can connect with:

```bash
psql -h localhost -p 5432 -U postgres -d datadrip
```

### Quick Start without Docker

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd datadrip
   npm install
   ```

2. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb datadrip
   
   # Or using psql
   psql -U postgres -c "CREATE DATABASE datadrip;"
   ```

3. **Set environment variables**
   ```bash
   # Copy the example environment file
   cp env.example .env.local
   
   # Edit .env.local with your database credentials
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=datadrip
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

4. **Initialize the database**
   ```bash
   # Set the correct password for your environment
   DB_PASSWORD=your_password npm run db:init
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Application: `http://localhost:3000`
   - Health check: `http://localhost:3000/api/health`

7. **Access the database** (optional)
   ```bash
   # Connect to database via CLI
   psql -h localhost -p 5432 -U postgres -d datadrip
   ```

### Manual Docker Build
```bash
# Build the image
docker build -t datadrip .

docker-compose -f docker-compose.dev.yml up
docker-compose -f docker-compose.dev.yml down

# Run the container
docker run -p 3000:3000 datadrip
```

## Database Setup

### Database Schema
The application uses PostgreSQL with the following tables:
- `users` - User management and authentication


### Database Commands
```bash
# Initialize database (create tables and indexes)
npm run db:init

# Reset database (recreate all tables)
npm run db:reset

# List all tables
npm run db:list

# Add new tables
npm run db:add-table products
npm run db:add-table orders

# Reset all tables except users (drop and recreate)
npm run db:reset-tables

# Seed roles, permissions, demo users, and role mappings
npm run db:seed:roles
```

### Database Access
```bash
# Connect to database via CLI
docker exec -it datadrip-postgres-1 psql -U postgres -d datadrip

# Once connected, use these commands:
\dt                    # List all tables
\d users              # Describe table structure
SELECT * FROM users;   # View table data
\q                    # Exit database
```

### Environment Variables
```bash
# Database Configuration
DB_HOST=localhost          # Database host
DB_PORT=5432              # Database port
DB_NAME=datadrip          # Database name
DB_USER=postgres          # Database username
DB_PASSWORD=password      # Database password

# Application Configuration
NODE_ENV=development      # Environment mode
PORT=3000                # Application port
NEXT_TELEMETRY_DISABLED=1 # Disable Next.js telemetry
```

### Seeding Roles, Permissions, and Demo Users

The project includes a seeding script that populates:
- Roles: `business_owner`, `admin`, `system_admin`
- Permissions: `create`, `read`, `update`, `deactivate`, page/view permissions (dashboard, products, insights, settings, admin pages)
- Demo users: `user@example.com`, `admin@example.com`, `system.admin@example.com`
- Mappings: `user_roles` and `role_permissions`

Run after initializing or resetting the database:
```bash
# Docker (containerized Postgres)
DB_PASSWORD=postgres npm run db:seed:roles

# Local Postgres (adjust password as needed)
DB_PASSWORD=your_password npm run db:seed:roles
```

Notes:
- The script is idempotent: it upserts roles, permissions, and users if they already exist.
- Ensure the database is reachable via the environment variables in your shell or `.env.local` before running.

## Railway Deployment

### Prerequisites
- Railway account
- Railway CLI installed (`npm install -g @railway/cli`)
- PostgreSQL services added to each environment

### Setup PostgreSQL on Railway
1. Go to your Railway dashboard
2. Select each environment (production, development, testing)
3. Click "New Service" → "Database" → "PostgreSQL"
4. Railway will automatically provide connection environment variables

### Automatic Deployment
Each branch automatically deploys to its corresponding environment:
- Push to `main` → deploys to production
- Push to `development` → deploys to development
- Push to `test` → deploys to testing

### Manual Deployment
```bash
# Deploy to Railway
railway up
```

## Railway PostgreSQL Database Management

### Prerequisites for Database Operations
- Railway CLI installed and authenticated (`railway login`)
- Access to your Railway project

### Setting Up Database Connection

#### Method 1: Using Railway Connect (Recommended)
```bash
# Connect to your Railway project
railway link

# Connect to PostgreSQL service via tunnel
railway connect

# This will open a psql session - get connection info
\conninfo
# Note the host, port, database, user, and password from the output
```

#### Method 2: Using DATABASE_URL Environment Variable
```bash
# Get your DATABASE_URL from Railway dashboard or CLI
railway variables --service postgres

# Set it in your local environment (Windows PowerShell)
$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/railway?sslmode=require"

# Or create a .env.tunnel.local file (gitignored)
echo "DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/railway?sslmode=require" > .env.tunnel.local
```

### Populating Railway Database

#### Step 1: Initialize Database Schema
```bash
# Using Railway Connect tunnel (recommended)
railway connect

# Using DATABASE_URL from local machine
npm run db:init
```

#### Step 2: Seed Roles and Permissions
```bash
# Using DATABASE_URL from local machine
npm run db:seed:roles
```

#### Step 3: Verify Database Population
```bash
# List all tables
npm run db:list

# Connect to database to verify data
railway connect
# Then in psql:
\dt                    # List tables
SELECT * FROM roles;   # Check roles
SELECT * FROM permissions; # Check permissions
SELECT * FROM users;   # Check users
```

### Database Management Commands

#### Initialize Database (Create Tables)
```bash
# Local with DATABASE_URL set
npm run db:init

# Or using Railway CLI
railway run --service development npm run db:init
```

#### Reset Database (Recreate All Tables)
```bash
# Local with DATABASE_URL set
npm run db:reset

# Or using Railway CLI
railway run --service development npm run db:reset
```

#### Seed Demo Data
```bash
# Local with DATABASE_URL set
npm run db:seed:roles

# Or using Railway CLI
railway run --service development npm run db:seed:roles
```

#### List Tables
```bash
# Local with DATABASE_URL set
npm run db:list

# Or using Railway CLI
railway run --service development npm run db:list
```

### Troubleshooting Railway Database Connection

#### Common Issues and Solutions

**1. "getaddrinfo ENOTFOUND postgres.railway.internal"**
```bash
# This happens when using railway run locally
# Solution: Use railway connect instead
railway connect
```

**2. "password authentication failed"**
```bash
# Check your credentials
railway variables --service postgres

# Ensure password is URL-encoded if it contains special characters
# Example: password "abc@123" becomes "abc%40123"
```

**3. "self-signed certificate in certificate chain"**
```bash
# Add sslmode=no-verify to your DATABASE_URL
$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/railway?sslmode=no-verify"

# Or set environment variable
$env:PGSSLMODE="no-verify"
```

**4. "Failed to connect using DATABASE_URL"**
```bash
# Verify your DATABASE_URL format
echo $env:DATABASE_URL

# Test connection manually
railway run --service development node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});c.connect().then(()=>c.query('SELECT NOW()').then(r=>{console.log('OK',r.rows[0]);c.end()})).catch(e=>{console.error(e);process.exit(1)})"
```

### Environment-Specific Database Setup

#### Development Environment
```bash
# Switch to development environment
railway environment development

# Initialize database
railway run --service development npm run db:init

# Seed demo data
railway run --service development npm run db:seed:roles
```

#### Production Environment
```bash
# Switch to production environment
railway environment production

# Initialize database (be careful!)
railway run --service production npm run db:init

# Seed roles only (no demo users in production)
railway run --service production npm run db:seed:roles
```

### Database Schema Overview

The Railway PostgreSQL database includes these tables:
- `users` - User accounts and authentication
- `roles` - User roles (business_owner, admin, system_admin)
- `permissions` - System permissions
- `role_permissions` - Role-to-permission mappings
- `user_roles` - User-to-role assignments

### Security Notes

- Never commit `.env.tunnel.local` or actual DATABASE_URL to version control
- Use Railway's built-in environment variable management for production
- Regularly rotate database passwords
- Use least-privilege access for database users

## Docker Configuration

### Multi-stage Build
The Dockerfile uses a multi-stage build process:
1. **deps**: Install production dependencies
2. **builder**: Build the Next.js application
3. **runner**: Create the final production image

### Features
- Node.js 20 Alpine base image for smaller size
- Production-optimized builds
- Security best practices (non-root user)
- Health checks with database connectivity
- Standalone output for optimal containerization
- PostgreSQL integration

### Docker Compose Services

#### Development (`docker-compose.dev.yml`)
- **app**: Next.js application (host port 3000 → container port 3000)
- **postgres**: PostgreSQL database (host port 5433 → container port 5432)
  - Inside Docker network: containers connect to `postgres:5432`
  - From host machine: connect to `localhost:5433`
- **volumes**: Persistent data storage with hot reloading enabled

#### Production (`docker-compose.yml`)
- **app**: Next.js application (host port 3000 → container port 3000)
- **postgres**: PostgreSQL database (host port 5432 → container port 5432)
- **jenkins**: CI/CD automation (host port 8081 → container port 8080)

### Hot Reloading in Docker (Windows)

**✅ Hot reloading is now enabled!** The development setup includes:
- Webpack polling for file change detection
- Volume mounting for instant code sync
- Auto-rebuild on file changes (1-2 second delay)

#### Usage:
```bash
# Start development environment
npm run docker:dev
# or
docker-compose -f docker-compose.dev.yml up

# Make code changes - they will auto-reload!
# Just refresh your browser to see updates

# Stop when done
npm run docker:dev:down
```

#### Port Configuration:
- **Local PostgreSQL**: `localhost:5432` (if installed locally)
- **Docker PostgreSQL (dev)**: `localhost:5433` (mapped from container's 5432)
- **Docker PostgreSQL (prod)**: `localhost:5432`
- **Next.js App**: `localhost:3000`

**Note:** Inside Docker containers, the app connects to `postgres:5432` (internal Docker network). From your host machine, use `localhost:5433` for dev or `localhost:5432` for production.

## Health Check
The application includes a comprehensive health check endpoint at `/api/health` that reports:
- Application status
- Database connectivity
- Environment information
- Timestamp and uptime

## Available Scripts
```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database (Local/Docker)
npm run db:init          # Initialize database
npm run db:reset         # Reset database
npm run db:list          # List all tables
npm run db:add-table     # Add new table
npm run db:reset-tables  # Reset all tables except users
npm run db:seed:roles    # Seed roles, permissions, demo users, mappings

# Database (Railway)
railway run --service development npm run db:init     # Initialize Railway database
railway run --service development npm run db:reset    # Reset Railway database
railway run --service development npm run db:list     # List Railway tables
railway run --service development npm run db:seed:roles # Seed Railway database
railway connect                                        # Connect to Railway PostgreSQL

# Docker Development
npm run docker:dev       # Start development environment with hot reloading
npm run docker:dev:down  # Stop development environment
npm run docker:prod      # Start production environment
npm run docker:prod:down # Stop production environment

# Docker (Legacy)
docker-compose up --build    # Start with Docker
docker-compose down          # Stop Docker services
```

## Troubleshooting

### Common Issues

#### Docker Compose not found
```bash
# Install Docker Compose
brew install docker-compose

# Or use Docker Desktop (includes Docker Compose)
```

#### Database connection failed
```bash
# Check if PostgreSQL is running
docker ps

# Check database logs
docker-compose logs postgres

# Restart services
docker-compose down && docker-compose up --build
```

#### Port already in use
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

#### Module not found errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Getting Help
- Check the health endpoint: `http://localhost:3000/api/health`
- View application logs: `docker-compose logs app`
- View database logs: `docker-compose logs postgres`

## Project Structure
```
datadrip/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions (database, etc.)
│   └── ...                # Next.js pages and layouts
├── scripts/               # Database and utility scripts
│   ├── init-db.js         # Database initialization script
│   ├── migrate-db.js      # Add/list/reset tables utility
│   └── seed-roles.js      # Seed roles, permissions, demo users
├── public/                # Static assets
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Local development setup with PostgreSQL
├── railway.toml          # Railway deployment config
├── env.example           # Environment variables example
├── package.json          # Dependencies and scripts
└── .dockerignore         # Docker build exclusions
```

## Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, PostgreSQL
- **Database**: PostgreSQL with connection pooling
- **Deployment**: Railway with Docker containers
- **Development**: Docker Compose for local development
