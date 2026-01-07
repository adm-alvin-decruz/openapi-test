#!/usr/bin/env node
/**
 * Generate static OpenAPI JSON file
 *
 * Usage: node scripts/generate-swagger.js
 * Output: openapi.json in project root and docs folder (for GitHub Pages)
 */

const fs = require('fs');
const path = require('path');
const swaggerSpec = require('../src/config/swaggerConfig');

const jsonContent = JSON.stringify(swaggerSpec, null, 2);

// Output to project root
const rootPath = path.join(__dirname, '..', 'openapi.json');
fs.writeFileSync(rootPath, jsonContent);

// Output to docs folder (for GitHub Pages)
const docsPath = path.join(__dirname, '..', 'docs', 'openapi.json');
fs.writeFileSync(docsPath, jsonContent);

console.log('OpenAPI specification generated:');
console.log(`  - ${rootPath}`);
console.log(`  - ${docsPath}`);
console.log(`Total paths: ${Object.keys(swaggerSpec.paths || {}).length}`);
console.log(`Total schemas: ${Object.keys(swaggerSpec.components?.schemas || {}).length}`);
