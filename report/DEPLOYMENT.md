# Deployment Guide

This guide covers multiple deployment options for the Visual SQL Query Builder application using local PostgreSQL.

## Quick Deployment Options

### 1. Local Development Setup (Recommended)

**Automated Setup:**
```bash
# Clone repository
git clone <repository-url>
cd visual-query-builder

# Run automated setup
./setup-local.sh
```

**Manual Setup:**
```bash
# Install PostgreSQL locally
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql postgresql-contrib

# Create database
createdb querybuilder

# Copy environment configuration
cp .env.example .env

# Install dependencies and start
npm install
npm run db:push
npm run dev
```

### 2. Docker Deployment with Local PostgreSQL

**With Docker Compose (Includes PostgreSQL):**
```bash
# Start PostgreSQL and application
docker-compose up -d

# Check status
docker-compose ps
```

**Single Container (External PostgreSQL):**
```bash
# Build the image
docker build -t visual-query-builder .

# Run with local PostgreSQL
docker run -d \
  --name query-builder \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/querybuilder" \
  -e NODE_ENV=production \
  visual-query-builder
```

### 2. Manual Deployment

**Prerequisites:**
- Node.js 20+
- PostgreSQL database
- Environment variables configured

**Steps:**
```bash
# Clone and install
git clone <repository>
cd visual-query-builder
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build and start
npm run build
npm run db:push
npm start
```

### 3. Kubernetes Deployment

```bash
# Update deployment.yaml with your configuration
kubectl apply -f deployment.yaml

# Check deployment status
kubectl get pods -l app=visual-query-builder
kubectl get services
```

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PGHOST` | Database host | `localhost` |
| `PGPORT` | Database port | `5432` |
| `PGDATABASE` | Database name | `querybuilder` |
| `PGUSER` | Database username | `postgres` |
| `PGPASSWORD` | Database password | `secretpassword` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `5000` |

## Database Setup

### Create Database Schema

The application uses Drizzle ORM for database management:

```bash
# Push schema to database
npm run db:push
```

### Manual Schema Setup

If automatic schema setup fails, run these SQL commands:

```sql
-- Create sample tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2),
  category_id INTEGER REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  price DECIMAL(10,2)
);

CREATE TABLE saved_queries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  query_config TEXT NOT NULL,
  generated_sql TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Considerations

### Production Security Checklist

- [ ] Use HTTPS in production
- [ ] Configure proper CORS headers
- [ ] Use environment variables for secrets
- [ ] Enable SSL for database connections
- [ ] Implement rate limiting
- [ ] Use reverse proxy (nginx) for static files
- [ ] Regular security updates

### SSL Database Connection

For production databases, enable SSL:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

## Monitoring and Health Checks

### Health Check Endpoint

The application provides a health check at:
```
GET /api/schema/tables
```

### Logging

Application logs include:
- API request/response logs
- Database connection status
- Query execution metrics
- Error tracking

## Troubleshooting

### Common Issues

**Database Connection Failed:**
- Verify DATABASE_URL format
- Check network connectivity
- Confirm database exists
- Validate credentials

**Build Failures:**
- Ensure Node.js 20+ is installed
- Clear node_modules and reinstall
- Check for TypeScript errors

**Port Already in Use:**
- Change PORT environment variable
- Kill existing processes on port 5000

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development npm start
```

## Performance Optimization

### Production Optimizations

1. **Static File Serving**: Use nginx for static assets
2. **Database Connection Pooling**: Configured automatically
3. **Gzip Compression**: Enable in reverse proxy
4. **Caching Headers**: Set appropriate cache policies

### Scaling

For high-traffic deployments:
- Use multiple application instances
- Implement database read replicas
- Use CDN for static assets
- Configure load balancing

## Backup and Recovery

### Database Backup

```bash
# Create backup
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE > backup.sql

# Restore backup
psql -h $PGHOST -U $PGUSER -d $PGDATABASE < backup.sql
```

### Application Data

Backup saved queries and user configurations through the API or database directly.

## Support

For deployment issues:
1. Check application logs
2. Verify environment configuration
3. Test database connectivity
4. Review security settings

The application is designed to be deployment-agnostic and works with:
- AWS (ECS, EKS, EC2)
- Google Cloud Platform (GKE, Compute Engine)
- Azure (AKS, Container Instances)
- DigitalOcean (App Platform, Droplets)
- Any Docker-compatible platform