import AntDesignIcon from "@react-native-vector-icons/ant-design";
import EntypoIcon from "@react-native-vector-icons/entypo";
import EvilIconsIcon from "@react-native-vector-icons/evil-icons";
import FeatherIcon from "@react-native-vector-icons/feather";
import IoniconsIcon from "@react-native-vector-icons/ionicons";
import MaterialIconsIcon from "@react-native-vector-icons/material-icons";
import React from "react";

import { MyTouchable } from "../../touchable";

import { getColor } from "@/presentation/hooks/useThemeColor";
import {
    type AntDesignIconName,
    type EntypoIconName,
    type EvilIconsIconName,
    type FeatherIconName,
    type IconFont,
    type IconName,
    type IoniconsIconName,
    type MaterialIconsIconName
} from "@/shared/types/icon";

interface IconProps {
    name: IconName;
    size?: number;
    className?: string;
    color?: string;
    focused?: boolean;
    font?: IconFont;
    onPress?: () => void;
    disabled?: boolean;
}

const IconComponent: React.FC<IconProps> = ({
    name,
    size = 16,
    className = "",
    color,
    focused = false,
    font = "entypo",
    onPress,
    disabled = false
}) => {
    const getIconColor = () => {
        if (color) return color;
        if (focused) return getColor("yellow");
        return getColor("iconGrey");
    };

    const renderIcon = () => {
        switch (font) {
            case "ant-design":
                return (
                    <AntDesignIcon
                        name={name as AntDesignIconName}
                        size={size}
                        color={getIconColor()}
                        className={className}
                    />
                );
            case "ionicons":
                return (
                    <IoniconsIcon
                        name={name as IoniconsIconName}
                        size={size}
                        color={getIconColor()}
                        className={className}
                    />
                );
            case "feather":
                return (
                    <FeatherIcon
                        name={name as FeatherIconName}
                        size={size}
                        color={getIconColor()}
                        className={className}
                    />
                );
            case "material-icons":
                return (
                    <MaterialIconsIcon
                        name={name as MaterialIconsIconName}
                        size={size}
                        color={getIconColor()}
                        className={className}
                    />
                );
            case "evil-icons":
                return (
                    <EvilIconsIcon
                        name={name as EvilIconsIconName}
                        size={size}
                        color={getIconColor()}
                        className={className}
                    />
                );
            default:
                return (
                    <EntypoIcon
                        name={name as EntypoIconName}
                        size={size}
                        color={getIconColor()}
                        className={className}
                    />
                );
        }
    };

    return (
        <MyTouchable onPress={onPress} disabled={disabled || !onPress}>
            {renderIcon()}
        </MyTouchable>
    );
};

export default IconComponent;
