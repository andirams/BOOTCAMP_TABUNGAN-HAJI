import { z } from "zod";

// bulan & tahun datang dari query string -> coerce ke number lalu divalidasi.
export const LaporanBulananQuerySchema = z.object({
    bulan: z.coerce
        .number()
        .int("bulan harus bilangan bulat")
        .min(1, "bulan harus 1-12")
        .max(12, "bulan harus 1-12"),
    tahun: z.coerce
        .number()
        .int("tahun harus bilangan bulat")
        .min(2000, "tahun tidak valid")
        .max(2100, "tahun tidak valid"),
});

export type LaporanBulananQuery = z.infer<typeof LaporanBulananQuerySchema>;
