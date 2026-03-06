#!/usr/bin/env node
'use strict';

/**
 * Generates src/algolia-config.js from .env at build time.
 * Keeps credentials out of source control while making them available to the app.
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const configPath = path.join(__dirname, '..', 'src', 'algolia-config.js');

let appId = process.env.VITE_ALGOLIA_APP_ID;
let apiKey = process.env.VITE_ALGOLIA_API_KEY;

// Load from .env file if not in process.env
if ((!appId || !apiKey) && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^VITE_ALGOLIA_APP_ID=(.+)$/);
    if (match) appId = match[1].trim();
    const keyMatch = line.match(/^VITE_ALGOLIA_API_KEY=(.+)$/);
    if (keyMatch) apiKey = keyMatch[1].trim();
  }
}

if (!appId || !apiKey) {
  console.error('Error: VITE_ALGOLIA_APP_ID and VITE_ALGOLIA_API_KEY must be set in .env');
  console.error('Copy .env.example to .env and add your Algolia credentials.');
  process.exit(1);
}

const config = `// Auto-generated from .env at build time - do not edit
// This file is in .gitignore
export const ALGOLIA_APP_ID = ${JSON.stringify(appId)};
export const ALGOLIA_API_KEY = ${JSON.stringify(apiKey)};
`;

fs.writeFileSync(configPath, config);
console.log('Generated src/algolia-config.js from .env');
