import React from 'react';
import { View } from 'react-native';

import BaseBox, { type BaseBoxProps } from '../box/BaseBox';
import LoadingBox from '../box/LoadingBox';

type ContainerBoxProps = BaseBoxProps & {
    isLoading?: boolean;
    safeArea?: boolean;
};

const ContainerBox = React.forwardRef<React.ComponentRef<typeof View>, ContainerBoxProps>(
    ({ backgroundColor = 'white', safeArea, ...props }, ref) => {
        return (
            <BaseBox safeArea={safeArea} flex={1} backgroundColor={backgroundColor}>
                <BaseBox flex={1} backgroundColor={backgroundColor} {...props} ref={ref}>
                    {props.children}
                </BaseBox>
                <LoadingBox isLoading={props.isLoading} />
            </BaseBox>
        );
    }
);

ContainerBox.displayName = 'ContainerBox';
export default ContainerBox;
