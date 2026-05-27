import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import {
    CreateTabunganSchema,
    SetorQrisSchema,
    TabunganIdParamSchema,
    UpdateStatusSchema,
} from './tabungan.schema';
import {
    tabunganService,
    QrisSaldoKurangError,
    IdempotencyKeyConflictError,
} from './tabungan.service';
import {
    TabunganNotFoundError,
    TabunganNotActiveError,
    transaksiService,
} from '../transaksi/transaksi.service';

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

    async getMutasi(req: Request, res: Response) {
        const idParsed = TabunganIdParamSchema.safeParse(req.params.id);
        if (!idParsed.success) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Format ID tabungan tidak valid',
            });
        }

        const tabungan = await tabunganService.findById(idParsed.data);
        if (!tabungan) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'Tabungan tidak ditemukan',
            });
        }

        const mutasi = await transaksiService.findByTabungan(idParsed.data);

        return res.status(200).json({
            tabungan: {
                id: tabungan.id,
                nomorRekening: tabungan.nomorRekening,
                status: tabungan.status,
                saldo: tabungan.saldo,
                nasabah: tabungan.nasabah,
            },
            total: mutasi.length,
            mutasi,
        });
    },

    async setorQris(req: Request, res: Response) {
        const idempotencyKey = req.header('Idempotency-Key');
        if (!idempotencyKey || idempotencyKey.trim() === '') {
            return res.status(400).json({
                error: 'MISSING_IDEMPOTENCY_KEY',
                message: 'Header Idempotency-Key wajib diisi',
            });
        }

        const idParsed = TabunganIdParamSchema.safeParse(req.params.id);
        if (!idParsed.success) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Format ID tabungan tidak valid',
            });
        }

        const bodyParsed = SetorQrisSchema.safeParse(req.body);
        if (!bodyParsed.success) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                details: bodyParsed.error.flatten().fieldErrors,
            });
        }

        try {
            const { transaksi, replay } = await tabunganService.setorQris({
                tabunganId: idParsed.data,
                idempotencyKey,
                data: bodyParsed.data,
            });
            return res.status(replay ? 200 : 201).json({
                success: true,
                replay,
                message: replay
                    ? 'Transaksi sudah pernah diproses (replay aman)'
                    : 'Setoran QRIS berhasil',
                data: transaksi,
            });
        } catch (err) {
            if (err instanceof TabunganNotFoundError) {
                return res.status(404).json({
                    error: 'NOT_FOUND',
                    message: 'Tabungan tidak ditemukan',
                });
            }
            if (err instanceof TabunganNotActiveError) {
                return res.status(409).json({
                    error: 'TABUNGAN_NOT_ACTIVE',
                    message: `Tabungan berstatus ${err.status}, transaksi ditolak`,
                });
            }
            if (err instanceof QrisSaldoKurangError) {
                return res.status(402).json({
                    error: 'QRIS_SALDO_KURANG',
                    message: 'Saldo sumber QRIS nasabah tidak mencukupi',
                });
            }
            if (err instanceof IdempotencyKeyConflictError) {
                return res.status(409).json({
                    error: 'IDEMPOTENCY_KEY_CONFLICT',
                    message: 'Idempotency-Key sudah dipakai untuk request berbeda',
                });
            }
            throw err;
        }
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
