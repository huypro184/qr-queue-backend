const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { specs, swaggerUi } = require('./config/swagger');

const { User, Project, Service, Ticket, Line, sequelize } = require('./models');


// Import routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const lineRoutes = require('./routes/lineRoutes');
const ticketRoutes = require('./routes/ticket.Routes');

const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected');
    console.log('Database Name:', sequelize.config.database);

    const tables = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'", 
      { type: sequelize.QueryTypes.SELECT });
    console.log('📋 Available tables:', tables);

  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error.message);
    process.exit(1);
  }
};

// Connect to PostgreSQL
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Hello World! QR Queue API is running',
    status: 'success',
    documentation: `http://localhost:${PORT}/api-docs`
  });
});

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
  console.log(`Server is running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}`);
  console.log(`Documentation: http://localhost:${PORT}/api-docs`);
});
