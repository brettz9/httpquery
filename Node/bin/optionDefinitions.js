import {readFileSync} from 'fs';

const pkg = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url))
);

const optionDefinitions = [
  {
    name: 'port', alias: 'p', type: Number,
    description: 'TCP port at which the files will be served. ' +
      '[default: 1337]',
    typeLabel: '{underline PORT}'
  },
  {
    name: 'host', alias: 'a', type: String,
    description: 'The host address at which to listen. ' +
      '[default: "127.0.0.1"]',
    typeLabel: '{underline HOST}'
  },
  {
    name: 'cwd', type: String,
    description: 'The current working directory; defaults to `process.cwd()`',
    typeLabel: '{underline PATH}'
  },
  {
    name: 'path', type: String,
    description: 'The path on top of `cwd`. Defaults to the empty string',
    typeLabel: '{underline PATH}'
  },
  {
    name: 'debug', alias: 'd', type: Boolean,
    description: 'Whether or not to show extra debugging details; not ' +
      'for production'
  }
];

const cliSections = [
  {
    // Add italics: `{italic textToItalicize}`
    content: 'httpquery CLI - ' + pkg.description +
      '\n\nUSAGE: {italic httpquery [OPTIONS] [-p PORT]}'
  },
  {
    optionList: optionDefinitions
  }
];

export {optionDefinitions as definitions, cliSections as sections};
