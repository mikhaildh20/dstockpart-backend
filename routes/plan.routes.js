import express from "express";
import * as planController from "../controllers/plan.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", planController.getPlans);
router.get("/current-shift", planController.getCurrentShift);
router.get("/models", planController.getPlanModels);
router.get("/base-items", planController.getBasePlanningItems);
router.get("/parts-by-model/:modelId", planController.getPartsByModel);
router.get("/:id", planController.getPlanById);
router.post("/create", verifyToken, planController.createPlan);
router.put("/update", verifyToken, planController.updatePlan);

export default router;
