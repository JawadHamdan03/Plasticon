import { Request, Response } from "express";
import {
    loginUser,
    logoutUser,
    registerUser,
    type RegisterBody,
} from "../services/authServices";

export const registerHandler = async (req: Request, res: Response) => {
    try {
        if (!req.body) {
            res.status(400).json({ message: "Request body is required" });
            return;
        }

        const body = req.body as RegisterBody;
        const result = await registerUser(body);

        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }

        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Failed to register user" });
    }

}


export const loginHandler = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await loginUser(email, password, res);

    if (result.message) {
        res.status(result.status).send({ error: result.message });
        return;
    }

    res.status(result.status).json(result.data);
};

export const logoutHandler = async (_req: Request, res: Response) => {
    const result = logoutUser(res);
    res.status(result.status).send(result.data);
};