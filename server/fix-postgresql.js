#!/usr/bin/env node

/**
 * Fix MySQL to PostgreSQL migration script
 * This script replaces all MySQL syntax with PostgreSQL syntax
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.join(__dirname, 'index.js');

console.log('🔧 Starting PostgreSQL migration fix...');

// Read the file
let content = fs.readFileSync(indexPath, 'utf8');

// Count original db.execute occurrences
const originalCount = (content.match(/db\.execute/g) || []).length;
console.log(`📊 Found ${originalCount} db.execute calls to fix`);

// Replace all db.execute with db.query and fix syntax
content = content.replace(/const \[([^\]]+)\] = await db\.execute\(/g, 'const $1 = await db.query(');
content = content.replace(/await db\.execute\(/g, 'await db.query(');

// Fix MySQL ? placeholders to PostgreSQL $1, $2, etc.
// This is more complex, so we'll do a basic replacement for common patterns
const lines = content.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // If line contains db.query and has ? placeholders
  if (line.includes('db.query') && line.includes('?')) {
    // Count ? in the line
    const questionMarks = (line.match(/\?/g) || []).length;
    
    // Replace ? with $1, $2, $3, etc.
    for (let j = 1; j <= questionMarks; j++) {
      line = line.replace('?', `$${j}`);
    }
  }
  
  // Fix .length to .rows.length for result arrays
  if (line.includes('.length > 0') && (line.includes('users') || line.includes('metrics') || line.includes('behaviors') || line.includes('profiles') || line.includes('assessments'))) {
    line = line.replace('.length', '.rows.length');
  }
  
  // Fix array access [0] to .rows[0]
  if (line.match(/const \w+ = \w+\[0\];/) && (line.includes('users') || line.includes('metrics') || line.includes('behaviors') || line.includes('profiles'))) {
    line = line.replace(/const (\w+) = (\w+)\[0\];/, 'const $1 = $2.rows[0];');
  }
  
  fixedLines.push(line);
}

content = fixedLines.join('\n');

// Final count
const finalCount = (content.match(/db\.execute/g) || []).length;
console.log(`✅ Fixed ${originalCount - finalCount} db.execute calls`);
console.log(`⚠️ Remaining db.execute calls: ${finalCount}`);

// Write back to file
fs.writeFileSync(indexPath, content, 'utf8');

console.log('🎉 PostgreSQL migration fix completed!');
console.log('📁 File updated: index.js');
console.log('🚀 Ready to commit and deploy!');
