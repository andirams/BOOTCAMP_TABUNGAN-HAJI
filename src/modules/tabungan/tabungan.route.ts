import { Router } from "express";
import { tabunganController } from "./tabungan.controller";

export const tabunganRoutes = Router();

tabunganRoutes.post("/", tabunganController.create);
tabunganRoutes.get("/", tabunganController.findAll);
tabunganRoutes.get("/:id", tabunganController.findById);
tabunganRoutes.get("/nomor/:nomor", tabunganController.findByNomorRekening);
tabunganRoutes.patch("/:id/status", tabunganController.updateStatus);
