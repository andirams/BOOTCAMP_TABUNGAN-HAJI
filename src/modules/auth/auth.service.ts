import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { revoke } from "../../lib/tokenDenylist";
import type { LoginInput, RegisterInput } from "./auth.schema";

const SALT_ROUNDS = 10;

// Sentinel errors agar controller bisa mapping HTTP status tanpa string-matching.
export class NasabahNotFoundError extends Error {
    constructor() { super("NASABAH_NOT_FOUND"); }
}
export class AlreadyRegisteredError extends Error {
    constructor() { super("ALREADY_REGISTERED"); }
}
export class InvalidCredentialsError extends Error {
    constructor() { super("INVALID_CREDENTIALS"); }
}

export const authService = {
    async register(input: RegisterInput) {
        const nasabah = await prisma.nasabah.findUnique({
            where: { email: input.email },
        });
        if (!nasabah) throw new NasabahNotFoundError();
        if (nasabah.password) throw new AlreadyRegisteredError();

        const hashed = await bcrypt.hash(input.password, SALT_ROUNDS);
        await prisma.nasabah.update({
            where: { id: nasabah.id },
            data: { password: hashed },
        });

        return { id: nasabah.id, nama: nasabah.nama, email: nasabah.email };
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
