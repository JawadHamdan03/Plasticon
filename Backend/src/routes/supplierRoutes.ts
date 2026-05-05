import { Router } from "express";
import {
    getAllSuppliersHandler,
    createSupplierHandler,
    updateSupplierHandler,
    deleteSupplierHandler,
} from "../controllers/supplierController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get(
    "/",
    authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN, UserRole.ENGINEER]),
    getAllSuppliersHandler
);

router.post(
    "/",
    authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
    createSupplierHandler
);

router.patch(
    "/:id",
    authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
    updateSupplierHandler
);

router.delete(
    "/:id",
    authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
    deleteSupplierHandler
);

export default router;
