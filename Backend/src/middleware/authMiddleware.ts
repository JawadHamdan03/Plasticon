import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { Request, Response, NextFunction } from 'express'


export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    console.log("the request has passed the authentication middleware")

    let token: string = ""

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(' ')[1]
    }
    else if (req.cookies().jwt) {
        token = req.cookies().jwt
    }


    if (!token) {
        res.status(401).send({ error: "Not authorized, no token sent" })
    }

    const secret = process.env.JWT_SECRET as string

    try {
        const decoded = jwt.verify(token, secret) as { id: string }
        const userId = Number(decoded.id)
        const user = await prisma.user.findUnique(
            {
                where: { id: userId }
            }
        )

        if (!user)
            res.status(401).send({ message: "user no longer exist" })
        next()
    }
    catch (err) {
        return res.status(401).send({ message: "user no longer exist" })
    }


}