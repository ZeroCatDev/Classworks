/**
 * 创建标准错误对象
 * @param {number} statusCode - HTTP状态码
 * @param {string} [message] - 错误消息（推荐使用稳定的机器可读文本，如 JWT_EXPIRED）
 * @param {object} [details] - 附加信息
 * @param {string} [code] - 业务错误码（如 AUTH_JWT_EXPIRED）
 * @returns {object} 标准错误对象
 */
const createError = (statusCode, message, details = null, code = null) => {
    // 直接返回错误对象，不抛出异常
    const error = {
        statusCode: statusCode,
        message: message || '服务器错误',
        details: details,
        code: code || undefined,
    };
    return error;
};

/**
 * 创建标准成功响应
 * @param {object} data - 响应数据
 * @param {string} [message] - 可选的成功消息
 * @returns {object} 格式化的成功响应
 */
const createSuccessResponse = (data, message = null) => {
    return {
        success: true,
        message,
        data,
    };
};

/**
 * 错误处理函数 - 将错误传递给下一个中间件
 * @param {Error|object} error - 错误对象
 * @param {Function} next - Express中间件next函数
 */
const passError = (error, next) => {
    // 不管是什么类型的错误，统一转换并传递
    if (error instanceof Error) {
        // 如果是标准Error，则转换为HTTP错误并保留原始信息
        const httpError = {
            statusCode: error.statusCode || 500,
            message: error.message || '服务器错误',
            details: error.details || null,
            originalError: error
        };
        next(httpError);
    } else {
        // 已经是自定义错误对象结构，直接传递
        next(error);
    }
};

/**
 * 捕获异步错误的包装器
 * @param {Function} fn - 需要包装的异步函数
 * @returns {Function} 包装后的函数
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(error => {
            passError(error, next);
        });
    };
};

/**
 * 安全执行函数 - 捕获同步函数中的错误
 * @param {Function} fn - 需要安全执行的函数
 * @param {...any} args - 函数参数
 * @returns {[error, result]} 包含错误和结果的数组
 */
const trySafe = (fn, ...args) => {
    try {
        const result = fn(...args);
        return [null, result];
    } catch (error) {
        return [error, null];
    }
};

// 常用状态码
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
};

export default {
    createError,
    createSuccessResponse,
    passError,
    catchAsync,
    trySafe,
    HTTP_STATUS,
};
