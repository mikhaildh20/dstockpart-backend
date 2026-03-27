import express from "express";
import { getSections } from "../controllers/section.controller.js";

const router = express.Router();

router.get("/", getSections);

export default router;