import rateLimit from "express-rate-limit";

// 获取客户端真实IP的函数
export const getClientIp = (req) => {
    return (
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket?.remoteAddress ||
        "0.0.0.0"
    );
};

// 从请求中提取Token的函数
const extractToken = (req) => {
    return (
        req.headers["x-app-token"] ||
        req.query.apptoken ||
        req.body?.apptoken ||
        null
    );
};

// 获取限速键：优先使用token，没有token则使用IP
export const getRateLimitKey = (req) => {
    const token = extractToken(req);
    if (token) {
        return `token:${token}`;
    }
    return `ip:${getClientIp(req)}`;
};

// 纯基于Token的keyGenerator，用于KV Token专用路由
// 这个函数假设token已经通过中间件设置在req对象上
export const getTokenOnlyKey = (req) => {
    // 尝试从多个位置获取token
    const token =
        req.locals?.token ||           // 如果token被设置在req.locals中
        req.res?.locals?.token ||      // 如果token在res.locals中
        extractToken(req);             // 从headers/query/body提取

    if (!token) {
        // 如果没有token，返回一个特殊键用于统一限制
        return "no-token";
    }
    return `token:${token}`;
};

// 创建一个中间件来将res.locals.token复制到req.locals.token，以便限速器使用
export const prepareTokenForRateLimit = (req, res, next) => {
    if (res.locals.token) {
        req.locals = req.locals || {};
        req.locals.token = res.locals.token;
    }
    next();
};


// 认证相关路由限速器（防止暴力破解）
export const authLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 30分钟
    limit: 5, // 每个IP在windowMs时间内最多允许5次认证尝试
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "认证请求过于频繁，请30分钟后再试",
    keyGenerator: getClientIp,
    skipSuccessfulRequests: true, // 成功的认证不计入限制
    skipFailedRequests: false, // 失败的认证计入限制
});

// === Token 专用限速器（更宽松的限制，纯基于Token） ===

// Token 读操作限速器
export const tokenReadLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1分钟
    limit: 1024, // 每个token在1分钟内最多1024次读操作
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "读操作请求过于频繁，请稍后再试",
    keyGenerator: getTokenOnlyKey,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
});

// Token 写操作限速器
export const tokenWriteLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1分钟
    limit: 512, // 每个token在1分钟内最多512次写操作
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "写操作请求过于频繁，请稍后再试",
    keyGenerator: getTokenOnlyKey,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
});

// Token 删除操作限速器
export const tokenDeleteLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1分钟
    limit: 256, // 每个token在1分钟内最多256次删除操作
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "删除操作请求过于频繁，请稍后再试",
    keyGenerator: getTokenOnlyKey,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
});

// Token 批量操作限速器
export const tokenBatchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1分钟
    limit: 128, // 每个token在1分钟内最多128次批量操作
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "批量操作请求过于频繁，请稍后再试",
    keyGenerator: getTokenOnlyKey,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
});
