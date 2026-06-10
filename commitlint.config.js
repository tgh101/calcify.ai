module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce scope usage (optional but recommended)
    'scope-empty': [1, 'never'],  // warn if no scope

    // Max subject length
    'header-max-length': [2, 'always', 100],

    // Allowed types
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New feature
        'fix',       // Bug fix
        'docs',      // Documentation only
        'style',     // Formatting, missing semi-colons — no logic change
        'refactor',  // Code change, not feat or fix
        'perf',      // Performance improvement
        'test',      // Adding/fixing tests
        'build',     // Build system or external dependency
        'ci',        // CI configuration
        'chore',     // Other changes that don't modify src or test
        'revert',    // Reverts a previous commit
      ],
    ],

    // No uppercase in subject
    'subject-case': [2, 'always', 'lower-case'],

    // No period at end of subject
    'subject-full-stop': [2, 'never', '.'],
  },
};
