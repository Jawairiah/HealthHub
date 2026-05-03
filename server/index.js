const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Sequelize } = require('sequelize');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'medicare',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false
  }
);

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

testConnection();

// Import routes
const userRoutes = require('./routes/users');
const doctorRoutes = require('./routes/doctors');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Medicare API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;