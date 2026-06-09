import { type Request, type Response } from "express";
import {
  deleteUser as deleteUserService,
  getUserById as getUserByIdService,
  getUsers as getUsersService,
  updateUser as updateUserService,
  updateUserRole as updateUserRoleService,
} from "../services/userServices";

export const getUsers = async (req: Request, res: Response) => {
  const role = typeof req.query.role === "string" ? req.query.role : undefined;
  const result = await getUsersService(role);
  res.status(result.status).send(result.data);
};

export const getUserById = async (req: Request, res: Response) => {
  const id: number = Number(req.params.id);
  const result = await getUserByIdService(id);

  if (result.message) {
    res.status(result.status).send({ message: result.message });
    return;
  }

  res.status(result.status).send(result.data);
};

export const deleteUser = async (req: Request, res: Response) => {
  const id: number = Number(req.params.id);
  const result = await deleteUserService(id);

  if (result.message) {
    res.status(result.status).send({ message: result.message });
    return;
  }

  res.status(result.status).send(result.data);
};

export const updateUser = async (req: Request, res: Response) => {
  const id: number = Number(req.params.id);
  const result = await updateUserService(id, req.body);

  if (result.message) {
    res.status(result.status).send({ message: result.message });
    return;
  }

  res.status(result.status).send(result.data);
};

export const updateUserRole = async (req: Request, res: Response) => {
  const id: number = Number(req.params.id);
  const newRole = req.body?.role;
  const result = await updateUserRoleService(id, String(newRole));

  if (result.message) {
    res.status(result.status).send({ message: result.message });
    return;
  }

  res.status(result.status).send(result.data);
};
