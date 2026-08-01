import { cn } from './class-names';

type VariantMap = Record<string, string>;
type VariantsShape = Record<string, VariantMap>;

/**
 * The whole config is the inference site, not the `variants` object alone.
 *
 * Inferring a single `V extends VariantsShape` looks tidier but does not work here:
 * `compoundVariants` refers back to `V`, and that circularity makes TypeScript give up
 * and fall back to the constraint. `V` then widens to `Record<string, Record<string,
 * string>>`, `Selection<V>` becomes an index signature over every string key, and the
 * resulting props type swallows unrelated props — `children` included, typed `string`.
 */
export interface TvConfig {
    base?: string;
    variants?: VariantsShape;
    compoundVariants?: readonly (Record<string, string | boolean> & { class: string })[];
}

/**
 * A variant map keyed only by `true` is a boolean switch (`bold: { true: 'font-bold' }`),
 * so callers pass a boolean rather than the literal string 'true'.
 */
type VariantValue<M> = 'true' extends keyof M ? boolean : keyof M;

type Selection<V> = { [K in keyof V]?: VariantValue<V[K]> };

export type TvProps<C> = C extends { variants: infer V } ? Selection<V> & { class?: string } : { class?: string };

/**
 * Builds a class-string function from a variant config.
 *
 * Output order matches what it replaces: base, then each variant in declaration
 * order, then matching compound rules, then the caller's `class`. Order matters —
 * `cn` resolves conflicts last-wins, so the caller's class must come last to override.
 *
 * Variant defaults are deliberately unsupported: every component here already defaults
 * in its own destructuring (`size = 'md'`), and a second place to declare them would
 * let the two disagree.
 */
export const tv = <const C extends TvConfig>(config: C) => {
    const { base = '', variants, compoundVariants } = config;

    return (props: TvProps<C> = {} as TvProps<C>): string => {
        const { class: callerClass, ...selection } = props as Record<string, unknown> & { class?: string };

        const variantClasses = variants
            ? Object.keys(variants).map((key) => {
                  const value = selection[key];
                  if (value === undefined || value === null || value === false) return '';
                  // `variants[key]?.` — the key comes from `Object.keys(variants)` so it is
                  // present in practice, but under `noUncheckedIndexedAccess` the compiler
                  // does not know that, and the optional chain costs nothing.
                  return variants[key]?.[String(value)] ?? '';
              })
            : [];

        const compoundClasses = compoundVariants
            ? compoundVariants
                  .filter((rule) =>
                      Object.entries(rule).every(
                          ([key, expected]) => key === 'class' || String(selection[key]) === String(expected)
                      )
                  )
                  .map((rule) => rule.class)
            : [];

        return cn(base, ...variantClasses, ...compoundClasses, callerClass);
    };
};

/** Mirrors the prop union the gluestack `VariantProps` produced. */
export type VariantProps<F> = F extends (props?: infer P) => string ? Omit<NonNullable<P>, 'class'> : never;
