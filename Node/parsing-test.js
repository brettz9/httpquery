const JSToPeg = require('./JSToPeg'),
  parser = JSToPeg(
    { // Optional configuration object
      semicolons: true,
      indent: 4,
      parserOptions: {
        cache: true,
        trackLineAndColumn: true
      }
    }
  ).buildParser(
    {
      // start: ['(', '"a"', '/', '"b"', ')', '+'] // works
      start: [/[a|b]+/] // works
    }
  ),
  parsed = parser.parse('abba');

console.log(parsed);
