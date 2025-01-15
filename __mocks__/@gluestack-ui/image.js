import React from "react";
import { Image as RNImage } from "react-native";

export const createImage = () => {
    return React.forwardRef((props, ref) => <RNImage {...props} ref={ref} />);
};

export const Image = createImage();
