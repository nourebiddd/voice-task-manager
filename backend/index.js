require('dotenv').config();
const express = require('express');
const cors = require('cors');

const chatRoute = require('./routes/chat');
const tasksRoute = require('./routes/tasks');
const authRoute = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Allow ALL origins
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoute);
app.use('/api/chat', chatRoute);
app.use('/api/tasks', tasksRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});