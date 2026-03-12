import { Router } from "express";
import {
    createSaleHandler,
    getAllSalesHandler,
    getMySalesHandler,
} from "../controllers/saleController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.post("/", authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]), createSaleHandler);
router.get("/all", authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]), getAllSalesHandler);
router.get("/me", authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]), getMySalesHandler);

export default router;
