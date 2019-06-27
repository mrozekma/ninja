const child_process = require('child_process');
const fs = require('fs');
const pathlib = require('path');

module.exports = {
	productionSourceMap: false,
	devServer: {
		host: '0.0.0.0',
		disableHostCheck: true,
	},

	configureWebpack: config => {
		if(config.mode == 'production') {
			config.plugins.push({
				apply: compiler => {
					compiler.hooks.afterEmit.tapPromise('LicenseGen', () => new Promise(resolve => {
						const ws = fs.createWriteStream(pathlib.join(compiler.outputPath, 'licenses.txt'));
						const proc = child_process.spawn('yarn licenses generate-disclaimer', { cwd: compiler.options.context, shell: true });
						proc.stdout.pipe(ws);
						proc.on('exit', resolve);
					}));
				}
			});
		}
	},

	chainWebpack: config => {
		config.module.rule('schema').test(/\.schema$/).use('json-loader').loader('json-loader').end();
		config.plugin('define').tap(args => {
			const gitDesc = child_process.execSync('git describe --all --long --abbrev=40 --dirty', { cwd: config.store.get('context'), encoding: 'utf8' });
			args[0].BUILD_VERSION = JSON.stringify(gitDesc.replace(/^heads\//, '').trim());
			args[0].BUILD_DATE = JSON.stringify(new Date().toGMTString());
			return args;
		});
	},
};
