import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { nasabahRoutes } from "./modules/nasabah/nasabah.route";
import { tabunganRoutes } from "./modules/tabungan/tabungan.route";
import { transaksiRoutes } from "./modules/transaksi/transaksi.route";

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

app.use("/api/v1/nasabah", nasabahRoutes);
app.use("/api/v1/tabungan", tabunganRoutes);
// Alias matching spec endpoint POST /api/v1/tabungan-haji/:id/setor.
app.use("/api/v1/tabungan-haji", tabunganRoutes);
app.use("/api/v1/transaksi", transaksiRoutes);

app.listen(port, () => {
  console.log(`Tabungan Haji API listening on port ${port}`);
});
