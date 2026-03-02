import { Router } from 'express'
import { getUsers, getUserById, deleteUser } from '../controllers/userController'
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router()

router.use(authMiddleware)

router.get("/all", getUsers)
router.get("/:id", getUserById)
router.delete("/:id", deleteUser)



export default router