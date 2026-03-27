import express from "express";
import { getParts } from "../controllers/part.controller.js";

const router = express.Router();

router.get("/", getParts);

export default router;