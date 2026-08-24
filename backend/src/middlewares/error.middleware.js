export const globalErrorHandler=(err,req,res,next)=>{
    const statusCode=err.statusCode || 500;
    res.status(statusCode).json({
        status:err.status || 'error',
        message:err.message || "Something went wrong"
    })
}