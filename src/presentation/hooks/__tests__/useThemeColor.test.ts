const mockColors = {
    primary: {
        500: 'rgb(var(--color-primary-500)/<alpha-value>)',
        600: 'rgb(var(--color-primary-600)/<alpha-value>)',
    },
    secondary: {
        500: 'rgb(var(--color-secondary-500)/<alpha-value>)',
    },
    typography: {
        white: '#FFFFFF',
        gray: '#D4D4D4',
        black: '#181718',
    },
    background: {
        light: '#FBFBFB',
        dark: '#181719',
        error: 'rgb(var(--color-background-error)/<alpha-value>)',
    },
    indicator: {
        primary: 'rgb(var(--color-indicator-primary)/<alpha-value>)',
    },
    red: '#F75555',
};

jest.mock('tailwindcss/resolveConfig', () => {
    return {
        __esModule: true,
        default: jest.fn(() => ({
            theme: {
                colors: mockColors,
            },
        })),
    };
});

jest.mock('../../../../tailwind.config', () => ({}));

import { getColor } from '../useThemeColor';

describe('useThemeColor - getColor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return correct color for primary shade', () => {
        const result = getColor('primary.500' as Parameters<typeof getColor>[0]);
        expect(result).toBe('rgb(var(--color-primary-500)/<alpha-value>)');
    });

    it('should return correct color for secondary shade', () => {
        const result = getColor('secondary.500' as Parameters<typeof getColor>[0]);
        expect(result).toBe('rgb(var(--color-secondary-500)/<alpha-value>)');
    });

    it('should return correct color for typography special colors', () => {
        expect(getColor('typography.white' as Parameters<typeof getColor>[0])).toBe('#FFFFFF');
        expect(getColor('typography.gray' as Parameters<typeof getColor>[0])).toBe('#D4D4D4');
        expect(getColor('typography.black' as Parameters<typeof getColor>[0])).toBe('#181718');
    });

    it('should return correct color for background special colors', () => {
        expect(getColor('background.light' as Parameters<typeof getColor>[0])).toBe('#FBFBFB');
        expect(getColor('background.dark' as Parameters<typeof getColor>[0])).toBe('#181719');
        expect(getColor('background.error' as Parameters<typeof getColor>[0])).toBe(
            'rgb(var(--color-background-error)/<alpha-value>)'
        );
    });

    it('should return correct color for indicator', () => {
        const result = getColor('indicator.primary' as Parameters<typeof getColor>[0]);
        expect(result).toBe('rgb(var(--color-indicator-primary)/<alpha-value>)');
    });

    it('should return correct color for simple color', () => {
        const result = getColor('red' as Parameters<typeof getColor>[0]);
        expect(result).toBe('#F75555');
    });

    it('should handle deeply nested color path', () => {
        const result = getColor('primary.600' as Parameters<typeof getColor>[0]);
        expect(result).toBe('rgb(var(--color-primary-600)/<alpha-value>)');
    });
});
