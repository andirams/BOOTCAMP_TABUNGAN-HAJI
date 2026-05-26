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

export type SetorInput = z.infer<typeof SetorSchema>;
export type TarikInput = z.infer<typeof TarikSchema>;
