import { Router } from "express";
import {
    createQualityCheckHandler,
    getAllQualityChecksHandler,
    getMyQualityChecksHandler,
} from "../controllers/qualityController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.post(
    "/",
    authorizeRoles([UserRole.ENGINEER]),
    createQualityCheckHandler
);

router.get(
    "/me",
    authorizeRoles([UserRole.ENGINEER]),
    getMyQualityChecksHandler
);

router.get(
    "/all",
    authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
    getAllQualityChecksHandler
);

export default router;
