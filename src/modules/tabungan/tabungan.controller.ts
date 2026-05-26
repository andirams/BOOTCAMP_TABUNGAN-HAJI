import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { CreateTabunganSchema, UpdateStatusSchema } from './tabungan.schema';
import { tabunganService } from './tabungan.service';

export const tabunganController = {
    async create(req: Request, res: Response) {
        const parsed = CreateTabunganSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                details: parsed.error.flatten().fieldErrors,
            });
        }

        try {
            const tabungan = await tabunganService.create(parsed.data);
            return res.status(201).json(tabungan);
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                // P2003 = FK violation → nasabahId tidak ada.
                if (err.code === "P2003") {
                    return res.status(404).json({
                        error: 'NOT_FOUND',
                        message: 'Nasabah tidak ditemukan',
                    });
                }
                if (err.code === "P2002") {
                    return res.status(409).json({
                        error: 'DUPLICATE_ENTRY',
                        message: 'Nomor rekening bentrok, silakan coba lagi',
                    });
                }
            }
            throw err;
        }
    },

    async findAll(req: Request, res: Response) {
        const nasabahId = typeof req.query.nasabahId === 'string' ? req.query.nasabahId : undefined;
        const data = await tabunganService.findAll(nasabahId);
        return res.status(200).json({
            data,
            total: data.length,
        });
    },

    async findById(req: Request, res: Response) {
        const tabungan = await tabunganService.findById(req.params.id as string);
        if (!tabungan) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'Tabungan tidak ditemukan',
            });
        }
        return res.status(200).json(tabungan);
    },

    async findByNomorRekening(req: Request, res: Response) {
        const tabungan = await tabunganService.findByNomorRekening(req.params.nomor as string);
        if (!tabungan) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'Tabungan tidak ditemukan',
            });
        }
        return res.status(200).json(tabungan);
    },

    async updateStatus(req: Request, res: Response) {
        const parsed = UpdateStatusSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                details: parsed.error.flatten().fieldErrors,
            });
        }

        try {
            const tabungan = await tabunganService.updateStatus(req.params.id as string, parsed.data);
            return res.status(200).json(tabungan);
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
                return res.status(404).json({
                    error: 'NOT_FOUND',
                    message: 'Tabungan tidak ditemukan',
                });
            }
            throw err;
        }
    },
};
