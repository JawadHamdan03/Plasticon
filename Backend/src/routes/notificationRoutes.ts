import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import { authorizeRoles } from "../middleware/authMiddleware";
import {
    createNotificationHandler,
    getMyNotificationsHandler,
    getUnreadNotificationCountHandler,
    markAllNotificationsAsReadHandler,
    markNotificationAsReadHandler,
    registerPushTokenHandler,
    unregisterPushTokenHandler,
} from "../controllers/notificationController";

const router = Router();

const allRoles = [UserRole.WORKER, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.ADMIN, UserRole.SALES_REP];

router.get("/", authorizeRoles(allRoles), getMyNotificationsHandler);
router.get("/unread-count", authorizeRoles(allRoles), getUnreadNotificationCountHandler);
router.patch("/:id/read", authorizeRoles(allRoles), markNotificationAsReadHandler);
router.patch("/read-all", authorizeRoles(allRoles), markAllNotificationsAsReadHandler);

router.post("/", authorizeRoles([UserRole.ADMIN]), createNotificationHandler);

router.post("/push-token", authorizeRoles(allRoles), registerPushTokenHandler);
router.delete("/push-token", authorizeRoles(allRoles), unregisterPushTokenHandler);

export default router;
