module.exports = {
	devServer: {
		host: '0.0.0.0',
		disableHostCheck: true,
	},
	chainWebpack: config => {
		config.module.rule('schema').test(/\.schema$/).use('json-loader').loader('json-loader').end();
	},
};
