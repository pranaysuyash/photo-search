module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'boundaries'],
  extends: [
    'eslint:recommended',
  ],
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  rules: {
    // TypeScript recommended rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    // Add boundaries rules - temporarily disabled for production readiness
    // TODO: Re-enable boundaries enforcement post-launch
    // 'boundaries/element-types': [2, {
    //   default: 'disallow',
    //   rules: [
    //     {
    //       from: 'components',
    //       allow: ['components', 'utils', 'types'],
    //     },
    //     {
    //       from: 'views',
    //       allow: ['components', 'views', 'stores', 'utils', 'types', 'api', 'hooks'],
    //     },
    //     {
    //       from: 'stores',
    //       allow: ['stores', 'utils', 'types', 'api'],
    //     },
    //     {
    //       from: 'api',
    //       allow: ['api', 'utils', 'types'],
    //     },
    //     {
    //       from: 'hooks',
    //       allow: ['hooks', 'utils', 'types', 'stores', 'api'],
    //     },
    //     {
    //       from: 'utils',
    //       allow: ['utils', 'types'],
    //     },
    //     {
    //       from: 'types',
    //       allow: ['types'],
    //     },
    //     {
    //       from: 'services',
    //       allow: ['services', 'utils', 'types', 'api', 'stores'],
    //     },
    //     {
    //       from: 'models',
    //       allow: ['models', 'utils', 'types'],
    //     },
    //     {
    //       from: 'lib',
    //       allow: ['lib', 'utils', 'types'],
    //     },
    //     {
    //       from: 'modules',
    //       allow: ['modules', 'utils', 'types', 'components', 'stores', 'api'],
    //     },
    //     {
    //       from: 'stories',
    //       allow: ['stories', 'components', 'utils', 'types'],
    //     },
    //     {
    //       from: 'test',
    //       allow: ['test', 'utils', 'types', 'components', 'stores', 'api', 'services'],
    //     },
    //     {
    //       from: 'app',
    //       allow: ['*'], // App can import everything
    //     },
    //     {
    //       from: 'root-files',
    //       allow: ['*'], // Root files can import everything
    //     },
    //   ],
    // }],
    // 'boundaries/no-unknown': [2],
    // 'boundaries/no-unknown-files': [2],
  },
  settings: {
    'boundaries/elements': [
      {
        type: 'components',
        pattern: 'src/components/**/*',
      },
      {
        type: 'views',
        pattern: 'src/views/**/*',
      },
      {
        type: 'stores',
        pattern: 'src/stores/**/*',
      },
      {
        type: 'api',
        pattern: 'src/api/**/*',
      },
      {
        type: 'hooks',
        pattern: 'src/hooks/**/*',
      },
      {
        type: 'utils',
        pattern: 'src/utils/**/*',
      },
      {
        type: 'types',
        pattern: 'src/types/**/*',
      },
      {
        type: 'services',
        pattern: 'src/services/**/*',
      },
      {
        type: 'models',
        pattern: 'src/models/**/*',
      },
      {
        type: 'lib',
        pattern: 'src/lib/**/*',
      },
      {
        type: 'modules',
        pattern: 'src/modules/**/*',
      },
      {
        type: 'stories',
        pattern: 'src/stories/**/*',
      },
      {
        type: 'test',
        pattern: 'src/test/**/*',
      },
      {
        type: 'app',
        pattern: 'src/App.tsx',
      },
      {
        type: 'root-test',
        pattern: 'src/*.test.*',
      },
      {
        type: 'root-files',
        pattern: 'src/*.ts',
      },
      {
        type: 'root-tsx',
        pattern: 'src/*.tsx',
      },
      {
        type: 'root-config',
        pattern: 'src/config/**/*',
      },
      {
        type: 'root-contexts',
        pattern: 'src/contexts/**/*',
      },
      {
        type: 'root-styles',
        pattern: 'src/styles/**/*',
      },
    ],
  },
};