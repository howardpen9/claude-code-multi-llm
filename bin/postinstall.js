#!/usr/bin/env node
// postinstall.js — Show setup instructions after npm install
const path = require('path');
const pkg = require('../package.json');

console.log(`
╔══════════════════════════════════════════════╗
║  ${pkg.name} v${pkg.version}              ║
╚══════════════════════════════════════════════╝

To install commands, run:

  npx claude-code-multi-llm

Or use as a plugin directly:

  claude --plugin-dir ./node_modules/claude-code-multi-llm

Documentation: ${pkg.homepage}
`);
