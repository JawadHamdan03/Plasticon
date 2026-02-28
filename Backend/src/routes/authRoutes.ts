import { Router, type Request, type Response } from "express";
import { registerHandler, loginHandler, logoutHandler } from "../controllers/authController";

const router = Router();

router.post("/register", registerHandler);

router.post("/login", loginHandler);

router.post("/logout", logoutHandler);




export default router;