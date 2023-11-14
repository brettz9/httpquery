#!/usr/bin/env node

import http from 'http';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

import {cliBasics} from 'command-line-basics';
import getHttpQuery from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = await cliBasics(
  join(__dirname, 'optionDefinitions.js')
);
if (!args) { // cliBasics handled
  process.exit(0);
}

const port = args.port ?? 1337;
const host = args.host ?? '127.0.0.1';

const server = http.createServer(getHttpQuery(args));

server.on('listening', () => {
  // eslint-disable-next-line no-console -- CLI
  console.log(`Server running at ${host}:${port}/`);
});

server.listen(port, host);
