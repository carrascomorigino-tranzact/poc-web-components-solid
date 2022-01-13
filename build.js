const { build } = require('esbuild');
const { solidPlugin } = require('esbuild-plugin-solid');

build({
  entryPoints: ['./components/Counter.jsx'],
  bundle: true,
  outfile: 'out.js',
  plugins: [solidPlugin()],
}).catch(() => process.exit(1))