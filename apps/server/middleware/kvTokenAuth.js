/**
 * KV接口专用Token认证中间件
 *
 * 仅验证app token，设置设备和应用信息到res.locals
 * 适用于所有KV相关的接口
 */
import errors from "../utils/errors.js";
import { prisma } from "../utils/prisma.js";

/**
 * KV Token认证中间件
 * 从请求中提取token（支持多种方式），验证后将设备和应用信息注入到res.locals
 */
export const kvTokenAuth = async (req, res, next) => {
    try {
        // 从多种途径获取token
        const token = extractToken(req);

        if (!token) {
            return next(errors.createError(401, "需要提供有效的token"));
        }

        // 查找token对应的应用安装信息
        const appInstall = await prisma.appInstall.findUnique({
            where: {token},
            include: {
                device: true,
            },
        });

        if (!appInstall) {
            return next(errors.createError(401, "无效的token"));
        }

        // 将信息存储到res.locals供后续使用
        res.locals.device = appInstall.device;
        res.locals.appInstall = appInstall;
        res.locals.deviceId = appInstall.device.id;
        res.locals.token = token;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * 从请求中提取token
 * 支持的方式：
 * 1. Header: x-app-token
 * 2. Query: token 或 apptoken
 * 3. Body: token 或 apptoken
 */
function extractToken(req) {
    // 优先从 Authorization header 提取 Bearer token（支持大小写）
    const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
    if (authHeader) {
        const m = authHeader.match(/^Bearer\s+(.+)$/i);
        if (m) return m[1];
    }

    return (
        req.headers["x-app-token"] ||
        req.query.token ||
        req.query.apptoken ||
        (req.body && req.body.token) ||
        (req.body && req.body.apptoken)
    );
}