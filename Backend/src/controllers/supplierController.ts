import { Request, Response } from "express";
import {
    getAllSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
} from "../services/supplierServices";

export const getAllSuppliersHandler = async (_req: Request, res: Response) => {
    try {
        const result = await getAllSuppliers();
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get suppliers error:", error);
        res.status(500).json({ message: "Failed to fetch suppliers" });
    }
};

export const createSupplierHandler = async (req: Request, res: Response) => {
    try {
        const result = await createSupplier(req.body);
        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Create supplier error:", error);
        res.status(500).json({ message: "Failed to create supplier" });
    }
};

export const updateSupplierHandler = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const result = await updateSupplier(id, req.body);
        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Update supplier error:", error);
        res.status(500).json({ message: "Failed to update supplier" });
    }
};

export const deleteSupplierHandler = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const result = await deleteSupplier(id);
        if (result.message && result.status !== 200) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Delete supplier error:", error);
        res.status(500).json({ message: "Failed to delete supplier" });
    }
};
