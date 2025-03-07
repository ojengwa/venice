/**
 * @type {import('prettier').Config}
 */
module.exports = {
  arrowParens: 'always',
  bracketSameLine: true,
  bracketSpacing: false,
  importOrder: [
    '^node:(.+)$',
    '<THIRD_PARTY_MODULES>',
    '^@usevenice/(.+)$',
    '^@/(.+)$',
    '^[./]',
  ],
  importOrderCaseInsensitive: true,
  importOrderGroupNamespaceSpecifiers: true,
  // For now until vscode organize imports supports remove only mode. https://github.com/useVenice/venice/commit/8ef518158278f595e605ac077f9289cd918c448c#r83502651
  // or until vscode organize imports does not move lines with side effects around...
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  jsxSingleQuote: false,
  plugins: [
    // This plugin breaks on makeSyncEngine.ts... So commenting out for now.
    require.resolve('@ianvs/prettier-plugin-sort-imports'),
    require.resolve('prettier-plugin-packagejson'),
    require.resolve('prettier-plugin-tailwindcss'), // needs to come last
  ],
  printWidth: 80,
  quoteProps: 'as-needed',
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  tailwindConfig: './apps/web/tailwind.config.ts',
  trailingComma: 'all',
  useTabs: false,
}
