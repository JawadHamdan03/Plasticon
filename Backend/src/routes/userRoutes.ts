import { Router } from 'express'
import { getUsers, getUserById, deleteUser } from '../controllers/userController'
const router = Router()




router.get("/all", getUsers)
router.get("/:id", getUserById)
router.delete("/:id", deleteUser)



export default router