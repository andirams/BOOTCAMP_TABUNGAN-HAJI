import { Router } from "express";
import { transaksiController } from "./transaksi.controller";

export const transaksiRoutes = Router();

transaksiRoutes.post("/setor", transaksiController.setor);
transaksiRoutes.post("/tarik", transaksiController.tarik);
transaksiRoutes.get("/tabungan/:tabunganId", transaksiController.findByTabungan);
transaksiRoutes.get("/:id", transaksiController.findById);
