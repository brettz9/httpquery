# CHANGES to httpquery

## 0.4.0

- feat: BREAKING: proper CLI parsing; support `debug`, `path`, `cwd` arguments;
  `port` and `host` arguments must now be named
- fix: BREAKING: change default of `Node` to empty string for `path`
- fix: proper content-type for CSS and JavaScript
- test: run in parallel

## 0.3.0

- feat: add `path` argument to getter

## 0.2.0

- feat: switch to native ESM
- feat: add binary
- feat: export getter with `cwd`
- feat: jsonpath(-plus) support
- fix: cheerio issue
- fix: allow calling from root
- refactor: remove bundled `node_modules`
- chore: add linting; add start script; add deps. and devDeps; add
  `.editorconfig`

## 0.0.1

- Initial commit
