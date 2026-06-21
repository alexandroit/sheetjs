const html = require("eslint-plugin-html");

const commonGlobals = {
	ArrayBuffer: "readonly",
	Buffer: "readonly",
	DataView: "readonly",
	Map: "readonly",
	Set: "readonly",
	Uint8Array: "readonly",
	Uint16Array: "readonly",
	Uint32Array: "readonly",
	Int8Array: "readonly",
	Int16Array: "readonly",
	Int32Array: "readonly",
	Float32Array: "readonly",
	Float64Array: "readonly",
	console: "readonly",
	document: "readonly",
	module: "readonly",
	process: "readonly",
	require: "readonly",
	setTimeout: "readonly",
	clearTimeout: "readonly",
	window: "readonly"
};

module.exports = [
	{
		ignores: ["xlsx.js"]
	},
	{
		files: ["**/*.js", "**/*.njs", "**/*.html", "**/*.htm"],
		plugins: {
			html: html
		},
		languageOptions: {
			ecmaVersion: 5,
			sourceType: "script",
			globals: commonGlobals
		},
		linterOptions: {
			reportUnusedDisableDirectives: false
		},
		rules: {
			"comma-style": [2, "last"],
			"comma-dangle": [2, "never"],
			"curly": 0,
			"no-bitwise": 0,
			"no-cond-assign": 1,
			"no-console": 0,
			"no-control-regex": 0,
			"no-empty": 0,
			"no-trailing-spaces": 2,
			"no-unused-vars": 1,
			"no-use-before-define": [1, {
				"functions": false,
				"classes": true,
				"variables": false
			}],
			"no-useless-escape": 0,
			"semi": [2, "always"]
		}
	}
];
