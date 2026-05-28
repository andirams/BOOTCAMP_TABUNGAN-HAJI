import { prisma } from "../../lib/prisma";
import type { CreateTabunganInput, UpdateStatusInput } from "./tabungan.schema";

// Format nomor rekening: THJ + 13 digit (timestamp + random) → max 20 char.
const generateNomorRekening = (): string => {
    const ts = Date.now().toString().slice(-10);
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `THJ${ts}${rand}`;
};

const generateReferensi = (): string => {
    const ts = Date.now().toString();
    const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
    return `SETOR-AWAL-${ts}${rand}`;
};

export const tabunganService = {
    async create(data: CreateTabunganInput) {
        const setoranAwal = BigInt(data.setoranAwal ?? 0);
        const nomorRekening = generateNomorRekening();

        // Pakai $transaction agar pembukaan rekening + transaksi setoran awal atomik.
        return prisma.$transaction(async (tx) => {
            const tabungan = await tx.tabunganHaji.create({
                data: {
                    nasabahId: data.nasabahId,
                    nomorRekening,
                    saldo: setoranAwal,
                },
            });

            if (setoranAwal > 0n) {
                await tx.transaksi.create({
                    data: {
                        tabunganId: tabungan.id,
                        jenis: "SETOR",
                        nominal: setoranAwal,
                        saldoSebelum: 0n,
                        saldoSesudah: setoranAwal,
                        referensi: generateReferensi(),
                        metode: "TUNAI",
                    },
                });
            }

            return tabungan;
        });
    },

    findAll: (nasabahId?: string) =>
        prisma.tabunganHaji.findMany({
            where: nasabahId ? { nasabahId } : undefined,
            orderBy: { dibukaAt: 'desc' },
        }),

    findById: (id: string) =>
        prisma.tabunganHaji.findUnique({
            where: { id },
            include: {
                nasabah: { select: { id: true, nama: true, nik: true } },
            },
        }),

    findByNomorRekening: (nomorRekening: string) =>
        prisma.tabunganHaji.findUnique({
            where: { nomorRekening },
            include: {
                nasabah: { select: { id: true, nama: true, nik: true } },
            },
        }),

    updateStatus: (id: string, data: UpdateStatusInput) =>
        prisma.tabunganHaji.update({
            where: { id },
            data: { status: data.status },
        }),

    async estimasiHaji(id: string) {
        const tabungan = await prisma.tabunganHaji.findUnique({
            where: { id },
            include: { nasabah: { select: { id: true, nama: true } } },
        });
        if (!tabungan) return null;

        const batasPorsi = BigInt(process.env.HAJI_BATAS_PORSI ?? "25000000");
        const kuotaPerTahun = Number(process.env.HAJI_KUOTA_PER_TAHUN ?? "221000");
        const tahunSekarang = new Date().getFullYear();

        if (tabungan.saldo < batasPorsi) {
            return {
                tabungan: {
                    id: tabungan.id,
                    nomorRekening: tabungan.nomorRekening,
                    nasabah: tabungan.nasabah,
                },
                status: "BELUM_PORSI" as const,
                saldo: tabungan.saldo,
                batasPorsi,
                kekurangan: batasPorsi - tabungan.saldo,
                message: "Saldo belum mencukupi untuk mendapatkan nomor porsi haji",
            };
        }

        // Nomor porsi = urutan antre: jumlah rekening yang sudah mencapai batas porsi
        // dan dibuka pada/sebelum rekening ini. Rekening tertua = porsi nomor 1.
        const nomorPorsi = await prisma.tabunganHaji.count({
            where: {
                saldo: { gte: batasPorsi },
                dibukaAt: { lte: tabungan.dibukaAt },
            },
        });
        const masaTungguTahun = Math.ceil(nomorPorsi / kuotaPerTahun);

        return {
            tabungan: {
                id: tabungan.id,
                nomorRekening: tabungan.nomorRekening,
                nasabah: tabungan.nasabah,
            },
            status: "DAPAT_PORSI" as const,
            saldo: tabungan.saldo,
            nomorPorsi,
            kuotaPerTahun,
            masaTungguTahun,
            estimasiTahunBerangkat: tahunSekarang + masaTungguTahun,
        };
    },
};
