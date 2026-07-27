import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Keyboard } from 'react-native';

import { RouteName } from '@/shared/constants';
import { Logger } from '@/shared/helper';
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

    // Two representations of the same fact, deliberately.
    //
    // The ref is the actual guard: it is written synchronously, so a second call in
    // the same tick sees it immediately. `isSubmitting` state was NOT sufficient —
    // it is captured in this callback's closure, so a double-tap before React
    // re-renders had both calls reading `false` and submitting twice. Verified: the
    // re-entrancy test fails with the state-only guard.
    //
    // The state exists only to drive the button's `disabled` prop, which needs a
    // render to take effect.
    const isSubmittingRef = React.useRef(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // formState is deliberately not destructured. Reading it here without rendering it
    // subscribes nothing, so `formState.isValid` stayed false and the old guard turned
    // the first tap into a silent no-op. Validity is enforced by the resolver via
    // handleSubmit instead.
    const { control, handleSubmit } = useForm<SignUpFormData>({
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
        // `_data` is unused until the real signup API call replaces the TODO below.
        // It must never be logged: it carries password and confirmPassword.
        async (_data: SignUpFormData) => {
            // Only the re-entrancy half of the old guard remains. The `formState.isValid`
            // half was redundant — handleSubmit runs the zod resolver and refuses to
            // invoke this callback at all when validation fails — and reading formState
            // here without subscribing to it during render is what made the first tap a
            // no-op. `isSubmitting` is NOT redundant: the button's disabled prop only
            // takes effect after React commits, so a fast double-tap enters twice, and
            // once the TODO below becomes a real call that means two signups.
            if (isSubmittingRef.current) return;

            try {
                // Set inside the try so the finally always releases it. Setting it
                // before, alongside Keyboard.dismiss(), left a window where a throw
                // would strand the flag true and dead-lock the form for the lifetime
                // of the component.
                isSubmittingRef.current = true;
                Keyboard.dismiss();
                setIsSubmitting(true);
                // TODO: Replace with actual API call.
                // Do not log `_data` here — it carries password and confirmPassword.

                // Simulate API call delay
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
                Logger.error('SignUpForm', 'Sign up failed', error);
                // TODO: Handle error (show toast, etc.)
                return;
            } finally {
                isSubmittingRef.current = false;
                setIsSubmitting(false);
            }

            // Navigation is outside the try above: reset() unmounts this screen, so the
            // finally block would otherwise call setIsSubmitting on an unmounted
            // component. It gets its own catch — letting it throw here would escape
            // onSubmit into handleSubmit as an unhandled rejection with no log.
            try {
                navigation.reset({
                    index: 0,
                    routes: [{ name: RouteName.Main as never }],
                });
            } catch (error) {
                Logger.error('SignUpForm', 'Navigation to Main failed after sign up', error);
            }
        },
        [navigation]
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
