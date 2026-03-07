import { type Request, type Response } from "express";
import {
    deleteUser as deleteUserService,
    getUserById as getUserByIdService,
    getUsers as getUsersService,
} from "../services/userServices";

export const getUsers = async (req: Request, res: Response) => {
    const result = await getUsersService();
    res.status(result.status).send(result.data);
}


export const getUserById = async (req: Request, res: Response) => {
    const id: number = Number(req.params.id);
    const result = await getUserByIdService(id);

    if (result.message) {
        res.status(result.status).send({ message: result.message });
        return;
    }

    res.status(result.status).send(result.data);
}

export const deleteUser = async (req: Request, res: Response) => {
    const id: number = Number(req.params.id);
    const result = await deleteUserService(id);

    if (result.message) {
        res.status(result.status).send({ message: result.message });
        return;
    }

    res.status(result.status).send(result.data);
}