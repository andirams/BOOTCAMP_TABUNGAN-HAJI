import type { Request, Response } from "express";
import { LoginSchema, RegisterSchema } from "./auth.schema";
import {
    AlreadyRegisteredError,
    InvalidCredentialsError,
    NasabahNotFoundError,
    authService,
} from "./auth.service";
import { nasabahService } from "../nasabah/nasabah.service";

export const authController = {
    async register(req: Request, res: Response) {
        const parsed = RegisterSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                details: parsed.error.flatten().fieldErrors,
            });
        }

        try {
            const nasabah = await authService.register(parsed.data);
            return res.status(200).json({
                success: true,
                message: "Registrasi berhasil, silakan login",
                nasabah,
            });
        } catch (err) {
            if (err instanceof NasabahNotFoundError) {
                return res.status(404).json({
                    error: "NOT_FOUND",
                    message: "Nasabah dengan email tersebut tidak ditemukan",
                });
            }
            if (err instanceof AlreadyRegisteredError) {
                return res.status(409).json({
                    error: "ALREADY_REGISTERED",
                    message: "Email ini sudah memiliki password, silakan login",
                });
            }
            throw err;
        }
    },

    async login(req: Request, res: Response) {
        const parsed = LoginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                details: parsed.error.flatten().fieldErrors,
            });
        }

        try {
            const result = await authService.login(parsed.data);
            return res.status(200).json(result);
        } catch (err) {
            if (err instanceof InvalidCredentialsError) {
                return res.status(401).json({
                    error: "INVALID_CREDENTIALS",
                    message: "Email atau password salah",
                });
            }
            throw err;
        }
    },

    logout(req: Request, res: Response) {
        authService.logout(req.user!.jti);
        return res.status(200).json({
            success: true,
            message: "Logout berhasil, token telah di-invalidasi",
        });
    },

    async me(req: Request, res: Response) {
        const nasabah = await nasabahService.findById(req.user!.id);
        if (!nasabah) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Nasabah tidak ditemukan",
            });
        }
        return res.status(200).json(nasabah);
    },
};
