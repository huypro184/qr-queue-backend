const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { specs, swaggerUi } = require('./config/swagger');

// Import database connection
const { connectDB } = require('./config/database');

// Import routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
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

app.all('*', (req, res) => {
  throw new Error('Route not found');
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}`);
  console.log(`Documentation: http://localhost:${PORT}/api-docs`);
});
