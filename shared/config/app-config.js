// shared/config/app-config.js

module.exports = {
  db: {
    database: 'legato_dev',
    username: 'developer',
    password: 'devpass123',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: false,
  },
};