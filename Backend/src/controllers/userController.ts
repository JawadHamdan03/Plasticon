import { type Request, type Response } from "express"
import { prisma } from '../config/lib/prisma'

export const getUsers = async (req: Request, res: Response) => {
    const users = await prisma.user.findMany()
    res.status(200).send(users)
}


export const getUserById = async (req: Request, res: Response) => {
    const id: number = Number(req.params.id)
    const user = await prisma.user.findFirst({ where: { id: id } })
    if (!user) {
        res.status(404).send({ message: "there is no user with this id" })
    }
    res.status(200).send(user)
}

export const deleteUser = async (req: Request, res: Response) => {
    const id: number = Number(req.params.id)
    const op = await prisma.user.delete({
        where: { id: id }
    })

    if (!op) {
        res.status(404).send({ message: "user with this id were not found" })
    }
    res.status(200).send({ message: "Deleted successfully" })
}