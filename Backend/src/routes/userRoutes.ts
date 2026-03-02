import { Router } from 'express'
import { getUsers, getUserById, deleteUser } from '../controllers/userController'
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router()

router.use(authMiddleware)

router.get("/all", authorizeRoles([UserRole.ADMIN]), getUsers)
router.get("/:id", authorizeRoles([UserRole.ADMIN]), getUserById)
router.delete("/:id", authorizeRoles([UserRole.ADMIN]), deleteUser)



export default router