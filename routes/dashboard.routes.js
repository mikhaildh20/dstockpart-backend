import express from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/models", dashboardController.getDashboardModels);
router.get("/shifts", dashboardController.getDashboardShifts);
router.get("/:modelId", dashboardController.getDashboardByModel);

export default router;
