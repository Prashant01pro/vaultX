import app from "./app.js";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv"

dotenv.config()

const PORT= process.env.PORT || 5000;
const mongoDBPORT=process.env.MONGO_URI || 'mongodb://127.0.0.1:27017'

connectDB(mongoDBPORT)

app.listen(PORT,()=>{
    console.log(`server is runnig at http://localhost:${PORT}`)
})