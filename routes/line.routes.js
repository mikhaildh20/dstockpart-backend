import express from "express";
import { getLines } from "../controllers/line.controller.js";

const router = express.Router();

router.get("/", getLines);

export default router;