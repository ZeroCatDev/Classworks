/**
 * 纯账户JWT认证中间件
 *
 * 支持新的refresh token系统，验证access token
 * 如果access token即将过期，会在响应头中提供新的token
 * 适用于只需要账户验证的接口
 */

import {generateAccessToken, validateAccountToken, verifyAccessToken} from "../utils/tokenManager.js";
import {verifyToken} from "../utils/jwt.js";
import errors from "../utils/errors.js";
import { prisma } from "../utils/prisma.js";

/**
 * 新的JWT认证中间件（支持refresh token系统）
 */
export const jwtAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(errors.createError(401, "需要提供有效的JWT token"));
        }

        const token = authHeader.substring(7);

        try {
            // 尝试使用新的token验证系统
            const decoded = verifyAccessToken(token);

            // 验证账户并检查token版本
            const account = await validateAccountToken(decoded);

            // 将账户信息存储到res.locals
            res.locals.account = account;
            res.locals.tokenDecoded = decoded;

            // 检查token是否即将过期（剩余时间少于5分钟）
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = decoded.exp - now;

            if (timeUntilExpiry < 300) { // 5分钟 = 300秒
                // 生成新的access token
                const newAccessToken = generateAccessToken(account);
                res.set('X-New-Access-Token', newAccessToken);
                res.set('X-Token-Refreshed', 'true');
            }

            next();
        } catch (newTokenError) {
            // 如果新token系统验证失败，尝试旧的验证方式（向后兼容）
            try {
                const decoded = verifyToken(token);

                // 从数据库获取账户信息
                const account = await prisma.account.findUnique({
                    where: {id: decoded.accountId},
                });

                if (!account) {
                    return next(errors.createError(401, "账户不存在"));
                }

                // 将账户信息存储到res.locals
                res.locals.account = account;
                res.locals.tokenDecoded = decoded;
                res.locals.isLegacyToken = true; // 标记为旧版token

                next();
            } catch (legacyTokenError) {
                // 两种验证方式都失败
                if (newTokenError.name === 'JsonWebTokenError' || legacyTokenError.name === 'JsonWebTokenError') {
                    return next(errors.createError(401, "无效的JWT token"));
                }

                if (newTokenError.name === 'TokenExpiredError' || legacyTokenError.name === 'TokenExpiredError') {
                    // 统一的账户JWT过期返回
                    // message: JWT_EXPIRED（用于客户端稳定识别）
                    // code: AUTH_JWT_EXPIRED（业务错误码）
                    return next(errors.createError(401, "JWT_EXPIRED", null, "AUTH_JWT_EXPIRED"));
                }

                return next(errors.createError(401, "token验证失败"));
            }
        }
    } catch (error) {
        return next(errors.createError(500, "认证过程出错"));
    }
};

/**
 * 可选的JWT认证中间件
 * 如果提供了token则验证，没有提供则跳过
 */
export const optionalJwtAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        // 没有提供token，跳过认证
        return next();
    }

    // 有token则进行验证
    return jwtAuth(req, res, next);
};