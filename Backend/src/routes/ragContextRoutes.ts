import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { getUserContext, getProductionContext } from "../controllers/ragContextController";

const router = Router();

// Internal API key guard — only the RAG microservice can call these routes
const requireInternalKey = (req: Request, res: Response, next: NextFunction): void => {
  const key = req.headers["x-rag-key"];
  if (!key || key !== process.env.RAG_INTERNAL_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

router.use(requireInternalKey);

// GET /rag-context/user/:userId — full context for a specific user
router.get("/user/:userId", getUserContext);

// GET /rag-context/production?date=YYYY-MM-DD&shift=night — production data for a date/shift
router.get("/production", getProductionContext);

export default router;
