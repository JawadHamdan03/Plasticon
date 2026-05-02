import { Router } from "express";
import {
    createInventoryTransactionHandler,
    getInventoryTransactionsHandler,
    getMyInventoryTransactionsHandler,
    getRawMaterialsStockHandler,
} from "../controllers/inventoryController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.post(
    "/transactions",
    authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
    createInventoryTransactionHandler
);

router.get(
    "/transactions/all",
    authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
    getInventoryTransactionsHandler
);

router.get(
    "/transactions/me",
    authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
    getMyInventoryTransactionsHandler
);

router.get(
    "/materials",
    authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN, UserRole.ENGINEER]),
    getRawMaterialsStockHandler
);

export default router;
