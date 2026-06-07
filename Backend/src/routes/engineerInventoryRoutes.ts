import { Router } from "express";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";
import { upload } from "../utils/uploadHandler";
import {
  createOrUpdateInventoryHandler,
  addItemHandler,
  updateItemHandler,
  deleteItemHandler,
  submitInventoryHandler,
  getMyInventoriesHandler,
  getAllInventoriesHandler,
  getInventoryByIdHandler,
  setPriceHandler,
  reviewInventoryHandler,
  getTransferLogsHandler,
} from "../controllers/engineerInventoryController";

const router = Router();

const engineerAdmin = authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN]);
const adminAccountant = authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]);
const allAllowed = authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN, UserRole.ACCOUNTANT]);

// Engineer: create/update inventory report header
router.post("/", engineerAdmin, createOrUpdateInventoryHandler);

// Engineer: get own inventories
router.get("/mine", engineerAdmin, getMyInventoriesHandler);

// Engineer/Admin: equipment transfer / maintenance log feed
router.get("/transfers", engineerAdmin, getTransferLogsHandler);

// Admin/Accountant: get all inventories
router.get("/all", adminAccountant, getAllInventoriesHandler);

// Engineer: add item to inventory
router.post("/:inventoryId/items", engineerAdmin, upload.single("image"), addItemHandler);

// Engineer: submit inventory (sends notifications)
router.patch("/:inventoryId/submit", engineerAdmin, submitInventoryHandler);

// Accountant/Admin: set price for a part item
router.patch("/items/:itemId/price", adminAccountant, setPriceHandler);

// Engineer: update item
router.put("/items/:itemId", engineerAdmin, upload.single("image"), updateItemHandler);

// Engineer: delete item
router.delete("/items/:itemId", engineerAdmin, deleteItemHandler);

// Admin/Accountant: mark inventory as reviewed
router.patch("/:id/review", adminAccountant, reviewInventoryHandler);

// All allowed roles: get single inventory by id
router.get("/:id", allAllowed, getInventoryByIdHandler);

export default router;
