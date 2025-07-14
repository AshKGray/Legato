const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../database/models');

async function testAuth() {
  try {
    console.log('🧪 Testing authentication...');

    // Test user creation
    const passwordHash = await bcrypt.hash('testpass123', 10);
    console.log('✅ Password hashed successfully');

    // Try to create a user
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      passwordHash,
      displayName: 'Test User',
      skills: ['vocals'],
      genres: ['pop'],
    });

    console.log('✅ User created:', {
      id: user.id,
      username: user.username,
      email: user.email
    });

    // Test JWT token generation
    const token = jwt.sign({ id: user.id }, 'dev_jwt_secret', { expiresIn: '24h' });
    console.log('✅ JWT token generated:', token.substring(0, 50) + '...');

    // Test password verification
    const isValid = await bcrypt.compare('testpass123', user.passwordHash);
    console.log('✅ Password verification:', isValid);

    // Clean up
    await user.destroy();
    console.log('✅ Test user cleaned up');

    console.log('🎉 All authentication tests passed!');
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
  }
}

testAuth(); 