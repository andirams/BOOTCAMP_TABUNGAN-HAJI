import { prisma } from "../../lib/prisma";

export const laporanService = {
    // Transaksi pada bulan & tahun tertentu, dibatasi ke rekening milik
    // nasabah yang sedang login. Batas bulan memakai waktu lokal server (WIB).
    transaksiBulanan(bulan: number, tahun: number, nasabahId: string) {
        const awal = new Date(tahun, bulan - 1, 1);
        const akhir = new Date(tahun, bulan, 1); // eksklusif (awal bulan berikutnya)

        return prisma.transaksi.findMany({
            where: {
                waktu: { gte: awal, lt: akhir },
                tabungan: { nasabahId },
            },
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
