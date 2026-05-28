import { prisma } from "../../lib/prisma";

export const laporanService = {
    // Transaksi pada bulan & tahun tertentu, lintas semua rekening.
    // Batas bulan memakai waktu lokal server (WIB) agar sesuai ekspektasi admin.
    transaksiBulanan(bulan: number, tahun: number) {
        const awal = new Date(tahun, bulan - 1, 1);
        const akhir = new Date(tahun, bulan, 1); // eksklusif (awal bulan berikutnya)

        return prisma.transaksi.findMany({
            where: { waktu: { gte: awal, lt: akhir } },
            orderBy: { waktu: "asc" },
            include: {
                tabungan: {
                    select: {
                        nomorRekening: true,
                        nasabah: { select: { nama: true, nik: true } },
                    },
                },
            },
        });
    },
};
