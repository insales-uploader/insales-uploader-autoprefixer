'use strict';
const fancyLog = require('fancy-log');
const PluginError = require('plugin-error');
const through = require('through2');
const applySourceMap = require('vinyl-sourcemaps-apply');
const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const syntax = require('postcss-scss');

module.exports = opts => {
  return through.obj((file, enc, cb) => {
    if (file.isNull()) {
      cb(null, file);
      return;
    }

    if (file.isStream()) {
      cb(new PluginError('gulp-autoprefixer', 'Streaming not supported'));
      return;
    }
    let content = file.contents.toString();

    // Если файл имеет структуру #= require animate.css
    if (/#=/g.test(content) || /\/=/g.test(content)) {
      setImmediate(cb, null, file);
      return;
    }

    postcss(autoprefixer(opts)).process(content, {
      map: false,
      syntax: syntax,
      from: file.path,
      to: file.path
    }).then(res => {
      file.contents = Buffer.from(res.css);
      file._contents = Buffer.from(res.css);

      const warnings = res.warnings();

      if (warnings.length > 0) {
        fancyLog('gulp-autoprefixer:', '\n  ' + warnings.join('\n  '));
      }

      setImmediate(cb, null, file);
    }).catch(err => {
      const cssError = err.name === 'CssSyntaxError';

      if (cssError) {
        err.message += err.showSourceCode();
      }

      // Prevent stream unhandled exception from being suppressed by Promise
      setImmediate(cb, new PluginError('gulp-autoprefixer', err, {
        fileName: file.path,
        showStack: !cssError
      }));
    });
  });
};
