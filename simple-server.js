const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

// Basic API endpoints for testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mock auth endpoints for frontend testing
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock login logic
  if (email && password) {
    res.json({
      token: 'mock_jwt_token_123',
      user: {
        id: 1,
        name: 'Test User',
        email: email
      }
    });
  } else {
    res.status(400).json({ error: 'Email and password required' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  
  // Mock registration logic
  if (name && email && password) {
    res.json({
      token: 'mock_jwt_token_123',
      user: {
        id: 1,
        name: name,
        email: email
      }
    });
  } else {
    res.status(400).json({ error: 'Name, email and password required' });
  }
});

// Mock songs endpoints
app.get('/api/songs/trending', (req, res) => {
  res.json([
    {
      id: 1,
      title: 'Demo Song 1',
      genre: 'Pop',
      User: { name: 'Artist 1' },
      votesCount: 42,
      collaborationsCount: 5
    },
    {
      id: 2,
      title: 'Demo Song 2',
      genre: 'Rock',
      User: { name: 'Artist 2' },
      votesCount: 38,
      collaborationsCount: 3
    }
  ]);
});

app.get('/api/users/:id/songs', (req, res) => {
  res.json([
    {
      id: 1,
      title: 'My First Song',
      genre: 'Pop',
      votesCount: 10,
      collaborationsCount: 2
    }
  ]);
});

app.get('/api/users/:id/stats', (req, res) => {
  res.json({
    songsCount: 3,
    collaborationsCount: 7,
    votesReceived: 45
  });
});

app.get('/api/users/:id', (req, res) => {
  res.json({
    id: req.params.id,
    name: 'Test User',
    email: 'test@example.com',
    bio: 'Music enthusiast and collaborator',
    skills: ['vocals', 'guitar']
  });
});

// Serve the main page for any unmatched routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Legato App Server running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;