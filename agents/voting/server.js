const DemocraticVotingOrchestrator = require('./index');
const path = require('path');
const { createClient } = require('redis');

// Adjust the path to your database models as needed
const databaseModels = require('../database/models');

// Create Redis client
const redisClient = createClient();
redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();

  const orchestrator = new DemocraticVotingOrchestrator({
    port: 3010, // or any free port
    antiGamingConfig: { redisClient }
  });

  orchestrator.initialize(databaseModels)
    .then(() => orchestrator.start())
    .catch((err) => {
      console.error('Failed to start voting system:', err);
      process.exit(1);
    });
})();

// Check if something else is using port 3006
const { exec } = require('child_process');
exec('lsof -i :3006', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});