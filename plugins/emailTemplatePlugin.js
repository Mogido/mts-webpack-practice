const { validate } = require('schema-utils');
const fs = require('fs');
const imagemin = require("imagemin");
const imageminPngquant = require("imagemin-pngquant");
const path = require("path");

class emailTemplatePlugin {
    static defaultOptions = {
        outputFile: 'index.html',
    };

    static schema = {
        type: 'object',
        properties: {
            outputFile: {
                type: 'string',
            },
        },
    };

    constructor(options = {}) {
        this.options = { ...emailTemplatePlugin.defaultOptions, ...options };
        validate(emailTemplatePlugin.schema, options, {
            name: 'emailTemplatePlugin',
            baseDataPath: 'options',
        });
    }

    apply(compiler) {
        const pluginName = emailTemplatePlugin.name;
        const { webpack } = compiler;
        const { Compilation } = webpack;
        const { RawSource } = webpack.sources;

        compiler.hooks.thisCompilation.tap(
            pluginName,
            (compilation) => {
                console.log("Compilation object created!");

                compilation.hooks.processAssets.tap(
                    {
                        name: pluginName,
                        stage: Compilation.PROCESS_ASSETS_STAGE_PRE_PROCESS
                    },
                    (assets) => {
                        const template = assets['main.js'].source();
                        const pattern = new RegExp("(\\\\n)|(\\\\)", "g");
                        const fixedTemplate = template.replaceAll(pattern, '');

                        const pureTemplate = this.extractHtml(fixedTemplate, '<!doctype', '");');
                        const images = this.getAttrFromString(pureTemplate, 'img', 'src');

                        this.minifyImages(images);

                        let html = pureTemplate;

                        images.forEach(image => {
                            const img = image.split('/').pop();
                            const imgPath = path.join(__dirname, `../plugins/compressed-images/${img}`);
                            fs.readFile(imgPath, 'base64', (err, data) => {
                                if (err) {
                                    console.error(err);
                                    return;
                                }
                                html = html.replace(image, `data:image/png;base64, ` + data);
                            });
                        });

                        compilation.hooks.afterProcessAssets.tap({
                            stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
                            name: pluginName
                        },() => {
                            compilation.deleteAsset('main.js')
                            compilation.emitAsset(
                                this.options.outputFile,
                                new RawSource(html)
                            );
                        });
                    }
                );
            }
        );
    }

    getAttrFromString(str, node, attr) {
        let result;
        const regex = new RegExp('<' + node + ' .*?' + attr + '="(.*?)"', "gi"),
            res = [];
        while ((result = regex.exec(str))) {
            res.push(result[1]);
        }
        return res;
    };

    extractHtml(str, start, end){
        const startindex = str.indexOf(start);
        const endindex = str.indexOf(end, startindex);
        if (startindex !=-1 && endindex !=-1 &&  endindex  > startindex )
            return str.substring(startindex , endindex )
    };

    minifyImages(images) {
        const imageNames = images.map(img => {
            const imgName = img.split('/').pop();
            return imgName;
        });

        const imagePaths = imageNames.map(img => {
            return path.join(__dirname, `../src/${img}`)
        });

        (async () => {
            const files = await imagemin(imagePaths, {
                destination: path.join(__dirname, '../plugins/compressed-images'),
                plugins: [
                    imageminPngquant({
                        quality: [0.5, 0.6]
                    })
                ]
            });
        })();
    }
}

module.exports = emailTemplatePlugin;
