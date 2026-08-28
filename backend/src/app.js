import express from "express"
import cookieParser from "cookie-parser"
import cors from 'cors'
import { globalErrorHandler } from "./middlewares/error.middleware.js";

import authRouter from "./features/auth/auth.route.js"
import userRouter from './features/users/user.route.js'

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-csrf-Token']
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// why use this here , not in specific file or folder
app.use(cookieParser())

app.use('/auth', authRouter)
app.use('/users',userRouter)

app.get('/health', (req, res) => {
    res.status(200).json({
        message: "server is running"
    })
})

app.use(globalErrorHandler);

export default app;