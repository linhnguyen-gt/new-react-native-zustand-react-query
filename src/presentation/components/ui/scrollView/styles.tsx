import { isWeb } from "@gluestack-ui/nativewind-utils/IsWeb";
import { tva } from "@gluestack-ui/nativewind-utils/tva";

const baseStyle = isWeb
    ? "flex flex-col relative z-0 box-border border-0 list-none min-w-0 min-h-0 bg-transparent m-0 p-0"
    : "w-full flex-1";

export const scrollViewStyle = tva({
    base: baseStyle,
    variants: {
        flex: {
            1: "flex-1",
            auto: "flex-auto",
            none: "flex-none"
        },
        padding: {
            xs: "p-2",
            sm: "p-4",
            md: "p-6",
            lg: "p-8",
            xl: "p-10"
        },
        space: {
            xs: "gap-1",
            sm: "gap-2",
            md: "gap-3",
            lg: "gap-4",
            xl: "gap-5",
            "2xl": "gap-6",
            "3xl": "gap-7",
            "4xl": "gap-8"
        }
    }
});
