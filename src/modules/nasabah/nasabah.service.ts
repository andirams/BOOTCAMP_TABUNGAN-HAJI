import { prisma } from "../../lib/prisma";
import type { CreateNasabahInput, UpdateNasabahInput } from "./nasabah.schema";

// Hash password tidak boleh bocor di response API mana pun.
const hidePassword = { password: true } as const;

export const nasabahService = {
    create: (data: CreateNasabahInput) =>
        prisma.nasabah.create({ data, omit: hidePassword }),
    findAll: () =>
        prisma.nasabah.findMany({ orderBy: { createdAt: 'desc' }, omit: hidePassword }),
    findById: (id: string) =>
        prisma.nasabah.findUnique({
            where: { id },
            include: { tabungan: true },
            omit: hidePassword,
        }),
    update: (id: string, data: UpdateNasabahInput) =>
        prisma.nasabah.update({ where: { id }, data, omit: hidePassword }),
    remove: (id: string) => prisma.nasabah.delete({ where: { id } }),
};
