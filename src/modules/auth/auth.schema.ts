import { z } from "zod";

export const RegisterSchema = z.object({
    nik: z
        .string()
        .length(16, "NIK harus tepat 16 digit")
        .regex(/^\d+$/, "NIK harus angka"),
    nama: z.string().min(3, "Nama minimal 3 karakter").max(100),
    email: z.string().email("Format email tidak valid").max(150),
    nomorHp: z
        .string()
        .regex(/^08\d{8,11}$/, "Nomor HP harus format 08xxxxxxxxxx (10-13 digit)"),
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
