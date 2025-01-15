import Icon from "@react-native-vector-icons/entypo";
import React from "react";
import { Animated, TextInput, TextInputProps } from "react-native";

import { Box, HStack, MyTouchable, Text, VStack } from "@/components";

import { getColor } from "@/hooks";

import useShakeView from "./Input.Hook";

export type InputProps = TextInputProps & {
    prefixIcon?: React.ReactNode;
    suffixIcon?: React.ReactNode;
    onChangeFocus?: (name: string, isFocus: boolean) => void;
    onChangeValue?: (field: string, value: string, shouldValidate?: boolean | undefined) => void;
    fieldName?: string;
    isPassword?: boolean;
    enable?: boolean;
    title?: string;
    error?: string | boolean | undefined;
    isLoading?: boolean;
    height?: number;
    testID?: string;
};

const Input = React.forwardRef<TextInput, InputProps>(
    (
        {
            placeholder,
            prefixIcon,
            suffixIcon,
            fieldName,
            isPassword,
            onChangeValue,
            enable = true,
            height = 50,
            title,
            error,
            testID,
            ...rest
        },
        ref
    ) => {
        const shake = useShakeView(error);

        const [isShowPassword, setIsShowPassword] = React.useState<boolean>(!!isPassword);

        const _handleSecure = React.useCallback(() => {
            setIsShowPassword(!isShowPassword);
        }, [isShowPassword]);

        const _renderShowPassword = React.useMemo(
            () => (
                <MyTouchable onPress={_handleSecure}>
                    <Icon name={isShowPassword ? "eye-with-line" : "eye"} size={16} />
                </MyTouchable>
            ),
            [_handleSecure, isShowPassword]
        );

        const handleChangeText = React.useCallback(
            (text: string) => {
                if (fieldName) {
                    return onChangeValue?.(fieldName, text);
                }
                rest.onChangeText?.(text);
            },
            [fieldName, onChangeValue, rest]
        );

        const _renderInput = React.useMemo(() => {
            return (
                <HStack
                    style={{ height }}
                    className={`items-center w-full rounded-2xl border ${!enable && "bg-inputDisable"} px-5 border-2 ${error ? "border-red" : "border-gray-100"} `}>
                    <HStack className="items-center flex-1 h-full" space="md">
                        {prefixIcon}
                        <TextInput
                            testID={testID}
                            ref={ref}
                            {...rest}
                            className="font-semibold w-full font-body mt-1 h-full"
                            style={{ textAlignVertical: "top" }}
                            placeholder={placeholder}
                            secureTextEntry={isShowPassword}
                            onChangeText={handleChangeText}
                            editable={enable}
                            placeholderTextColor={getColor("iconGrey")}
                        />
                    </HStack>
                    <Box className="pl-3">{suffixIcon ?? (isPassword && _renderShowPassword)}</Box>
                </HStack>
            );
        }, [
            _renderShowPassword,
            enable,
            error,
            handleChangeText,
            height,
            isPassword,
            isShowPassword,
            placeholder,
            prefixIcon,
            ref,
            rest,
            suffixIcon,
            testID
        ]);

        return (
            <VStack space="sm">
                {title && <Text className="text-blackLight/70 font-mono">{title}</Text>}
                <VStack space="xs">
                    <Animated.View style={shake}>{_renderInput}</Animated.View>
                    {!!error && (
                        <Box>
                            <Text testID={`${testID}-error`} className="text-red text-sm">
                                {error}
                            </Text>
                        </Box>
                    )}
                </VStack>
            </VStack>
        );
    }
);

export default Input;

declare global {
    export type TypeInput = "dropdown" | "search" | "phone" | "date" | "otp";
}
