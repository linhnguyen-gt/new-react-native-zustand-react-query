import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Keyboard } from 'react-native';

import { RouteName } from '@/shared/constants';
import { signUpSchema, type SignUpFormData } from '@/shared/validation/schemas';

export interface UseSignUpFormReturn {
    control: ReturnType<typeof useForm<SignUpFormData>>['control'];
    handleSubmit: ReturnType<typeof useForm<SignUpFormData>>['handleSubmit'];
    isSubmitting: boolean;
    onSubmit: (data: SignUpFormData) => Promise<void>;
    onSignInPress: () => void;
}

export const useSignUpForm = (): UseSignUpFormReturn => {
    const navigation = useNavigation();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const { control, handleSubmit, formState } = useForm<SignUpFormData>({
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
        resolver: zodResolver(signUpSchema),
        mode: 'onChange',
    });

    const onSubmit = React.useCallback(
        async (data: SignUpFormData) => {
            if (!formState.isValid || isSubmitting) return;

            Keyboard.dismiss();
            setIsSubmitting(true);

            try {
                // TODO: Replace with actual API call
                // For now, just log to warn (allowed by ESLint)
                console.warn('Sign up data (simulated):', data);

                // Simulate API call delay
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Navigate to main screen on success
                navigation.reset({
                    index: 0,
                    routes: [{ name: RouteName.Main as never }],
                });
            } catch (error) {
                console.error('Sign up error:', error);
                // TODO: Handle error (show toast, etc.)
            } finally {
                setIsSubmitting(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isSubmitting, navigation]
    );

    const onSignInPress = React.useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    return {
        control,
        handleSubmit,
        isSubmitting,
        onSubmit,
        onSignInPress,
    };
};
