var gulp = require('gulp'),
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
    del = require('del'),
    uglify = require('gulp-uglify');

// We need to make sure that 'swank.js' is the first file in the concat stream.
// Then we can include all other JS files to the stream.
var sources = ['src/swank-main.js','src/**/*.js'];

gulp.task('clean', function() {
  del(['dist/*']);
});

gulp.task('build', ['clean'], function() {
  gulp.src(sources)
    .pipe(concat('swank.js'))
    .pipe(gulp.dest('dist/'))
    .pipe(rename('swank.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist/'));
});

gulp.task('dev', function() {
  gulp.watch(sources, ['build']);
});
