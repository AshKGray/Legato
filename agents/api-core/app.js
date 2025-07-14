const express = require('express');
const cors = require('cors');
const path = require('path');

// Import database and models
const { sequelize } = require('../database/models');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
// Temporarily disable routes with file upload issues
// const songRoutes = require('./routes/songs');
// const collaborationRoutes = require('./routes/collaborations');
// const voteRoutes = require('./routes/votes');
// const commentRoutes = require('./routes/comments');
// const followRoutes = require('./routes/follows');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/songs', songRoutes);
// app.use('/api/collaborations', collaborationRoutes);
// app.use('/api/votes', voteRoutes);
// app.use('/api/comments', commentRoutes);
// app.use('/api/follows', followRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app; 