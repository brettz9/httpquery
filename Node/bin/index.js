#!/usr/bin/env node

import http from 'http';
import httpquery from '../index.js';

const port = process.argv[2] ?? 1337;
const host = process.argv[3] ?? '127.0.0.1';

http.createServer(httpquery()).listen(port, host);

// eslint-disable-next-line no-console -- CLI
console.log(`Server running at ${host}:${port}/`);
