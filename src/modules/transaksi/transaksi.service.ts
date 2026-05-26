import { prisma } from "../../lib/prisma";
import type { SetorInput, TarikInput } from "./transaksi.schema";

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

    findByTabungan: (tabunganId: string) =>
        prisma.transaksi.findMany({
            where: { tabunganId },
            orderBy: { waktu: 'desc' },
        }),

    findById: (id: string) =>
        prisma.transaksi.findUnique({ where: { id } }),
};
