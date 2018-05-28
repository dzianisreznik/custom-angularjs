const WEBPACK_CONFIG = require('./webpack.testing.config');

module.exports = (config) => {
    config.set({
        files: [
            './node_modules/babel-polyfill/dist/polyfill.js',
            './test/index.js'
        ],
        browsers:['PhantomJS'],
        frameworks: ['jasmine'],
        preprocessors: {
            'test/index.js': [ 'webpack', 'sourcemap']
        },
        plugins: [
            'karma-phantomjs-launcher',
            'karma-jasmine',
            'karma-webpack',
            'karma-coverage',
            'karma-sourcemap-loader'
        ],
        reporters: ['progress', 'coverage'],
        webpack: WEBPACK_CONFIG
    })
};
