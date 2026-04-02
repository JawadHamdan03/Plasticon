import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import { authorizeRoles } from "../middleware/authMiddleware";
import {
    createNotificationHandler,
    getMyNotificationsHandler,
    getUnreadNotificationCountHandler,
    markAllNotificationsAsReadHandler,
    markNotificationAsReadHandler,
} from "../controllers/notificationController";

const router = Router();

const allRoles = [UserRole.WORKER, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.ADMIN];

router.get("/", authorizeRoles(allRoles), getMyNotificationsHandler);
router.get("/unread-count", authorizeRoles(allRoles), getUnreadNotificationCountHandler);
router.patch("/:id/read", authorizeRoles(allRoles), markNotificationAsReadHandler);
router.patch("/read-all", authorizeRoles(allRoles), markAllNotificationsAsReadHandler);

router.post("/", authorizeRoles([UserRole.ADMIN]), createNotificationHandler);

export default router;
