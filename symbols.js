// extracted from
// https://github.com/mochajs/mocha/blob/master/lib/reporters/base.js
// TODO make a single package
var symbols = {
  ok: '✓',
  err: '✖',
  dot: '․'
};

// With node.js on Windows: use symbols available in terminal default fonts
if ('win32' == process.platform) {
  symbols.ok = '\u221A';
  symbols.err = '\u00D7';
  symbols.dot = '.';
}

exports = module.exports = symbols;
