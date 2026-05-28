import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyToken } from "../lib/jwt";
import { isRevoked } from "../lib/tokenDenylist";

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; email: string; jti: string };
        }
    }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "UNAUTHORIZED",
            message: "Token tidak ada. Sertakan header Authorization: Bearer <token>",
        });
    }

    const token = header.slice("Bearer ".length).trim();

    let payload;
    try {
        payload = verifyToken(token);
    } catch (err) {
        const message =
            err instanceof jwt.TokenExpiredError
                ? "Token sudah kedaluwarsa"
                : "Token tidak valid";
        return res.status(401).json({ error: "TOKEN_INVALID", message });
    }

    if (isRevoked(payload.jti)) {
        return res.status(401).json({
            error: "TOKEN_REVOKED",
            message: "Token sudah logout, silakan login kembali",
        });
    }

    req.user = { id: payload.sub, email: payload.email, jti: payload.jti };
    next();
};
