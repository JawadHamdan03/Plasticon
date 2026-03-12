import { Router } from "express";
import {
    createPurchaseHandler,
    getAllPurchasesHandler,
    getMyPurchasesHandler,
} from "../controllers/purchaseController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.post("/", authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]), createPurchaseHandler);
router.get("/all", authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]), getAllPurchasesHandler);
router.get("/me", authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]), getMyPurchasesHandler);

export default router;
