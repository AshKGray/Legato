const express = require('express');
const path = require('path');

const app = express();

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve index.html for any route (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`🌐 Legato Frontend running at http://localhost:${PORT}`);
  console.log('📝 Note: API calls will fail until backend is fixed');
});