import { z } from 'zod';

export const CreateTabunganSchema = z.object({
    nasabahId: z.string().uuid("nasabahId harus UUID valid"),
    setoranAwal: z
        .number()
        .int("Setoran awal harus bilangan bulat")
        .min(0, "Setoran awal tidak boleh negatif")
        .optional(),
});

export const UpdateStatusSchema = z.object({
    status: z.enum(["AKTIF", "TUTUP", "BEKU"], {
        message: "Status harus AKTIF, TUTUP, atau BEKU",
    }),
});

export type CreateTabunganInput = z.infer<typeof CreateTabunganSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
