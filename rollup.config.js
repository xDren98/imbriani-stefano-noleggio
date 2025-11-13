import resolve from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'admin-main.js',
    output: {
      file: 'dist/admin.bundle.js',
      format: 'esm'
    },
    plugins: [resolve()]
  }
];
