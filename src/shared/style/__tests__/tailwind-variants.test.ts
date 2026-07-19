import { tv } from '../tailwind-variants';

/**
 * Pins `tv()` against the exact output of the gluestack `tva()` it replaced.
 *
 * Every expectation below was produced by running both implementations side by side
 * while gluestack was still installed; the literals are `tva`'s own output, captured
 * verbatim. The import went with the package, the evidence stayed.
 *
 * The configs and caller class strings are the repo's real ones, not invented — the
 * failure mode being guarded against only appears when a caller class competes with
 * variant output on the same Tailwind group.
 */
const expectClasses = (actual: string, expected: string) => {
    expect(actual).toBe(expected);
};

describe('tv reproduces tva output', () => {
    it('empty result is an empty string', () => {
        // tva returned `undefined` here; both land in className, where RN treats
        // absent and empty identically.
        expect(tv({ base: '' })({})).toBe('');
    });

    it('base only, no variants', () => {
        const withBase = { base: 'flex-col' };
        expectClasses(tv(withBase)({}), 'flex-col');
    });

    it('single variant selection', () => {
        const config = {
            base: 'flex-row',
            variants: {
                space: { xs: 'gap-1', sm: 'gap-2', md: 'gap-3' },
                reversed: { true: 'flex-row-reverse' },
            },
        };
        expectClasses(tv(config)({ space: 'md' }), 'flex-row gap-3');
        expectClasses(
            tv(config)({ reversed: true }), // both flex-direction utilities; the later one wins
            'flex-row-reverse'
        );
        expectClasses(tv(config)({}), 'flex-row');
    });

    it('boolean variant left unset emits nothing', () => {
        const config = { base: 'font-body', variants: { bold: { true: 'font-bold' } } };
        expectClasses(tv(config)({}), 'font-body');
        expectClasses(tv(config)({ bold: false }), 'font-body');
        expectClasses(tv(config)({ bold: true }), 'font-body font-bold');
    });

    describe('caller class collisions from real call sites', () => {
        const textConfig = {
            base: 'font-body',
            variants: {
                bold: { true: 'font-bold' },
                size: { sm: 'text-sm', md: 'text-base', xl: 'text-xl' },
            },
        };

        it('font-size and colour are distinct groups — both survive', () => {
            // screens/main/components/PostCard.tsx passes colour classes alongside size
            expectClasses(tv(textConfig)({ size: 'xl', class: 'text-white' }), 'font-body text-xl text-white');
        });

        it('font-family and weight are distinct groups; weight collides', () => {
            expectClasses(tv(textConfig)({ bold: true, class: 'font-normal' }), 'font-body font-normal');
        });

        it('border width collides, border colour does not', () => {
            // components/input/Input.tsx:80-82
            const config = { base: 'flex-row', variants: {} };
            const caller = 'w-full items-center rounded-2xl border border-2 px-5 border-red';
            expectClasses(
                tv(config)({ class: caller }),
                'flex-row w-full items-center rounded-2xl border-2 px-5 border-red'
            );
        });

        it('caller rounded-xl evicts base rounded', () => {
            // components/modalUpdate/index.tsx:285
            const config = { base: 'rounded bg-primary-500' };
            expectClasses(tv(config)({ class: 'w-full rounded-xl py-3.5' }), 'bg-primary-500 w-full rounded-xl py-3.5');
        });
    });

    it('compound variants — the only configs using them are button and toast', () => {
        const config = {
            base: 'flex-row rounded bg-primary-500',
            variants: {
                action: { primary: 'bg-primary-500', negative: 'bg-error-500' },
                variant: { solid: '', link: 'px-0' },
                size: { md: 'h-10 px-5' },
            },
            compoundVariants: [{ action: 'primary' as const, variant: 'link' as const, class: 'bg-transparent px-0' }],
        };

        // compound rule matches: applied after the plain variants
        expectClasses(
            tv(config)({ action: 'primary', variant: 'link', size: 'md' }),
            'flex-row rounded h-10 bg-transparent px-0'
        );

        // Compound rule does not match, so it is left out entirely — and the result
        // shows why the real buttonStyle needs those rules at all: `size` is declared
        // after `variant`, so size's `px-5` overrides link's `px-0`. The compound rules
        // exist to re-apply `px-0` afterwards.
        expectClasses(
            tv(config)({ action: 'negative', variant: 'link', size: 'md' }),
            'flex-row rounded bg-error-500 h-10 px-5'
        );
    });

    it('declaration order of variants is preserved', () => {
        const config = {
            base: '',
            variants: {
                first: { on: 'p-1' },
                second: { on: 'p-2' },
            },
        };
        // both are padding; the later declaration wins, proving order is respected
        expectClasses(tv(config)({ first: 'on', second: 'on' }), 'p-2');
    });
});
