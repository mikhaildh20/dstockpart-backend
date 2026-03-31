import express from "express";
import * as wipController from "../controllers/wip.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", wipController.getWipModels);
router.get("/:modelId/detail", wipController.getWipModelDetail);
router.get("/:modelId/logs", wipController.getWipLogs);
router.post("/save-current", verifyToken, wipController.saveWipCurrent);

export default router;
