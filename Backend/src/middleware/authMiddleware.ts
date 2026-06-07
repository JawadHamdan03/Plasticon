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

export const authorizeRoles = (allowedRoles: UserRole[]) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        // Accept token from httpOnly cookie OR Authorization: Bearer header
        const token: string | undefined =
            req.cookies?.authToken ??
            (req.headers.authorization?.startsWith("Bearer ")
                ? req.headers.authorization.slice(7)
                : undefined)

        if (!token) {
            return res.status(401).send({ error: "Not authorized, no token" })
        }

        const secret = process.env.JWT_SECRET as string

        try {
            const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as { id: string }
            const userId = Number(decoded.id)
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, role: true }
            })

            if (!user) {
                return res.status(401).send({ message: "user no longer exist" })
            }

            req.user = { id: user.id, role: user.role }

            // Check role authorization
            const role = req.user.role
            if (!role || !allowedRoles.includes(role)) {
                return res.status(403).send({ message: "Access denied" })
            }

            // User authenticated and authorized - proceed
            next()
        }
        catch (err) {
            return res.status(401).send({ message: "Invalid or expired token" })
        }
    }
}

