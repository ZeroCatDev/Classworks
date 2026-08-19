import {Router} from "express";
import crypto from "crypto";
import {generateState, getCallbackURL, oauthProviders} from "../config/oauth.js";
import {generateTokenPair, refreshAccessToken, revokeAllTokens, revokeRefreshToken} from "../utils/jwt.js";
import {jwtAuth} from "../middleware/jwt-auth.js";
import errors from "../utils/errors.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

// 存储OAuth state，防止CSRF攻击（生产环境应使用Redis等）
const oauthStates = new Map();

// 生成PKCE code_verifier 和 code_challenge
function generatePkcePair() {
    const codeVerifier = crypto
        .randomBytes(32)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    const challenge = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    return {codeVerifier, codeChallenge: challenge};
}

/**
 * 生成安全的访问令牌
 */
function generateAccessToken() {
    return crypto.randomBytes(32).toString("hex");
}

/**
 * 获取支持的OAuth提供者列表
 * GET /accounts/oauth/providers
 */
router.get("/oauth/providers", (req, res) => {
    let providers = [];

    for (const [key, config] of Object.entries(oauthProviders)) {
        // 只返回已配置的提供者
        const pkceAllowed = !!config.pkce;
        if (config.clientId && (config.clientSecret || pkceAllowed)) {
            providers.push({
                id: key,
                name: config.name,
                displayName: config.displayName || config.name,
                icon: config.icon,
                color: config.color,               // 向后兼容
                brandColor: config.brandColor || config.color,
                textColor: config.textColor || "#ffffff",
                description: config.description,
                order: typeof config.order === 'number' ? config.order : 9999,
                authUrl: `/accounts/oauth/${key}`, // 前端用于发起认证的URL
                website: config.website,
            });
        }
    }

    // 按 order 排序（从小到大）
    providers = providers.sort((a, b) => a.order - b.order);

    res.json({
        success: true,
        data: providers,
    });
});

/**
 * 发起OAuth认证
 * GET /accounts/oauth/:provider
 *
 * Query参数:
 * - redirect_uri: 前端回调地址（可选）
 */
router.get("/oauth/:provider", (req, res) => {
    const {provider} = req.params;
    const {redirect_uri} = req.query;

    const providerConfig = oauthProviders[provider];
    if (!providerConfig) {
        return res.status(400).json({
            success: false,
            message: `不支持的OAuth提供者: ${provider}`,
        });
    }

    const pkceAllowed = !!providerConfig.pkce;
    if (!providerConfig.clientId || (!providerConfig.clientSecret && !pkceAllowed)) {
        return res.status(500).json({
            success: false,
            message: `OAuth提供者 ${provider} 未配置`,
        });
    }

    // 生成state参数
    const state = generateState();

    // PKCE: 若启用，为此次会话生成code_verifier/challenge
    let codeChallenge, codeVerifier;
    if (pkceAllowed) {
        const pair = generatePkcePair();
        codeVerifier = pair.codeVerifier;
        codeChallenge = pair.codeChallenge;
    }

    // 保存state和redirect_uri（5分钟过期）
    oauthStates.set(state, {
        provider,
        redirect_uri,
        timestamp: Date.now(),
        codeVerifier,
    });

    // 清理过期的state（超过5分钟）
    for (const [key, value] of oauthStates.entries()) {
        if (Date.now() - value.timestamp > 5 * 60 * 1000) {
            oauthStates.delete(key);
        }
    }

    // 构建授权URL
    const params = new URLSearchParams({
        client_id: providerConfig.clientId,
        redirect_uri: getCallbackURL(provider),
        scope: providerConfig.scope,
        state: state,
        response_type: "code",
    });

    // Google需要额外的参数
    if (provider === "google") {
        params.append("access_type", "offline");
        params.append("prompt", "consent");
    }

    if (pkceAllowed && codeChallenge) {
        params.append("code_challenge", codeChallenge);
        params.append("code_challenge_method", "S256");
    }

    const authUrl = `${providerConfig.authorizationURL}?${params.toString()}`;

    // 重定向到OAuth提供者
    res.redirect(authUrl);
});

