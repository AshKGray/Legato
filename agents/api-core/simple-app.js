const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock user data for testing
const mockUsers = [];
let userIdCounter = 1;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Legato API is running'
  });
});

// Mock registration endpoint
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username, email, and password are required'
    });
  }

  // Check if user already exists
  const existingUser = mockUsers.find(u => u.email === email || u.username === username);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'User with this email or username already exists'
    });
  }

  // Create new user
  const newUser = {
    id: userIdCounter++,
    username,
    email,
    followerCount: 0,
    followingCount: 0,
    totalLikes: 0,
    createdAt: new Date().toISOString()
  };

  mockUsers.push({ ...newUser, password }); // Store password separately in real app

  // Return user data and mock token
  res.json({
    success: true,
    data: {
      user: newUser,
      token: `mock_token_${newUser.id}_${Date.now()}`
    }
  });
});

// Mock login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  // Find user
  const user = mockUsers.find(u => u.email === email);
  if (!user || user.password !== password) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password'
    });
  }

  // Return user data without password
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    data: {
      user: userWithoutPassword,
      token: `mock_token_${user.id}_${Date.now()}`
    }
  });
});

// Mock logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Something went wrong!' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found' 
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Legato API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Ready for authentication requests`);
});

module.exports = app; 