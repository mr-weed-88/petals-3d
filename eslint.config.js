import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'

export default [
    { ignores: ['dist'] },
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'better-tailwindcss': betterTailwindcss,
        },
        settings: {
            'better-tailwindcss': {
                // Tailwind v4 is configured in CSS, so the plugin reads the
                // theme from the stylesheet that imports it.
                entryPoint: 'src/App.css',
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,

            // Unused *arguments* are not reported: the codebase passes `(e)` to
            // hundreds of click handlers that ignore it. Counting those as
            // errors buried the genuine undefined references underneath them.
            'no-unused-vars': [
                'error',
                { args: 'none', varsIgnorePattern: '^[A-Z_]' },
            ],

            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],

            // eslint-plugin-react-hooks v7 turns these on as errors. Each one
            // flags a genuine structural problem in the canvas layer, not a
            // style nit — components declared inside other components, and
            // drawing state held in mutable component-body variables. They are
            // described in ARCHITECTURE.md section 10 and need refactors, not
            // one-line fixes. Kept as warnings so they stay visible without
            // blocking every commit. Promote back to 'error' once fixed.
            'react-hooks/immutability': 'warn',
            'react-hooks/static-components': 'warn',
            'react-hooks/set-state-in-effect': 'warn',

            // Same reasoning: the guide planes keep in-progress stroke state in
            // plain `let` bindings that a re-render resets.
            'no-useless-assignment': 'warn',

            // Tailwind correctness. Class *ordering* is deliberately left to
            // prettier-plugin-tailwindcss so the two tools cannot disagree.
            'better-tailwindcss/no-unknown-classes': [
                'error',
                {
                    // Marker classes with no styles of their own: `Editor.jsx`
                    // finds them with `closest()` to decide which containers
                    // keep native scrolling and browser gestures.
                    ignore: ['custom-scrollbar', 'gesture-allowed'],
                },
            ],
            'better-tailwindcss/no-conflicting-classes': 'error',
            'better-tailwindcss/no-duplicate-classes': 'error',
            'better-tailwindcss/no-deprecated-classes': 'error',
            'better-tailwindcss/no-unnecessary-whitespace': 'warn',
            'better-tailwindcss/enforce-shorthand-classes': 'warn',
        },
    },
]
