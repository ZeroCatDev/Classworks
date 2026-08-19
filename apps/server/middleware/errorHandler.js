import {isDevelopment} from "../utils/config.js";

const errorHandler = (err, req, res, next) => {
    // 判断响应是否已经发送
    if (res.headersSent) {
        return next(err);
    }
    console.error(err);

    try {
        if (isDevelopment) {
            // 输出错误信息到控制台
            console.error("Error occurred:");
            console.error(err);
        }
        // 提取错误信息
        const statusCode = err.statusCode || err.status || 500;
        const message = err.message || "服务器错误";
        const details = err.details || null;
        const code = err.code || undefined;

        // 返回统一格式的错误响应
        return res.status(statusCode).json({
            success: false,
            message: message,
            code: code,
            details: details,
            error:
                process.env.NODE_ENV === "production"
                    ? undefined
                    : {
                        stack: err.stack,
                        originalError: err.originalError
                            ? err.originalError.message
                            : null,
                    },
        });
    } catch (handlerError) {
        // 处理器本身出错的兜底方案
        console.error("Error in error handler:", handlerError);

        // 确保能返回响应
        return res.status(500).json({
            success: false,
            message: "服务器错误",
            details: "服务器处理错误时出现问题",
        });
    }
};

export default errorHandler;
