const express = require('express');
const cors = require('cors');
const promClient = require('prom-client');
const logger = require('./utils/logger');
require('dotenv').config();

const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const { User, Project, Service, Ticket, Line, sequelize } = require('./models');


// Import routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const lineRoutes = require('./routes/lineRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

app.use(requestLogger);

const PORT = process.env.PORT;

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL Connected');
    logger.info('Database Name:', sequelize.config.database);

    const tables = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'", 
      { type: sequelize.QueryTypes.SELECT });
    logger.info(`📋 Available tables: ${JSON.stringify(tables)}`);


  } catch (error) {
    logger.error('Error connecting to PostgreSQL:', error.message);
    process.exit(1);
  }
};

// Connect to PostgreSQL
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Prometheus metrics setup
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Swagger documentation
const swaggerDocs = require('./docs/swagger');
swaggerDocs(app);

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Hello World! QR Queue API is running',
    status: 'success',
  });
});

logger.info('Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
logger.info('Current time:', new Date());

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/lines', lineRoutes);
app.use('/api/tickets', ticketRoutes);

app.all('*', (req, res) => {
  throw new Error('Route not found');
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`API URL: http://localhost:${PORT}`);
  logger.info(`Documentation: http://localhost:${PORT}/api-docs`);
});
