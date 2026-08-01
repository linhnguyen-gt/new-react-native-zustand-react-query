import React from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { tv, type VariantProps } from '@/shared/style';

/**
 * Was built on @gluestack-ui/button's createButton, with ButtonText, ButtonIcon,
 * ButtonSpinner and ButtonGroup alongside it. All four had zero call sites outside this
 * file — the three real ones nest a plain <Text> — so they went with the dependency,
 * taking @gluestack-ui/icon and the parent-variant plumbing that only they read.
 *
 * The `data-[hover]` / `data-[focus-visible]` / `data-[active]` classes went too. Those
 * attributes were set by gluestack's Pressable wrapper, not by NativeWind, and there is
 * no web target for the hover and focus ones to apply to. The active state is now
 * Pressable's own `pressed` flag.
 */
export const buttonStyle = tv({
    base: 'group/button flex-row items-center justify-center gap-2 rounded bg-primary-500',
    variants: {
        action: {
            primary: 'border-primary-300 bg-primary-500',
            secondary: 'border-secondary-300 bg-secondary-500',
            positive: 'border-success-300 bg-success-500',
            negative: 'border-error-300 bg-error-500',
            default: 'bg-transparent',
        },
        variant: {
            link: 'px-0',
            outline: 'border bg-transparent',
            solid: '',
        },
        size: {
            xs: 'h-8 px-3.5',
            sm: 'h-9 px-4',
            md: 'h-10 px-5',
            lg: 'h-11 px-6',
            xl: 'h-12 px-7',
        },
    },
    compoundVariants: [
        // `size` is declared after `variant`, so its horizontal padding overrides the
        // link variant. These rules re-apply what that variant intends.
        //
        // Scoped per action rather than written once per variant, because that is what
        // the previous config did: `action: 'default'` was left out of both sets, so a
        // default+link button keeps size's px-5. Matching it here rather than
        // generalising keeps the migration behaviour-preserving; the omission looks
        // accidental, but fixing it is a separate decision.
        { action: 'primary', variant: 'link', class: 'bg-transparent px-0' },
        { action: 'secondary', variant: 'link', class: 'bg-transparent px-0' },
        { action: 'positive', variant: 'link', class: 'bg-transparent px-0' },
        { action: 'negative', variant: 'link', class: 'bg-transparent px-0' },
        { action: 'primary', variant: 'outline', class: 'bg-transparent' },
        { action: 'secondary', variant: 'outline', class: 'bg-transparent' },
        { action: 'positive', variant: 'outline', class: 'bg-transparent' },
        { action: 'negative', variant: 'outline', class: 'bg-transparent' },
    ],
});

type StyleProps = Omit<ViewStyle, 'transform'>;

export type IButtonProps = Omit<PressableProps, keyof StyleProps> &
    StyleProps &
    VariantProps<typeof buttonStyle> & {
        className?: string;
    };

const createStyleFromProps = (props: StyleProps): ViewStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ViewStyle;
};

const Button = React.forwardRef<React.ComponentRef<typeof Pressable>, IButtonProps>(function Button(
    { className, variant = 'solid', size = 'md', action = 'primary', style, children, ...props },
    ref
) {
    const styleProps = createStyleFromProps(props as StyleProps);
    const resolvedClassName = buttonStyle({ variant, size, action, class: className });

    return (
        <Pressable
            ref={ref}
            accessibilityRole="button"
            {...props}
            className={resolvedClassName}
            style={({ pressed }) => [
                styleProps,
                { opacity: props.disabled ? 0.5 : 1 },
                // Replaces data-[active=true], which gluestack's wrapper used to set.
                pressed && !props.disabled ? { opacity: 0.7 } : null,
                typeof style === 'function' ? style({ pressed }) : style,
            ]}>
            {children}
        </Pressable>
    );
});

Button.displayName = 'Button';

export default Button;
