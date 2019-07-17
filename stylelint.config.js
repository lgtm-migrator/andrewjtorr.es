'use strict'

module.exports = {
  plugins: ['stylelint-order'],
  extends: [
    'stylelint-config-standard',
    'stylelint-config-styled-components',
    'stylelint-config-prettier',
  ],
  processors: ['stylelint-processor-styled-components'],
  rules: {
    'declaration-empty-line-before': [
      'never',
      { ignore: ['after-declaration'] },
    ],
    'order/order': [
      'custom-properties',
      'dollar-variables',
      'declarations',
      'rules',
      'at-rules',
    ],
  },
}
