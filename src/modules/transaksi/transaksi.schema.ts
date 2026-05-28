import { z } from 'zod';

const MetodeEnum = z.enum(["TUNAI", "TRANSFER", "VIRTUAL_ACCOUNT", "QRIS"]);

export const SetorSchema = z.object({
    tabunganId: z.string().uuid("tabunganId harus UUID valid"),
    nominal: z
        .number()
        .int("Nominal harus bilangan bulat")
        .positive("Nominal harus lebih dari 0"),
    metode: MetodeEnum.optional(),
});

export const TarikSchema = SetorSchema;

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

export type SetorInput = z.infer<typeof SetorSchema>;
export type TarikInput = z.infer<typeof TarikSchema>;
export type SetorQrisInput = z.infer<typeof SetorQrisSchema>;
