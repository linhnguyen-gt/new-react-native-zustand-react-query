import { tv } from '@/shared/style';

// Web-only base string dropped — no web target exists. Note the native branch here
// was not empty, unlike the other primitives.
export const scrollViewStyle = tv({
    base: 'w-full flex-1',
    variants: {
        flex: {
            1: 'flex-1',
            auto: 'flex-auto',
            none: 'flex-none',
        },
        padding: {
            xs: 'p-2',
            sm: 'p-4',
            md: 'p-6',
            lg: 'p-8',
            xl: 'p-10',
        },
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
    },
});
