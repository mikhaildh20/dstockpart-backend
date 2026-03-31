import express from "express";
import * as sectionController from "../controllers/section.controller.js";

const router = express.Router();

router.get("/", sectionController.getSections);
router.post("/create", sectionController.createSection);
router.get("/:id", sectionController.getSectionById);
router.put("/update", sectionController.updateSection);
router.post("/toggle-status", sectionController.toggleSectionStatus);


export default router;