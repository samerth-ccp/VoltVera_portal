#!/usr/bin/env node

// Production startup script for Replit deployment
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set NODE_ENV to production if not already set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Import and start the server
import('./dist/index.js')
  .then(() => {
    console.log('Production server started successfully');
  })
  .catch((error) => {
    console.error('Failed to start production server:', error);
    process.exit(1);
  });