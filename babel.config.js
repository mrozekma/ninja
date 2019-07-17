module.exports = {
	presets: [
		'@vue/app',
	],
	plugins: [
		["prismjs", {
			"languages": ["json"],
			"plugins": ["line-numbers", "normalize-whitespace"],
			"theme": "okaidia",
			"css": true,
		}],
	],
}
