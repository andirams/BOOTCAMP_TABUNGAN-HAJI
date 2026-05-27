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

export const TabunganIdParamSchema = z.string().uuid("ID tabungan harus berupa UUID yang valid");

// QRIS payment gateway simulator: SUCCESS = pembayaran berhasil di sisi sumber;
// INSUFFICIENT_FUNDS = saldo e-wallet/sumber QRIS nasabah tidak cukup.
const QrisStatusEnum = z.enum(["SUCCESS", "INSUFFICIENT_FUNDS"]);

export const SetorQrisSchema = z.object({
    nominal: z
        .number()
        .int("Nominal harus bilangan bulat")
        .min(100_000, "Minimum setoran QRIS adalah Rp 100.000"),
    qrisStatus: QrisStatusEnum.optional(),
});

export type CreateTabunganInput = z.infer<typeof CreateTabunganSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type SetorQrisInput = z.infer<typeof SetorQrisSchema>;
