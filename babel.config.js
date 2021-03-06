const BABEL_ENV = process.env.BABEL_ENV || ''
const isDev = BABEL_ENV.includes('dev')
const isRawModule = BABEL_ENV.includes('module')

module.exports = {
  presets: [
    [ '@babel/env', { targets: { node: '8.8' }, modules: isRawModule ? false : 'commonjs' } ]
  ],
  plugins: [
    [ '@babel/proposal-class-properties' ],
    !isRawModule && [ '@babel/plugin-proposal-object-rest-spread', { loose: true, useBuiltIns: true } ],
    [ 'module-resolver', { root: [ './' ], alias: isRawModule ? undefined : { 'dr-js/module/(.+)': 'dr-js/library/', 'dr-server/module/(.+)': 'dr-server/library/' } } ],
    [ 'minify-replace', { replacements: [ { identifierName: '__DEV__', replacement: { type: 'booleanLiteral', value: isDev } } ] } ]
  ].filter(Boolean),
  comments: false
}
