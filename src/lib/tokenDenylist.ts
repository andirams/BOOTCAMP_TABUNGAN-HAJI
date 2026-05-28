// Denylist token untuk logout. JWT bersifat stateless, jadi token yang sudah logout
// disimpan jti-nya di sini agar middleware bisa menolaknya sebelum kedaluwarsa.
// Catatan: in-memory — denylist hilang saat server restart, dan entri tidak di-prune
// saat tokennya kedaluwarsa. Cukup untuk kebutuhan latihan.
const denylist = new Set<string>();

export const revoke = (jti: string): void => {
    denylist.add(jti);
};

export const isRevoked = (jti: string): boolean => denylist.has(jti);
