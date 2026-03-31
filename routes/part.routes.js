import express from "express";
import * as partController from "../controllers/part.controller.js";

const router = express.Router();

router.get("/", partController.getParts);
router.post("/create", partController.createPart);
router.get("/:id", partController.getPartById);
router.put("/update", partController.updatePart);
router.post("/toggle-status", partController.togglePartStatus);
router.post("/assign-to-model", partController.assignPartsToModel);
router.get("/:id/detail-sections", partController.getPartSectionDetails);
router.post("/save-detail-sections", partController.savePartSectionDetails);

export default router;
