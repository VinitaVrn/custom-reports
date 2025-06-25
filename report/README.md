# Visual SQL Query Builder

A drag-and-drop visual interface for building SQL queries without writing code. Uses local PostgreSQL with support for connecting to external databases.

## Features

- **Visual Query Building**: Drag-and-drop interface for table selection and column manipulation
- **Local PostgreSQL Database**: Pre-configured with sample data for immediate use
- **External Database Support**: Connect to your own PostgreSQL databases
- **Real-time SQL Generation**: See SQL queries generated as you build them
- **Query Execution**: Execute queries and view results in a tabular format
- **JOIN Operations**: Visual JOIN configuration with relationship detection
- **Subqueries**: Advanced subquery builder for complex queries
- **Query Management**: Save, load, and manage your queries
- **Export Results**: Export query results as CSV files

## Quick Start

### Automated Local Setup (Recommended)

1. Clone the repository
2. Run the setup script:
   ```bash
   ./setup-local.sh
   ```
   This will:
   - Install PostgreSQL if needed
   - Create the database and user
   - Set up environment variables
   - Install dependencies
   - Initialize the database schema
   - Start the development server

### Using Docker

1. Start with Docker Compose:
   ```bash
   docker-compose up -d
   ```
   This creates a local PostgreSQL instance and the application.

2. Access the application at `http://localhost:5000`

### Manual Installation

1. Install PostgreSQL locally
2. Create database:
   ```bash
   createdb querybuilder
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Set up database schema:
   ```bash
   npm run db:push
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

### Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PGHOST` | PostgreSQL host | localhost |
| `PGPORT` | PostgreSQL port | 5432 |
| `PGDATABASE` | Database name | querybuilder |
| `PGUSER` | Database user | postgres |
| `PGPASSWORD` | Database password | Required |
| `NODE_ENV` | Environment mode | development |
| `PORT` | Application port | 5000 |

## Database Connection

The application supports connecting to external PostgreSQL databases:

1. Use the "Database Connection" panel in the left sidebar
2. Enter your database credentials
3. Test the connection before connecting
4. Switch between sample data and your own database seamlessly

## API Endpoints

### Schema Endpoints
- `GET /api/schema/tables` - Get all tables
- `GET /api/schema/tables/:name/columns` - Get table columns

### Query Endpoints
- `POST /api/query/execute` - Execute SQL query
- `POST /api/query/export` - Export results as CSV

### Database Connection Endpoints
- `POST /api/database/test` - Test database connection
- `POST /api/database/connect` - Connect to external database
- `POST /api/database/disconnect` - Disconnect from external database
- `GET /api/database/status` - Get connection status

### Saved Queries Endpoints
- `GET /api/queries` - Get all saved queries
- `POST /api/queries` - Save a new query
- `GET /api/queries/:id` - Get specific query
- `DELETE /api/queries/:id` - Delete a query

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Deployment**: Docker, Docker Compose

## Security Notes

- Use environment variables for database credentials
- Enable SSL for production database connections
- Validate all SQL queries before execution
- Sanitize user inputs to prevent SQL injection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details