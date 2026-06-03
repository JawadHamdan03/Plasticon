import { Router } from "express";
import {
    createQualityCheckHandler,
    getAllQualityChecksHandler,
    getMyQualityChecksHandler,
    resolveQualityCheckHandler,
    deleteQualityCheckHandler,
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

router.patch(
    "/:id/resolve",
    authorizeRoles([UserRole.ENGINEER]),
    resolveQualityCheckHandler
);

router.delete(
    "/:id",
    authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN]),
    deleteQualityCheckHandler
);

export default router;
