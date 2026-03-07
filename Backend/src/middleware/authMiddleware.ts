import jwt from 'jsonwebtoken'
import { prisma } from '../config/lib/prisma'
import { Request, Response, NextFunction } from 'express'
import { UserRole } from '../config/generated/prisma/client'

export type AuthenticatedRequest = Request & {
    user?: {
        id: number
        role: UserRole
    }
}


const authMiddleware = async (req: AuthenticatedRequest, res: Response) => {
    console.log("the request has passed the authentication middleware")

    let token: string = ""

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(' ')[1]
    }
    else if (req.cookies?.jwt) {
        token = req.cookies.jwt
    }


    if (!token) {
        return res.status(401).send({ error: "Not authorized, no token sent" })
    }

    const secret = process.env.JWT_SECRET as string

    try {
        const decoded = jwt.verify(token, secret) as { id: string }
        const userId = Number(decoded.id)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true }
        })

        if (!user) {
            return res.status(401).send({ message: "user no longer exist" })
        }

        req.user = { id: user.id, role: user.role }

    }
    catch (err) {
        return res.status(401).send({ message: "user no longer exist" })
    }


}

export const authorizeRoles = (allowedRoles: UserRole[]) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        await authMiddleware(req, res)
        const role = req.user?.role

        if (!role || !allowedRoles.includes(role)) {
            return res.status(403).send({ message: "Access denied" })
        }

        next()
    }
}