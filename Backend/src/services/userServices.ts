import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

export const getUsers = async (): Promise<ServiceResult<unknown>> => {
    const users = await prisma.user.findMany();
    return { status: 200, data: users };
};

export const getUserById = async (id: number): Promise<ServiceResult<unknown>> => {
    const user = await prisma.user.findFirst({ where: { id: id } });
    if (!user) {
        return { status: 404, message: "there is no user with this id" };
    }

    return { status: 200, data: user };
};

export const deleteUser = async (id: number): Promise<ServiceResult<{ message: string }>> => {
    const user = await prisma.user.findFirst({ where: { id: id } });
    if (!user) {
        return { status: 404, message: "user with this id were not found" };
    }

    await prisma.user.delete({ where: { id: id } });
    return { status: 200, data: { message: "Deleted successfully" } };
};
