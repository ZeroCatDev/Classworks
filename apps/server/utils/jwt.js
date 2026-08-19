import jwt from 'jsonwebtoken';
import {
    generateAccessToken,
    generateTokenPair,
    refreshAccessToken,
    revokeAllTokens,
    revokeRefreshToken,
    verifyAccessToken,
} from './tokenManager.js';

// JWT 配置（支持 HS256 与 RS256）
const JWT_ALG = (process.env.JWT_ALG || 'HS256').toUpperCase();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// HS256 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// RS256 密钥对（PEM 格式字符串）
const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');

function getSignVerifyKeys() {
    if (JWT_ALG === 'RS256') {
        if (!JWT_PRIVATE_KEY || !JWT_PUBLIC_KEY) {
            throw new Error('RS256 需要同时提供 JWT_PRIVATE_KEY 与 JWT_PUBLIC_KEY');
        }
        return {signKey: JWT_PRIVATE_KEY, verifyKey: JWT_PUBLIC_KEY};
    }
    // 默认 HS256
    return {signKey: JWT_SECRET, verifyKey: JWT_SECRET};
}

/**
 * 签发JWT token（向后兼容）
 * @deprecated 建议使用 generateAccessToken
 */
export function signToken(payload) {
    const {signKey} = getSignVerifyKeys();
    return jwt.sign(payload, signKey, {
        expiresIn: JWT_EXPIRES_IN,
        algorithm: JWT_ALG,
    });
}

/**
 * 验证JWT token（向后兼容）
 * @deprecated 建议使用 verifyAccessToken
 */
export function verifyToken(token) {
    const {verifyKey} = getSignVerifyKeys();
    return jwt.verify(token, verifyKey, {algorithms: [JWT_ALG]});
}

/**
 * 为账户生成JWT token（向后兼容）
 * @deprecated 建议使用 generateTokenPair 获取完整的令牌对
 */
export function generateAccountToken(account) {
    return signToken({
        accountId: account.id,
        provider: account.provider,
        email: account.email,
        name: account.name,
        avatarUrl: account.avatarUrl,
    });
}

// 重新导出新的token管理功能
export {
    generateAccessToken,
    verifyAccessToken,
    generateTokenPair,
    refreshAccessToken,
    revokeAllTokens,
    revokeRefreshToken,
};