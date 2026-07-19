import { tv } from '@/shared/style';

// Web-only base string dropped — no web target exists.
export const hstackStyle = tv({
    base: 'flex-row',
    variants: {
        space: {
            xs: 'gap-1',
            sm: 'gap-2',
            md: 'gap-3',
            lg: 'gap-4',
            xl: 'gap-5',
            '2xl': 'gap-6',
            '3xl': 'gap-7',
            '4xl': 'gap-8',
        },
        reversed: {
            true: 'flex-row-reverse',
        },
    },
});
