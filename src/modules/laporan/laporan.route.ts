import { Router } from "express";
import { laporanController } from "./laporan.controller";

export const laporanRoutes = Router();

// GET /api/v1/laporan/transaksi-bulanan?bulan=5&tahun=2026 -> unduh CSV.
laporanRoutes.get("/transaksi-bulanan", laporanController.transaksiBulanan);
