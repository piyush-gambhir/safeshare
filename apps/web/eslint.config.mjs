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

            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/purity': 'warn',

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
