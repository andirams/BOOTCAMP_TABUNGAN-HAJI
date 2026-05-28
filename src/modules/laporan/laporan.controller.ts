import type { Request, Response } from "express";
import { LaporanBulananQuerySchema } from "./laporan.schema";
import { laporanService } from "./laporan.service";

const HEADER = [
    "waktu",
    "referensi",
    "nomor_rekening",
    "nama",
    "nik",
    "jenis",
    "nominal",
    "saldo_sebelum",
    "saldo_sesudah",
    "metode",
];

// Kutip field bila mengandung koma/petik/baris baru; petik internal digandakan.
const escapeCsv = (value: string): string =>
    /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export const laporanController = {
    async transaksiBulanan(req: Request, res: Response) {
        const now = new Date();
        const parsed = LaporanBulananQuerySchema.safeParse({
            bulan: req.query.bulan ?? now.getMonth() + 1,
            tahun: req.query.tahun ?? now.getFullYear(),
        });
        if (!parsed.success) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                details: parsed.error.flatten().fieldErrors,
            });
        }
        const { bulan, tahun } = parsed.data;

        const transaksi = await laporanService.transaksiBulanan(bulan, tahun);

        const rows = transaksi.map((t) => [
            t.waktu.toISOString(),
            t.referensi,
            t.tabungan.nomorRekening,
            t.tabungan.nasabah.nama,
            t.tabungan.nasabah.nik,
            t.jenis,
            t.nominal.toString(),
            t.saldoSebelum.toString(),
            t.saldoSesudah.toString(),
            t.metode ?? "",
        ]);

        const csv = [HEADER, ...rows]
            .map((cols) => cols.map((c) => escapeCsv(String(c))).join(","))
            .join("\r\n");

        const periode = `${tahun}-${String(bulan).padStart(2, "0")}`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="laporan-transaksi-${periode}.csv"`,
        );
        // Prefix BOM UTF-8 agar Excel membaca karakter non-ASCII dengan benar.
        return res.status(200).send("﻿" + csv);
    },
};
