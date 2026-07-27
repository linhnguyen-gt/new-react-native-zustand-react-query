import { twMerge } from 'tailwind-merge';

export type ClassValue = string | false | null | undefined;

/**
 * Joins class strings and resolves Tailwind conflicts.
 *
 * Conflict resolution is delegated to `tailwind-merge` rather than hand-rolled,
 * because Tailwind groups utilities semantically and a prefix-keyed rule cannot
 * express that. Measured against the shipped output:
 *
 *   text-xl + text-white   -> both survive  (font-size and colour are distinct groups)
 *   border + border-2      -> border-2 wins (both are border-width)
 *   border-2 + border-red  -> both survive  (width and colour are distinct groups)
 *   font-bold + font-normal-> font-normal   (both are font-weight)
 *   font-body + font-normal-> both survive  (family and weight are distinct groups)
 *
 * Later classes win within a group, so caller overrides must be passed last.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(inputs.filter(Boolean).join(' '));
