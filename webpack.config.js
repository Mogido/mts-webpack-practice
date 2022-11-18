const path = require('path');
const emailTemplatePlugin = require('./plugins/emailTemplatePlugin');

module.exports = {
    entry: '/src/index.pug',
    mode: 'production',
    output: {
        path: path.resolve(__dirname, 'dist/'),
        clean: true
    },
    plugins: [
        new emailTemplatePlugin({
            outputFile: 'main.html'
        }),
    ],
    module: {
        rules: [
            {
                test: /\.pug$/,
                use: [
                    {
                        loader: 'webpack-mjml-loader',
                        options: {
                            validationLevel: 'skip',
                        }
                    },
                    {
                        loader: '@webdiscus/pug-loader',
                        options: {
                            method: 'html',
                        }
                    },
                ]
            },
        ],
    },
};
