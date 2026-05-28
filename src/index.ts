import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRoutes } from "./modules/auth/auth.route";
import { nasabahRoutes } from "./modules/nasabah/nasabah.route";
import { tabunganRoutes } from "./modules/tabungan/tabungan.route";
import { transaksiRoutes } from "./modules/transaksi/transaksi.route";
import { laporanRoutes } from "./modules/laporan/laporan.route";
import { requireAuth } from "./middleware/auth.middleware";

// Express tidak bisa serialisasi BigInt by default; kolom saldo/nominal pakai BigInt.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "tabungan_haji_api",
    timestamp: new Date().toISOString(),
  });
});

// Publik: hanya /health (di atas) + auth login/register.
// (logout & me di dalam authRoutes sudah pakai requireAuth sendiri.)
app.use("/api/v1/auth", authRoutes);

// Guard global: semua endpoint di bawah ini wajib login.
app.use(requireAuth);

app.use("/api/v1/nasabah", nasabahRoutes);
app.use("/api/v1/tabungan", tabunganRoutes);
// Alias matching spec endpoint POST /api/v1/tabungan-haji/:id/setor.
app.use("/api/v1/tabungan-haji", tabunganRoutes);
app.use("/api/v1/transaksi", transaksiRoutes);
app.use("/api/v1/laporan", laporanRoutes);

app.listen(port, () => {
  console.log(`Tabungan Haji API listening on port ${port}`);
});
