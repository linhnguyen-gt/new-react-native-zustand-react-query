import Box from './box';
import Text from './text';
import { Colors } from '@/shared/constants';
import React from 'react';

export interface RNLogoProps {
    /** Size of the logo in pixels */
    size?: number;
    /** Custom background color */
    backgroundColor?: string;
    /** Custom text color */
    textColor?: string;
    /** Additional margin at the bottom */
    marginBottom?: number;
    /** Show shadow effect */
    showShadow?: boolean;
    /** Accessibility label for the logo */
    accessibilityLabel?: string;
}

const RNLogo: React.FC<RNLogoProps> = ({
    size = 120,
    backgroundColor = Colors.primaryColor,
    textColor = 'white',
    marginBottom = 20,
    showShadow = true,
    accessibilityLabel = 'React Native Logo',
}) => {
    const outerSize = size;
    const innerSize = outerSize * 0.833; // 100/120 ratio
    const borderSize = 3;
    const textSize = outerSize * 0.417; // 50/120 ratio

    return (
        <Box
            width={outerSize}
            height={outerSize}
            backgroundColor={backgroundColor}
            borderRadius={outerSize * 0.25} // 30/120 ratio
            alignItems="center"
            justifyContent="center"
            shadowColor={showShadow ? backgroundColor : undefined}
            shadowOffset={showShadow ? { width: 0, height: 8 } : undefined}
            shadowOpacity={showShadow ? 0.4 : 0}
            shadowRadius={showShadow ? 12 : 0}
            elevation={showShadow ? 10 : 0}
            marginBottom={marginBottom}
            overflow="visible"
            testID="rn-logo"
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="image">
            <Box
                width={innerSize}
                height={innerSize}
                borderRadius={innerSize * 0.25} // 25/100 ratio
                borderWidth={borderSize}
                borderColor="white"
                alignItems="center"
                justifyContent="center"
                overflow="visible">
                <Box height={textSize} alignItems="center" justifyContent="center" overflow="visible">
                    <Text
                        color={textColor}
                        fontWeight="bold"
                        fontSize={textSize * 0.84} // 42/50 ratio
                        style={{
                            includeFontPadding: false,
                            lineHeight: textSize,
                        }}
                        accessibilityLabel="RN Logo Text">
                        RN
                    </Text>
                </Box>
            </Box>
        </Box>
    );
};

export default RNLogo;
