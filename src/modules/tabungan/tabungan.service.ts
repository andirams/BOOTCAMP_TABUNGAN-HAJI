import { prisma } from "../../lib/prisma";
import type { CreateTabunganInput, SetorQrisInput, UpdateStatusInput } from "./tabungan.schema";
import {
    TabunganNotFoundError,
    TabunganNotActiveError,
} from "../transaksi/transaksi.service";

export class QrisSaldoKurangError extends Error {
    constructor() { super("QRIS_SALDO_KURANG"); }
}
export class IdempotencyKeyConflictError extends Error {
    constructor() { super("IDEMPOTENCY_KEY_CONFLICT"); }
}

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

    async setorQris(args: {
        tabunganId: string;
        idempotencyKey: string;
        data: SetorQrisInput;
    }): Promise<{ replay: boolean; transaksi: Awaited<ReturnType<typeof prisma.transaksi.create>> }> {
        const { tabunganId, idempotencyKey, data } = args;
        const nominal = BigInt(data.nominal);

        return prisma.$transaction(async (tx) => {
            // Idempotency check via referensi unique constraint.
            // Replay dengan key sama + body sama → kembalikan transaksi asli; body beda → konflik.
            const existing = await tx.transaksi.findUnique({
                where: { referensi: idempotencyKey },
            });
            if (existing) {
                if (existing.tabunganId !== tabunganId || existing.nominal !== nominal) {
                    throw new IdempotencyKeyConflictError();
                }
                return { replay: true, transaksi: existing };
            }

            const tabungan = await tx.tabunganHaji.findUnique({ where: { id: tabunganId } });
            if (!tabungan) throw new TabunganNotFoundError();
            if (tabungan.status !== "AKTIF") throw new TabunganNotActiveError(tabungan.status);

            // Simulasi respons gateway QRIS. Pada integrasi nyata, pengecekan ini dilakukan
            // oleh provider QRIS sebelum callback ke endpoint kita.
            if (data.qrisStatus === "INSUFFICIENT_FUNDS") {
                throw new QrisSaldoKurangError();
            }

            const saldoSebelum = tabungan.saldo;
            const saldoSesudah = saldoSebelum + nominal;

            await tx.tabunganHaji.update({
                where: { id: tabungan.id },
                data: { saldo: saldoSesudah },
            });

            const transaksi = await tx.transaksi.create({
                data: {
                    tabunganId: tabungan.id,
                    jenis: "SETOR",
                    nominal,
                    saldoSebelum,
                    saldoSesudah,
                    referensi: idempotencyKey,
                    metode: "QRIS",
                },
            });

            return { replay: false, transaksi };
        });
    },
};
