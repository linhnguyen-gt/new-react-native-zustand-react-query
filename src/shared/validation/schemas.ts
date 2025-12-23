import * as z from 'zod';

import { Errors } from '@/shared/constants';

export const emailSchema = z
    .string()
    .min(1, Errors.REQUIRED_EMAIL_INPUT)
    .pipe(z.email(Errors.EMAIL_INVALID))
    .refine((value) => value.endsWith('.com'), {
        message: Errors.IS_NOT_EMAIL,
    });

export const passwordSchema = z.string().min(1, Errors.REQUIRED_PASSWORD_INPUT);

export const passwordWithMinLengthSchema = z
    .string()
    .min(6, Errors.PASSWORD_MIN_LENGTH)
    .min(1, Errors.REQUIRED_PASSWORD_INPUT);

export const confirmPasswordSchema = z.string().min(1, Errors.REQUIRED_CONFIRM_PASSWORD_INPUT);

export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

export const signUpSchema = z
    .object({
        fullName: z.string().min(1, Errors.REQUIRED_FULLNAME_INPUT),
        email: emailSchema,
        password: passwordWithMinLengthSchema,
        confirmPassword: confirmPasswordSchema,
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: Errors.PASSWORD_NOT_MATCH,
        path: ['confirmPassword'],
    });

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