/**
 * OAuth回调处理
 * GET /accounts/oauth/:provider/callback
 */
router.get("/oauth/:provider/callback", async (req, res) => {
    const {provider} = req.params;
    const {code, state, error} = req.query;

    // 如果OAuth提供者返回错误
    if (error) {
        const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const errorUrl = new URL(frontendBaseUrl);
        errorUrl.searchParams.append("error", error);
        errorUrl.searchParams.append("provider", provider);
        errorUrl.searchParams.append("success", "false");
        return res.redirect(errorUrl.toString());
    }

    // 验证state
    const stateData = oauthStates.get(state);
    if (!stateData || stateData.provider !== provider) {
        const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const errorUrl = new URL(frontendBaseUrl);
        errorUrl.searchParams.append("error", "invalid_state");
        errorUrl.searchParams.append("provider", provider);
        errorUrl.searchParams.append("success", "false");
        return res.redirect(errorUrl.toString());
    }

    // 删除已使用的state
    oauthStates.delete(state);

    const providerConfig = oauthProviders[provider];

    try {
        // 1. 使用授权码换取访问令牌
        let tokenResponse;
        if (providerConfig.tokenRequestFormat === 'json') {
            tokenResponse = await fetch(providerConfig.tokenURL, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_id: providerConfig.clientId,
                    ...(providerConfig.clientSecret ? {client_secret: providerConfig.clientSecret} : {}),
                    code: code,
                    grant_type: "authorization_code",
                    redirect_uri: getCallbackURL(provider),
                    // PKCE: 携带code_verifier
                    ...(stateData?.codeVerifier ? {code_verifier: stateData.codeVerifier} : {}),
                }),
            });
        } else {
            tokenResponse = await fetch(providerConfig.tokenURL, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    client_id: providerConfig.clientId,
                    ...(providerConfig.clientSecret ? {client_secret: providerConfig.clientSecret} : {}),
                    code: code,
                    grant_type: "authorization_code",
                    redirect_uri: getCallbackURL(provider),
                    // PKCE: 携带code_verifier
                    ...(stateData?.codeVerifier ? {code_verifier: stateData.codeVerifier} : {}),
                }),
            });
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            throw new Error("获取访问令牌失败");
        }

        // 2. 使用访问令牌获取用户信息
        let userResponse;
        // Casdoor 支持两种方式：Authorization Bearer 或 accessToken 查询参数
        if (provider === 'stcn') {
            const url = new URL(providerConfig.userInfoURL);
            url.searchParams.set('accessToken', tokenData.access_token);
            userResponse = await fetch(url, {headers: {"Accept": "application/json"}});
        } else {
            userResponse = await fetch(providerConfig.userInfoURL, {
                headers: {
                    "Authorization": `Bearer ${tokenData.access_token}`,
                    "Accept": "application/json",
                },
            });
        }

        const userData = await userResponse.json();

        // 3. 标准化用户数据（不同提供者返回的字段不同）
        let normalizedUser = {};

        if (provider === "github") {
            normalizedUser = {
                providerId: String(userData.id),
                email: userData.email,
                name: userData.name || userData.login,
                avatarUrl: userData.avatar_url,
            };
        } else if (provider === "zerocat") {
            normalizedUser = {
                providerId: userData.openid,
                email: userData.email_verified ? userData.email : null,
                name: userData.nickname || userData.username,
                avatarUrl: userData.avatar,
            };
        } else if (provider === "hly") {
            // 厚浪云（Logto）标准OIDC用户信息
            normalizedUser = {
                providerId: userData.sub,
                email: userData.email_verified ? userData.email : null,
                name: userData.name || userData.preferred_username || userData.nickname,
                avatarUrl: userData.picture,
            };
        } else if (provider === "stcn") {
            // STCN（Casdoor）标准OIDC用户信息
            normalizedUser = {
                providerId: userData.sub,
                email: userData.email_verified ? userData.email : userData.email || null,
                name: userData.name || userData.preferred_username || userData.nickname,
                avatarUrl: userData.picture,
            };
        } else if (provider === "dlass") {
            // Dlass（Casdoor）标准OIDC用户信息
            normalizedUser = {
                providerId: userData.sub,
                email: userData.email_verified ? userData.email : userData.email || null,
                name: userData.name || userData.preferred_username || userData.nickname,
                avatarUrl: userData.picture,
            };
        }

        // 名称为空时，用邮箱@前部分回填（若邮箱可用）
        if ((!normalizedUser.name || normalizedUser.name.trim() === "") && normalizedUser.email) {
            const at = normalizedUser.email.indexOf("@");
            if (at > 0) {
                normalizedUser.name = normalizedUser.email.substring(0, at);
            }
        }

        // 4. 查找或创建账户
        let account = await prisma.account.findUnique({
            where: {
                provider_providerId: {
                    provider,
                    providerId: normalizedUser.providerId,
                },
            },
        });

        if (account) {
            // 更新账户信息
            account = await prisma.account.update({
                where: {id: account.id},
                data: {
                    email: normalizedUser.email || account.email,
                    name: normalizedUser.name || account.name,
                    avatarUrl: normalizedUser.avatarUrl || account.avatarUrl,
                    providerData: userData,
                    //refreshToken: tokenData.refresh_token || account.refreshToken,
                    updatedAt: new Date(),
                },
            });
        } else {
            // 创建新账户
            const accessToken = generateAccessToken();
            account = await prisma.account.create({
                data: {
                    provider,
                    providerId: normalizedUser.providerId,
                    email: normalizedUser.email,
                    name: normalizedUser.name,
                    avatarUrl: normalizedUser.avatarUrl,
                    providerData: userData,
                    accessToken,
                    //refreshToken: tokenData.refresh_token,
                },
            });
        }

        // 5. 生成令牌对（访问令牌 + 刷新令牌）
        const tokens = await generateTokenPair(account);

        // 6. 重定向到前端根路径，携带JWT token
        const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const callbackUrl = new URL(frontendBaseUrl);
        callbackUrl.searchParams.append("access_token", tokens.accessToken);
        callbackUrl.searchParams.append("refresh_token", tokens.refreshToken);
        callbackUrl.searchParams.append("expires_in", tokens.accessTokenExpiresIn);
        callbackUrl.searchParams.append("provider", provider);
        // 附带展示信息，便于前端显示品牌与名称
        const pconf = oauthProviders[provider] || {};
        callbackUrl.searchParams.append("providerName", pconf.displayName || pconf.name || provider);
        if (pconf.brandColor || pconf.color) {
            callbackUrl.searchParams.append("providerColor", pconf.brandColor || pconf.color);
        }
        callbackUrl.searchParams.append("success", "true");

        res.redirect(callbackUrl.toString());

    } catch (error) {
        console.error(`OAuth回调处理失败 [${provider}]:`, error);

        // 重定向到前端根路径，携带错误信息
        const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const errorUrl = new URL(frontendBaseUrl);
        errorUrl.searchParams.append("error", error.message);
        errorUrl.searchParams.append("provider", provider);
        errorUrl.searchParams.append("success", "false");

        res.redirect(errorUrl.toString());
    }
});

