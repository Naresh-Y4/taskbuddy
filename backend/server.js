require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

const app = express();
const PORT = 3001;

// Force HTTP
app.set('trust proxy', false);

app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// ✅ Serve Frontend
app.use(express.static(path.join(__dirname, '../frontend')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ✅ Use http.createServer explicitly
const server = http.createServer(app);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`
  ╔══════════════════════════════════╗
  ║  🚀 TaskBuddy running!           ║
  ║  http://127.0.0.1:${PORT}           ║
  ╚══════════════════════════════════╝
  `);
});