// shared/config/app-config.js
require('dotenv').config();

module.exports = {
  database: {
    host: 'localhost',
    port: 5432,
    database: 'legato_dev',
    username: 'developer', 
    password: 'devpass123',
    dialect: 'postgres',
    // ... rest of config
  }
};