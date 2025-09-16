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

## Railway Deployment

### Prerequisites
- Railway account
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
- **app**: Next.js application (port 3000)
- **postgres**: PostgreSQL database (port 5432)
- **volumes**: Persistent data storage

### Syncing Code Changes to Docker

Due to Windows Docker limitations with file watching, code changes require manual syncing:

#### Method 1: Restart Container (Recommended)
```bash
# Stop and restart to sync all changes
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

#### Method 2: Rebuild Container (For Major Changes)
```bash
# Rebuild and restart (takes longer but ensures everything is fresh)
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up --build -d
```

#### Method 3: Manual Browser Refresh (Quick Changes)
- Make your code changes
- Refresh the browser manually
- Changes will be reflected (volume mounting works)

**Note:** Volume mounting works correctly, but Next.js file watching doesn't detect changes on Windows Docker. Restarting the container ensures all changes are properly synced.

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

# Database
npm run db:init          # Initialize database
npm run db:reset         # Reset database
npm run db:list          # List all tables
npm run db:add-table     # Add new table

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
│   └── init-db.js         # Database initialization script
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
