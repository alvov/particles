var gulp = require('gulp');
var browserify = require('browserify');
var tsify = require('tsify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

gulp.task('js', function() {
    var b = browserify()
        .add('./node_modules/tsify/node_modules/typescript/bin/lib.es6.d.ts')
        .add('./js/main.ts')
        .plugin('tsify', { target: 'es5' });

    return b.bundle()
        .pipe(source('bundle.js'))
        .pipe(buffer())
        .pipe(gulp.dest('./'));
});

gulp.task('watch', ['js'], function() {
    gulp.watch('./js/**/*.ts', ['js']);
});
