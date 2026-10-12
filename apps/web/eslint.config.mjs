import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
    ...nextCoreWebVitals,
    ...nextTypescript,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            // New in eslint-plugin-react-hooks 7 (eslint-config-next 16); they flag
            // existing shadcn/ui code, so warn until that code is reworked.
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/purity': 'warn',
            // Ignore the unknown properties error in calendar component
            'react/no-unknown-property': [
                'error',
                { ignore: ['IconLeft', 'IconRight'] },
            ],
        },
    },
    {
        ignores: [
            'node_modules/**',
            '.next/**',
            'out/**',
            'build/**',
            'next-env.d.ts',
        ],
    },
];

export default eslintConfig;
