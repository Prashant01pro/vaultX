import mongoose from 'mongoose'

export const connectDB=async(PORT)=>{
    try{
        await mongoose.connect(PORT)
        console.log('Database is connected')

    }catch(err){
        console.log(err.message)
        process.exit(1)
    }


}