const { build } = require('esbuild');

const entryFile = 'index.js';

/** @type {import('esbuild').BuildOptions} */
const opts = {
	bundle: true,
	external: [ 'ws' ],
	outdir: 'dist',
	format: 'iife',
	platform: 'browser',
	globalName: 'tmi',
	sourcemap: true,
	sourcesContent: false
};

build({
	entryPoints: { 'tmi': entryFile },
	...opts
});

build({
	entryPoints: { 'tmi.min': entryFile },
	...opts,
	minify: true
});