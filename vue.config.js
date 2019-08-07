const child_process = require('child_process');
const fs = require('fs');
const pathlib = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const PrerenderSPAPlugin = require('prerender-spa-plugin');

//TODO Self-contained builds still generate the other outputs, even though they're unneeded
const selfContained = (process.env.SELF_CONTAINED !== undefined);

module.exports = {
	productionSourceMap: false,
	devServer: {
		host: '0.0.0.0',
		disableHostCheck: true,
	},
	outputDir: selfContained ? 'dist-sc' : 'dist',
	publicPath: '',

	configureWebpack: config => {
		if(config.mode == 'development' && selfContained) {
			throw new Error("Can't build self-contained file in dev mode");
		}

		if(config.mode == 'production' && !selfContained) {
			config.plugins.push(
				{
					apply: compiler => {
						compiler.hooks.afterEmit.tapPromise('LicenseGen', () => new Promise(resolve => {
							const ws = fs.createWriteStream(pathlib.join(compiler.outputPath, 'licenses.txt'));
							const proc = child_process.spawn('yarn licenses generate-disclaimer', { cwd: compiler.options.context, shell: true });
							proc.stdout.pipe(ws);
							proc.on('exit', resolve);
						}));
					}
				},
				new PrerenderSPAPlugin({
					staticDir: pathlib.join(__dirname, 'dist'),
					// outputDir: pathlib.join(__dirname, 'ssr'),
					routes: [ '/' ],
				}),
			);
		}
		if(selfContained) {
			config.plugins.push(
				new HtmlWebpackPlugin({
					template: 'public/index.html',  //template file to embed the source
					inlineSource: '.(js|css)$' // embed all javascript and css inline
				}),
				new HtmlWebpackInlineSourcePlugin(),
			);
		}
	},

	chainWebpack: config => {
		config.module.rule('schema').test(/\.schema$/).use('json-loader').loader('json-loader').end();
		if(selfContained) {
			config.module.rule('fonts').use('url-loader').tap(opts => {
				opts.limit = undefined;
				return opts;
			});
		}
		config.plugin('define').tap(args => {
			const gitDesc = child_process.execSync('git describe --all --long --abbrev=40 --dirty', { cwd: config.store.get('context'), encoding: 'utf8' });
			args[0].BUILD_VERSION = JSON.stringify(gitDesc.replace(/^heads\//, '').trim());
			args[0].BUILD_DATE = JSON.stringify(new Date().toGMTString());
			args[0].HAS_LICENSES = JSON.stringify(config.mode == 'production' && !selfContained);
			return args;
		});
	},
};
