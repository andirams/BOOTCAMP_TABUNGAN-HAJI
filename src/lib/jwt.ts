import { randomUUID } from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "1d") as SignOptions["expiresIn"];

export interface AuthTokenPayload {
    sub: string;
    email: string;
    jti: string;
}

export const signToken = (payload: { sub: string; email: string }): string =>
    jwt.sign({ email: payload.email }, JWT_SECRET, {
        subject: payload.sub,
        expiresIn: JWT_EXPIRES_IN,
        jwtid: randomUUID(),
    });

export const verifyToken = (token: string): AuthTokenPayload => {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string" || !decoded.sub || !decoded.jti) {
        throw new jwt.JsonWebTokenError("Payload token tidak valid");
    }
    return {
        sub: decoded.sub,
        email: (decoded as { email?: string }).email ?? "",
        jti: decoded.jti,
    };
};
