import type { Request, Response } from 'express';
import { z } from 'zod';
import { SetorSchema, TarikSchema, SetorQrisSchema, TabunganIdParamSchema } from './transaksi.schema';
import {
    transaksiService,
    TabunganNotFoundError,
    TabunganNotActiveError,
    SaldoTidakCukupError,
    QrisSaldoKurangError,
    IdempotencyKeyConflictError,
} from './transaksi.service';

const handleMutasiError = (err: unknown, res: Response) => {
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
    if (err instanceof SaldoTidakCukupError) {
        return res.status(409).json({
            error: 'SALDO_TIDAK_CUKUP',
            message: 'Saldo tidak mencukupi untuk penarikan',
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
    return null;
};

const runMutasi = async (
    req: Request,
    res: Response,
    schema: typeof SetorSchema | typeof TarikSchema,
    action: (data: z.infer<typeof schema>) => Promise<unknown>,
) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: 'VALIDATION_ERROR',
            details: parsed.error.flatten().fieldErrors,
        });
    }

    try {
        const transaksi = await action(parsed.data);
        return res.status(201).json(transaksi);
    } catch (err) {
        const handled = handleMutasiError(err, res);
        if (handled) return handled;
        throw err;
    }
};

export const transaksiController = {
    setor: (req: Request, res: Response) =>
        runMutasi(req, res, SetorSchema, transaksiService.setor),

    tarik: (req: Request, res: Response) =>
        runMutasi(req, res, TarikSchema, transaksiService.tarik),

    async setorQris(req: Request, res: Response) {
        const idempotencyKey = req.header('Idempotency-Key');
        if (!idempotencyKey || idempotencyKey.trim() === '') {
            return res.status(400).json({
                error: 'MISSING_IDEMPOTENCY_KEY',
                message: 'Header Idempotency-Key wajib diisi',
            });
        }

        const idParsed = TabunganIdParamSchema.safeParse(req.params.tabunganId);
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
            const { transaksi, replay } = await transaksiService.setorQris({
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
            const handled = handleMutasiError(err, res);
            if (handled) return handled;
            throw err;
        }
    },

    async findByTabungan(req: Request, res: Response) {
        const data = await transaksiService.findByTabungan(req.params.tabunganId as string);
        return res.status(200).json({
            data,
            total: data.length,
        });
    },

    async findById(req: Request, res: Response) {
        const transaksi = await transaksiService.findById(req.params.id as string);
        if (!transaksi) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'Transaksi tidak ditemukan',
            });
        }
        return res.status(200).json(transaksi);
    },
};
