import express from "express"
import { globalErrorHandler } from "./middlewares/error.middleware.js";
import authRouter from "./features/auth/auth.route.js"
import cookieParser from "cookie-parser"

const app = express();

app.use(express.json())
app.use(express.urlencoded({extended:true}))

// why use this here , not in specific file or folder
app.use(cookieParser())

app.use('/auth',authRouter)

app.get('/health',(req,res)=>{
    res.status(200).json({
        message: "server is running"
    })
})

app.use(globalErrorHandler);

export default app;