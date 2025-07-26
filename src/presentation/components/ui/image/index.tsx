'use client';

import { createImage } from '@gluestack-ui/image';
import { tva } from '@gluestack-ui/nativewind-utils/tva';
import { cssInterop } from 'nativewind';
import React from 'react';
import { ImageStyle, Platform, Image as RNImage } from 'react-native';

import type { VariantProps } from '@gluestack-ui/nativewind-utils';

type StyleProps = Omit<ImageStyle, 'transform'>;

const imageStyle = tva({
    base: 'max-w-full',
    variants: {
        size: {
            '2xs': 'h-6 w-6',
            xs: 'h-10 w-10',
            sm: 'h-16 w-16',
            md: 'h-20 w-20',
            lg: 'h-24 w-24',
            xl: 'h-32 w-32',
            '2xl': 'h-64 w-64',
            full: 'h-full w-full',
        },
    },
});

const UIImage = createImage({ Root: RNImage });
cssInterop(UIImage, { className: 'style' });

export type ImageProps = Omit<React.ComponentProps<typeof UIImage>, keyof StyleProps> &
    StyleProps &
    VariantProps<typeof imageStyle> & {
        className?: string;
    };

const createStyleFromProps = (props: StyleProps): ImageStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ImageStyle;
};

const Image = React.forwardRef<React.ComponentRef<typeof UIImage>, ImageProps>(
    ({ size = 'md', className, style, ...props }, ref) => {
        const styleProps = createStyleFromProps(props as StyleProps);

        return (
            <UIImage
                className={imageStyle({ size, class: className })}
                style={[
                    styleProps,
                    // @ts-expect-error : web only
                    Platform.OS === 'web' ? { height: 'revert-layer', width: 'revert-layer' } : undefined,
                    style,
                ]}
                {...props}
                ref={ref}
            />
        );
    }
);

Image.displayName = 'Image';
export default Image;
