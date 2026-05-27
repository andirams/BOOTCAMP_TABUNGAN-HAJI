import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { CreateNasabahSchema, IdParamSchema, UpdateNasabahSchema } from './nasabah.schema';
import { nasabahService } from './nasabah.service';

export const nasabahController = {
    async create(req: Request, res: Response) {
        const parsed = CreateNasabahSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                details: parsed.error.flatten().fieldErrors,
            });
        }

        try {
            const nasabah = await nasabahService.create(parsed.data);
            return res.status(201).json(nasabah);
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
                const field = (err.meta?.target as string[])?.[0] ?? "field";
                return res.status(409).json({
                    error: 'DUPLICATE_ENTRY',
                    message: `${field} sudah terdaftar`,
                });
            }
            throw err;
        }
    },

    async findAll(req: Request, res: Response) {
        const data = await nasabahService.findAll();
        return res.status(200).json({
            data,
            total: data.length,
        });
    },

    async findById(req: Request, res: Response) {
        const nasabah = await nasabahService.findById(req.params.id as string);
        if (!nasabah) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'Nasabah tidak ditemukan',
            });
        }
        return res.status(200).json(nasabah);
    },

    async update(req: Request, res: Response) {
        const parsed = UpdateNasabahSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                details: parsed.error.flatten().fieldErrors,
            });
        }

        try {
            const nasabah = await nasabahService.update(req.params.id as string, parsed.data);
            return res.status(200).json(nasabah);
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                if (err.code === "P2025") {
                    return res.status(404).json({
                        error: 'NOT_FOUND',
                        message: 'Nasabah tidak ditemukan',
                    });
                }
                if (err.code === "P2002") {
                    const field = (err.meta?.target as string[])?.[0] ?? "field";
                    return res.status(409).json({
                        error: 'DUPLICATE_ENTRY',
                        message: `${field} sudah terdaftar`,
                    });
                }
            }
            throw err;
        }
    },

    async remove(req: Request, res: Response) {
        const idParsed = IdParamSchema.safeParse(req.params.id);
        if (!idParsed.success) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Format ID tidak valid',
                details: idParsed.error.flatten().formErrors,
            });
        }

        const existing = await nasabahService.findById(idParsed.data);
        if (!existing) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'Nasabah tidak ditemukan atau sudah dihapus sebelumnya',
            });
        }

        try {
            await nasabahService.remove(idParsed.data);
            return res.status(200).json({
                success: true,
                message: 'Nasabah berhasil dihapus',
                data: { id: existing.id, nama: existing.nama },
            });
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                // P2025 di sini = race condition: dihapus oleh request lain
                // setelah pengecekan existing di atas.
                if (err.code === "P2025") {
                    return res.status(409).json({
                        error: 'ALREADY_DELETED',
                        message: 'Nasabah sudah dihapus oleh proses lain',
                    });
                }
                // P2003 = FK constraint — nasabah masih punya tabungan.
                if (err.code === "P2003") {
                    return res.status(409).json({
                        error: 'CONSTRAINT_VIOLATION',
                        message: 'Nasabah masih memiliki tabungan aktif, hapus tabungan terlebih dahulu',
                    });
                }
            }
            throw err;
        }
    },
};
