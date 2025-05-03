import AntDesignIcon from "@react-native-vector-icons/ant-design";
import EntypoIcon from "@react-native-vector-icons/entypo";
import EvilIconsIcon from "@react-native-vector-icons/evil-icons";
import FeatherIcon from "@react-native-vector-icons/feather";
import IoniconsIcon from "@react-native-vector-icons/ionicons";
import MaterialIconsIcon from "@react-native-vector-icons/material-icons";

export type IconFont = "entypo" | "ant-design" | "ionicons" | "feather" | "material-icons" | "evil-icons";
export type AntDesignIconName = Parameters<typeof AntDesignIcon>[0]["name"];
export type EntypoIconName = Parameters<typeof EntypoIcon>[0]["name"];
export type IoniconsIconName = Parameters<typeof IoniconsIcon>[0]["name"];
export type FeatherIconName = Parameters<typeof FeatherIcon>[0]["name"];
export type MaterialIconsIconName = Parameters<typeof MaterialIconsIcon>[0]["name"];
export type EvilIconsIconName = Parameters<typeof EvilIconsIcon>[0]["name"];

export type IconName =
    | AntDesignIconName
    | EntypoIconName
    | IoniconsIconName
    | FeatherIconName
    | MaterialIconsIconName
    | EvilIconsIconName
    | "";