/**
 * 获取账户信息
 * GET /api/accounts/profile
 *
 * Headers:
 * Authorization: Bearer <JWT Token>
 */
router.get("/profile", jwtAuth, async (req, res, next) => {
    try {
        const accountContext = res.locals.account;

        const account = await prisma.account.findUnique({
            where: {id: accountContext.id},
            include: {
                devices: {
                    select: {
                        id: true,
                        uuid: true,
                        name: true,
                        createdAt: true,
                    },
                },
            },
        });

        // 组装 provider 展示信息
        const pconf = (account?.provider && oauthProviders[account.provider]) || {};
        const providerInfo = {
            id: account?.provider || undefined,
            name: pconf.name,
            displayName: pconf.displayName || pconf.name || account?.provider,
            icon: pconf.icon,
            color: pconf.color, // 兼容字段
            brandColor: pconf.brandColor || pconf.color,
            textColor: pconf.textColor || "#ffffff",
            description: pconf.description,
            order: typeof pconf.order === 'number' ? pconf.order : undefined,
            website: pconf.website,
        };

        res.json({
            success: true,
            data: {
                id: account.id,
                provider: account.provider,
                providerInfo,
                email: account.email,
                name: account.name,
                avatarUrl: account.avatarUrl,
                devices: account.devices,
                createdAt: account.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 绑定设备到账户
 * POST /api/accounts/devices/bind
 *
 * Headers:
 * Authorization: Bearer <JWT Token>
 *
 * Body:
 * {
 *   uuid: string  // 设备UUID
 * }
 */
router.post("/devices/bind", jwtAuth, async (req, res, next) => {
    try {
        const accountContext = res.locals.account;
        const {uuid} = req.body;

        if (!uuid) {
            return res.status(400).json({
                success: false,
                message: "缺少设备UUID",
            });
        }

        // 查找设备
        const device = await prisma.device.findUnique({
            where: {uuid},
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "设备不存在 #1",
            });
        }

        // 检查设备是否已绑定其他账户
        if (device.accountId && device.accountId !== accountContext.id) {
            return res.status(400).json({
                success: false,
                message: "设备已绑定其他账户",
            });
        }

        // 绑定设备到账户
        const updatedDevice = await prisma.device.update({
            where: {uuid},
            data: {
                accountId: accountContext.id,
            },
        });

        res.json({
            success: true,
            message: "设备绑定成功",
            data: {
                deviceId: updatedDevice.id,
                uuid: updatedDevice.uuid,
                name: updatedDevice.name,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 解绑设备
 * POST /api/accounts/devices/unbind
 *
 * Headers:
 * Authorization: Bearer <JWT Token>
 *
 * Body:
 * {
 *   uuid: string  // 设备UUID（单个解绑）
 *   uuids: string[]  // 设备UUID数组（批量解绑）
 * }
 */
router.post("/devices/unbind", jwtAuth, async (req, res, next) => {
    try {
        const accountContext = res.locals.account;
        const {uuid, uuids} = req.body;

        // 支持单个解绑或批量解绑
        const uuidsToUnbind = uuids || (uuid ? [uuid] : []);

        if (uuidsToUnbind.length === 0) {
            return res.status(400).json({
                success: false,
                message: "请提供要解绑的设备UUID",
            });
        }

        // 查找所有设备并验证所有权
        const devices = await prisma.device.findMany({
            where: {
                uuid: {in: uuidsToUnbind},
            },
        });

        // 检查是否有不存在的设备
        if (devices.length !== uuidsToUnbind.length) {
            const foundUuids = devices.map(d => d.uuid);
            const notFoundUuids = uuidsToUnbind.filter(u => !foundUuids.includes(u));
            return res.status(404).json({
                success: false,
                message: `以下设备不存在: ${notFoundUuids.join(', ')}`,
            });
        }

        // 检查所有权
        const unauthorizedDevices = devices.filter(d => d.accountId !== accountContext.id);
        if (unauthorizedDevices.length > 0) {
            return res.status(403).json({
                success: false,
                message: `您没有权限解绑以下设备: ${unauthorizedDevices.map(d => d.uuid).join(', ')}`,
            });
        }

        // 批量解绑设备
        await prisma.device.updateMany({
            where: {
                uuid: {in: uuidsToUnbind},
                accountId: accountContext.id,
            },
            data: {
                accountId: null,
            },
        });

        res.json({
            success: true,
            message: uuidsToUnbind.length === 1 ? "设备解绑成功" : `成功解绑 ${uuidsToUnbind.length} 个设备`,
            unboundCount: uuidsToUnbind.length,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 获取账户绑定的设备列表
 * GET /api/accounts/devices
 *
 * Headers:
 * Authorization: Bearer <JWT Token>
 */
router.get("/devices", jwtAuth, async (req, res, next) => {
    try {
        const accountContext = res.locals.account;
        // 获取账户的设备列表
        const account = await prisma.account.findUnique({
            where: {id: accountContext.id},
            include: {
                devices: {
                    select: {
                        id: true,
                        uuid: true,
                        name: true,
                        namespace: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            data: account.devices,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 根据设备UUID获取账户公开信息
 * GET /accounts/device/:uuid/account
 *
 * 无需认证，返回公开信息
 */
router.get("/device/:uuid/account", async (req, res, next) => {
    try {
        const {uuid} = req.params;

        // 查找设备及其关联的账户
        const device = await prisma.device.findUnique({
            where: {uuid},
            include: {
                account: {
                    select: {
                        id: true,
                        provider: true,
                        name: true,
                        avatarUrl: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "设备不存在 #2",
            });
        }

        if (!device.account) {
            return res.json({
                success: true,
                data: null, // 设备未绑定账户
            });
        }

        res.json({
            success: true,
            data: {
                id: device.account.id,
                provider: device.account.provider,
                name: device.account.name,
                avatarUrl: device.account.avatarUrl,
                bindTime: device.updatedAt, // 绑定时间
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 刷新访问令牌
 * POST /api/accounts/refresh
 *
 * Body:
 * {
 *   refresh_token: string  // 刷新令牌
 * }
 */
router.post("/refresh", async (req, res, next) => {
    try {
        const {refresh_token} = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: "缺少刷新令牌",
            });
        }

        // 刷新访问令牌
        const result = await refreshAccessToken(refresh_token);

        res.json({
            success: true,
            message: "令牌刷新成功",
            data: {
                access_token: result.accessToken,
                expires_in: result.accessTokenExpiresIn,
                account: result.account,
            },
        });
    } catch (error) {
        if (error.message === 'Account not found') {
            return next(errors.createError(401, "账户不存在"));
        }
        if (error.message === 'Invalid refresh token') {
            return next(errors.createError(401, "无效的刷新令牌"));
        }
        if (error.message === 'Refresh token expired') {
            return next(errors.createError(401, "刷新令牌已过期"));
        }
        if (error.message === 'Token version mismatch') {
            return next(errors.createError(401, "令牌版本不匹配，请重新登录"));
        }

        next(error);
    }
});

/**
 * 登出（撤销当前设备的刷新令牌）
 * POST /api/accounts/logout
 *
 * Headers:
 * Authorization: Bearer <JWT Token>
 */
router.post("/logout", jwtAuth, async (req, res, next) => {
    try {
        const accountContext = res.locals.account;

        // 撤销当前设备的刷新令牌
        await revokeRefreshToken(accountContext.id);

        res.json({
            success: true,
            message: "登出成功",
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 登出所有设备（撤销所有令牌）
 * POST /api/accounts/logout-all
 *
 * Headers:
 * Authorization: Bearer <JWT Token>
 */
router.post("/logout-all", jwtAuth, async (req, res, next) => {
    try {
        const accountContext = res.locals.account;

        // 撤销所有令牌
        await revokeAllTokens(accountContext.id);

        res.json({
            success: true,
            message: "已从所有设备登出",
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 获取令牌信息
 * GET /api/accounts/token-info
 *
 * Headers:
 * Authorization: Bearer <JWT Token>
 */
router.get("/token-info", jwtAuth, async (req, res, next) => {
    try {
        const decoded = res.locals.tokenDecoded;
        const account = res.locals.account;

        // 计算token剩余有效时间
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;

        res.json({
            success: true,
            data: {
                accountId: account.id,
                tokenType: decoded.type || 'legacy',
                tokenVersion: decoded.tokenVersion || account.tokenVersion,
                issuedAt: new Date(decoded.iat * 1000),
                expiresAt: new Date(decoded.exp * 1000),
                expiresIn: expiresIn,
                isExpired: expiresIn <= 0,
                isLegacyToken: res.locals.isLegacyToken || false,
                hasRefreshToken: !!account.refreshToken,
                refreshTokenExpiry: account.refreshTokenExpiry,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;