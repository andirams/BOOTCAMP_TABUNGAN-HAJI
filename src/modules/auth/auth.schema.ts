import { z } from "zod";

export const RegisterSchema = z.object({
    email: z.string().email("Format email tidak valid").max(150),
    password: z
        .string()
        .min(8, "Password minimal 8 karakter")
        .max(72, "Password maksimal 72 karakter"),
});

export const LoginSchema = z.object({
    email: z.string().email("Format email tidak valid").max(150),
    password: z.string().min(1, "Password wajib diisi"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
