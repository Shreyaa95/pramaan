require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const { seedInitialData } = require('./services/seedTemplates');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads & certificates
const uploadsDir = path.join(__dirname, 'uploads');
const certsDir = path.join(__dirname, 'generated_certificates');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));
app.use('/generated_certificates', express.static(certsDir));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/recipients', require('./routes/recipients'));
app.use('/api/datasource', require('./routes/datasource'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/email', require('./routes/email'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'PRAMAAN Certificate Automation',
    isUsingMongo: db.isUsingMongo(),
    timestamp: new Date().toISOString()
  });
});

// Serve frontend production build if available
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/generated_certificates')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
async function startServer() {
  try {
    await db.initDatabase(process.env.MONGODB_URI);
    await seedInitialData();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`  PRAMAAN Engine running on http://localhost:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Primary DB: ${db.isUsingMongo() ? 'MongoDB' : 'Persistent Local Datastore'}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start PRAMAAN server:', err);
    process.exit(1);
  }
}

startServer();
