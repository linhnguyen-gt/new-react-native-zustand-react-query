import React from "react";

import { LoadingBox } from "../ui";

import type { LoadingBoxProps } from "../ui/box/LoadingBox";

const Loading: React.FC<LoadingBoxProps> = (props) => {
    return <LoadingBox {...props} />;
};

export default Loading;
