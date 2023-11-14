# CHANGES to httpquery

## 0.9.0

- feat: switch to JSDOM
- chore: update deps., devDeps.

## 0.8.3

- fix: allow `engines` higher than 14

## 0.8.2

- fix: allow for absent `next`

## 0.8.1

- fix: backwards logic re: detection of path

## 0.8.0

- feat: support `directory` and `passthroughErrors`
- fix: indicate character may also be missing in error message

## 0.7.0

- feat: Use any `req.jsonData` set by middleware
- refactor: Improve code readability

## 0.6.3

- fix: avoid erring on implicit `index.html` with query params

## 0.6.2

- fix: avoid erring on implicit `index.html` with query params
- fix: allow detection of XHTML with query params

## 0.6.1

- fix: BREAKING: switch to comma-separated `query-server-support` header,
  adding `jsonata`
- fix: proper display of error messages

## 0.6.0

- fix: BREAKING: rename `query-request-bindings` to `query-bindings`

## 0.5.0

- fix: BREAKING/SECURITY: drop insecure `query-request-jsonpath` approach
- refactor: BREAKING: rename `query-request-*` (`xpath1` and `css`) to drop
  `request-`
- feat: adds `query-jsonata` as new JSON querying option

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
