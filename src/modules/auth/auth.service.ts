import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { revoke } from "../../lib/tokenDenylist";
import type { LoginInput, RegisterInput } from "./auth.schema";

const SALT_ROUNDS = 10;

// Sentinel errors agar controller bisa mapping HTTP status tanpa string-matching.
export class DuplicateError extends Error {
    constructor(message: string) { super(message); }
}
export class InvalidCredentialsError extends Error {
    constructor() { super("INVALID_CREDENTIALS"); }
}

export const authService = {
    // Self-registration: buat nasabah baru sekaligus set password (publik, tanpa token).
    async register(input: RegisterInput) {
        const hashed = await bcrypt.hash(input.password, SALT_ROUNDS);
        try {
            const nasabah = await prisma.nasabah.create({
                data: {
                    nik: input.nik,
                    nama: input.nama,
                    email: input.email,
                    nomorHp: input.nomorHp,
                    password: hashed,
                },
            });
            return { id: nasabah.id, nama: nasabah.nama, email: nasabah.email };
        } catch (err) {
            if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === "P2002"
            ) {
                const target = (err.meta?.target as string[] | undefined)?.join(", ") ?? "";
                const field = target.includes("nik")
                    ? "NIK"
                    : target.includes("email")
                        ? "Email"
                        : "Data";
                throw new DuplicateError(`${field} sudah terdaftar`);
            }
            throw err;
        }
    },

    async login(input: LoginInput) {
        const nasabah = await prisma.nasabah.findUnique({
            where: { email: input.email },
        });
        // Bandingkan password walau nasabah tidak ada / belum set password,
        // agar tidak membocorkan email mana yang terdaftar lewat selisih waktu respons.
        const hash = nasabah?.password ?? "";
        const cocok = await bcrypt.compare(input.password, hash);
        if (!nasabah || !nasabah.password || !cocok) {
            throw new InvalidCredentialsError();
        }

        const token = signToken({ sub: nasabah.id, email: nasabah.email });
        return {
            token,
            nasabah: { id: nasabah.id, nama: nasabah.nama, email: nasabah.email },
        };
    },

    logout(jti: string) {
        revoke(jti);
    },
};
