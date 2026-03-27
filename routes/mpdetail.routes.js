import express from "express";
import { getMPDetails } from "../controllers/mpdetail.controller.js";

const router = express.Router();

router.get("/", getMPDetails);

export default router;