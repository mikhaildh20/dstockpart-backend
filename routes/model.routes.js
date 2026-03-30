import express from "express";
import * as modelController from "../controllers/model.controller.js";

const router = express.Router();

router.get("/", modelController.getModels);
router.post("/create", modelController.createModel);
router.get("/:id", modelController.getModelById);
router.put("/update", modelController.updateModel);
router.post("/toggle-status", modelController.toggleModelStatus);

export default router;