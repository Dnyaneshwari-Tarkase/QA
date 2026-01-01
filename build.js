#!/usr/bin/env node
// Simple wrapper to run vite build using node directly
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const vitePath = join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
const args = process.argv.slice(2);

const child = spawn('node', [vitePath, 'build', ...args], {
  stdio: 'inherit',
  shell: false,
});

child.on('error', (error) => {
  console.error('Error running vite:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

