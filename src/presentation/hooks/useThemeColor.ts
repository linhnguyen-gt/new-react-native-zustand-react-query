import resolveConfig from 'tailwindcss/resolveConfig';
import type { Config } from 'tailwindcss';

import tailwindConfig, { ColorPath } from '../../../tailwind.config';

let cachedConfig: ReturnType<typeof resolveConfig<Config>> | null = null;

const getFullConfig = () => {
    if (!cachedConfig) {
        cachedConfig = resolveConfig(tailwindConfig as unknown as Config);
    }
    return cachedConfig;
};

export type { ColorPath };

export const getColor = (colorPath: ColorPath): string => {
    const fullConfig = getFullConfig();
    const colorsMap = fullConfig.theme.colors as unknown as Record<string, unknown>;
    return colorPath
        .split('.')
        .reduce<unknown>((obj, key) => (obj as Record<string, unknown>)[key], colorsMap) as string;
};
