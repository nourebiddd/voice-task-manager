require('dotenv').config();
const express = require('express');
const cors = require('cors');

const chatRoute = require('./routes/chat');
const tasksRoute = require('./routes/tasks');
const authRoute = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Public routes - no auth needed
app.use('/api/auth', authRoute);

// Protected routes
app.use('/api/chat', chatRoute);
app.use('/api/tasks', tasksRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});