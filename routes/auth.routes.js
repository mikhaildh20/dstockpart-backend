import express from "express";
import {
  injectUserCredential,
  login,
  me,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/inject-user", injectUserCredential);
router.get("/me", verifyToken, me);

export default router;
