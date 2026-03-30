import express from "express";
import * as lineController from "../controllers/line.controller.js";

const router = express.Router();

router.get("/", lineController.getLines);
router.post("/create", lineController.createLine);
router.get("/:id", lineController.getLineById);
router.put("/update", lineController.updateLine);
router.post("/toggle-status", lineController.toggleLineStatus);

export default router;