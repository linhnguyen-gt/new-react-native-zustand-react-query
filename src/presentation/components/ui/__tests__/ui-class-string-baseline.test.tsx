import { render } from '@testing-library/react-native';
import React from 'react';

import { boxStyle } from '../box/styles';
import { buttonStyle } from '../button';
import { hstackStyle } from '../hStack/styles';
import Image from '../image';
import { scrollViewStyle } from '../scrollView/styles';
import { textStyle } from '../text/styles';
import { vstackStyle } from '../vStack/styles';

/**
 * Baseline of every class string the UI primitives resolve to.
 *
 * This is the mechanical detector for the gluestack removal. Tailwind failures are
 * silent — a dropped utility produces no compiler error and no test failure anywhere
 * else, and a human comparing screenshots does not reliably catch a font size off by
 * two points or a border collapsing from 2px to 1px. Those are exactly the regressions
 * a hand-rolled class merger causes.
 *
 * Any diff here is a real change in rendered styling. A phase that intends one must say
 * so; otherwise the diff is a bug.
 */

describe('class string baseline', () => {
    // Style functions are snapshotted directly rather than through a rendered tree:
    // it isolates the class-string output from React Native's rendering, so a diff
    // points at the style layer and nothing else.

    it('boxStyle', () => {
        // `base 1` changed from `undefined` to `""` when tva was replaced by tv: the
        // gluestack helper returned undefined for an empty result, the local one returns
        // an empty string. Both land in `className`, where RN treats absent and empty
        // identically. This is the only one of the 27 baselines that moved.
        expect(boxStyle({})).toMatchSnapshot('base');
        expect(boxStyle({ class: 'flex-1 bg-white' })).toMatchSnapshot('with caller class');
    });

    it('textStyle across every variant', () => {
        const sizes = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] as const;
        const bySize = Object.fromEntries(sizes.map((size) => [size, textStyle({ size })]));
        expect(bySize).toMatchSnapshot('sizes');

        expect({
            bold: textStyle({ bold: true }),
            italic: textStyle({ italic: true }),
            underline: textStyle({ underline: true }),
            strikeThrough: textStyle({ strikeThrough: true }),
            highlight: textStyle({ highlight: true }),
            isTruncated: textStyle({ isTruncated: true }),
            sub: textStyle({ sub: true }),
        }).toMatchSnapshot('modifiers');

        // Collision cases: caller class competes with variant output on the same
        // Tailwind group. `text-white` (color) must not evict `text-xl` (size) — they
        // are different groups despite sharing a prefix.
        expect(textStyle({ size: 'xl', class: 'text-white' })).toMatchSnapshot('size + caller color');
        expect(textStyle({ size: 'sm', class: 'text-red' })).toMatchSnapshot('sm + caller color');
        expect(textStyle({ bold: true, class: 'font-normal' })).toMatchSnapshot('bold + caller weight');
    });

    it('hstackStyle', () => {
        const spaces = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;
        expect(Object.fromEntries(spaces.map((space) => [space, hstackStyle({ space })]))).toMatchSnapshot('spaces');
        expect(hstackStyle({ reversed: true })).toMatchSnapshot('reversed');
        // Real call site: components/input/Input.tsx:80-82 — `border` and `border-2`
        // are the same group (width); `border-red` is a different one (color).
        expect(
            hstackStyle({ class: 'w-full items-center rounded-2xl border border-2 px-5 border-red' })
        ).toMatchSnapshot('Input.tsx border collision');
    });

    it('vstackStyle', () => {
        const spaces = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;
        expect(Object.fromEntries(spaces.map((space) => [space, vstackStyle({ space })]))).toMatchSnapshot('spaces');
        expect(vstackStyle({ reversed: true })).toMatchSnapshot('reversed');
    });

    it('scrollViewStyle', () => {
        expect(scrollViewStyle({})).toMatchSnapshot('base');
        expect(scrollViewStyle({ space: 'md' })).toMatchSnapshot('space md');
    });

    it('buttonStyle at its real call sites', () => {
        // modalUpdate/index.tsx:285,293,299 are the only three call sites; each passes
        // `action` and relies on the defaults for `variant` and `size`.
        const defaults = { variant: 'solid', size: 'md' } as const;

        expect(buttonStyle({ ...defaults, action: 'positive', class: 'w-full rounded-xl py-3.5' })).toMatchSnapshot(
            'positive + caller class'
        );
        expect(buttonStyle({ ...defaults, action: 'negative' })).toMatchSnapshot('negative');
        expect(buttonStyle({ ...defaults, action: 'secondary' })).toMatchSnapshot('secondary');

        // Compound variants — the only place in the repo that exercises them. Phase 03
        // must reproduce these exactly or declare the diff.
        const actions = ['primary', 'secondary', 'positive', 'negative', 'default'] as const;
        const variants = ['solid', 'outline', 'link'] as const;
        const compound: Record<string, string> = {};
        actions.forEach((action) => {
            variants.forEach((variant) => {
                compound[`${action}/${variant}`] = buttonStyle({ action, variant, size: 'md' });
            });
        });
        expect(compound).toMatchSnapshot('every action x variant');

        const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
        expect(Object.fromEntries(sizes.map((size) => [size, buttonStyle({ ...defaults, size })]))).toMatchSnapshot(
            'sizes'
        );
    });

    it('Image sizes', () => {
        const sizes = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'] as const;
        sizes.forEach((size) => {
            const tree = render(<Image size={size} source={{ uri: 'https://example.invalid/a.png' }} />);
            expect(tree.toJSON()).toMatchSnapshot(`size=${size}`);
        });
    });
});
