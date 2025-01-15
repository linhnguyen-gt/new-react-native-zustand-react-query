import resolveConfig from "tailwindcss/resolveConfig";

import tailwindConfig from "../../tailwind.config";

const fullConfig = resolveConfig(tailwindConfig);

export const getColor = (colorPath: string) => {
    return colorPath.split(".").reduce((obj: any, key) => obj[key], fullConfig.theme.colors);
};
