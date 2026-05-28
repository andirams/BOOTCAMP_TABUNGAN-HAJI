import { prisma } from "../../lib/prisma";
import type { SetorInput, TarikInput, SetorQrisInput } from "./transaksi.schema";

// Sentinel errors agar controller bisa mapping HTTP status tanpa string-matching.
export class TabunganNotFoundError extends Error {
    constructor() { super("TABUNGAN_NOT_FOUND"); }
}
export class TabunganNotActiveError extends Error {
    constructor(public status: string) { super("TABUNGAN_NOT_ACTIVE"); }
}
export class SaldoTidakCukupError extends Error {
    constructor() { super("SALDO_TIDAK_CUKUP"); }
}
export class QrisSaldoKurangError extends Error {
    constructor() { super("QRIS_SALDO_KURANG"); }
}
export class IdempotencyKeyConflictError extends Error {
    constructor() { super("IDEMPOTENCY_KEY_CONFLICT"); }
}

const generateReferensi = (prefix: string): string => {
    const ts = Date.now().toString();
    const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
    return `${prefix}-${ts}${rand}`;
};

const mutasiSaldo = async (
    jenis: "SETOR" | "TARIK",
    input: SetorInput | TarikInput,
) => {
    const nominal = BigInt(input.nominal);

    return prisma.$transaction(async (tx) => {
        const tabungan = await tx.tabunganHaji.findUnique({
            where: { id: input.tabunganId },
        });

        if (!tabungan) throw new TabunganNotFoundError();
        if (tabungan.status !== "AKTIF") throw new TabunganNotActiveError(tabungan.status);

        const saldoSebelum = tabungan.saldo;
        const saldoSesudah = jenis === "SETOR"
            ? saldoSebelum + nominal
            : saldoSebelum - nominal;

        if (jenis === "TARIK" && saldoSesudah < 0n) {
            throw new SaldoTidakCukupError();
        }

        await tx.tabunganHaji.update({
            where: { id: tabungan.id },
            data: { saldo: saldoSesudah },
        });

        return tx.transaksi.create({
            data: {
                tabunganId: tabungan.id,
                jenis,
                nominal,
                saldoSebelum,
                saldoSesudah,
                referensi: generateReferensi(jenis),
                metode: input.metode ?? "TUNAI",
            },
        });
    });
};

export const transaksiService = {
    setor: (input: SetorInput) => mutasiSaldo("SETOR", input),
    tarik: (input: TarikInput) => mutasiSaldo("TARIK", input),

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

    findByTabungan: (tabunganId: string) =>
        prisma.transaksi.findMany({
            where: { tabunganId },
            orderBy: { waktu: 'desc' },
        }),

    findById: (id: string) =>
        prisma.transaksi.findUnique({ where: { id } }),
};
