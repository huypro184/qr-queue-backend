const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Hello World! QR Queue API is running',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});


app.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}`);
});
