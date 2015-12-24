'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var inject = require('gulp-inject');
var minify = require('gulp-minify');

var DEST = 'dist/';

gulp.task('build-mixins' , function(){
    return gulp.src(['./src/mixins/*.js'])
        .pipe(concat('mixins.js'))
        .pipe(gulp.dest(DEST));


});

gulp.task('build-core',['build-mixins'] ,function(cb){
    return gulp.src('./src/core.js')
        .pipe(inject(gulp.src(['./dist/mixins.js']),{
            starttag: '/** MIXIN-INJECT:START **/',
            endtag: '/** MIXIN-INJECT:END **/',
            transform: function(filePath,file){
                return file.contents.toString('utf8');
            }

        }))
        .pipe(rename("apollo-vue.js"))
        .pipe(gulp.dest('./dist'));

});

gulp.task('minify',['build-core'] ,function() {
    return gulp.src('./dist/apollo-vue.js')
        .pipe(uglify())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest(DEST));

});

gulp.task('build',['build-mixins','build-core','minify']);
gulp.task('default', ['build'] );