import React from 'react';
import { TouchableOpacity } from 'react-native';

import TouchableComponent, { TouchableComponentProps } from '../../touchable/TouchableComponent';

const Touchable = React.forwardRef<React.ComponentRef<typeof TouchableOpacity>, TouchableComponentProps>(
    (props, ref) => {
        return <TouchableComponent {...props} ref={ref} />;
    }
);

Touchable.displayName = 'Touchable';

export default Touchable;
