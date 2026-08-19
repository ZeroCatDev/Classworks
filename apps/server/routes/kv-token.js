import { Router } from "express";
import kvStore from "../utils/kvStore.js";
import { broadcastKeyChanged } from "../utils/socket.js";
import { kvTokenAuth } from "../middleware/kvTokenAuth.js";
import {
    prepareTokenForRateLimit,
    tokenBatchLimiter,
    tokenDeleteLimiter,
    tokenReadLimiter,
    tokenWriteLimiter
} from "../middleware/rateLimiter.js";
import errors from "../utils/errors.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

// 使用KV专用token认证
router.use(kvTokenAuth);

// 准备token用于限速器
router.use(prepareTokenForRateLimit);

/**
 * GET /_info
 * 获取当前token所属设备的信息，如果关联了账号也返回账号信息
 */
router.get(
    "/_info",
    tokenReadLimiter,
    errors.catchAsync(async (req, res, next) => {
        const deviceId = res.locals.deviceId;

        // 获取设备信息，包含关联的账号
        const device = await prisma.device.findUnique({
            where: { id: deviceId },
            include: {
                account: true,
            },
        });

        if (!device) {
            return next(errors.createError(404, "设备不存在"));
        }

        // 构建响应对象：当设备没有关联账号时返回 uuid；若已关联账号则不返回 uuid
        const response = {
            device: {
                id: device.id,
                name: device.name,
                createdAt: device.createdAt,
                updatedAt: device.updatedAt,
            },
        };

        // 仅当设备未绑定账号时，包含 uuid 字段
        if (!device.account) {
            response.device.uuid = device.uuid;
        }

        // 标识是否已绑定账号
        response.hasAccount = !!device.account;

        // 如果关联了账号，添加账号信息
        if (device.account) {
            response.account = {
                id: device.account.id,
                name: device.account.name,
                avatarUrl: device.account.avatarUrl,
            };
        }

        return res.json(response);
    })
);

/**
 * GET /_token
 * 获取当前 KV Token 的详细信息（类型、备注等）
 */
router.get(
    "/_token",
    tokenReadLimiter,
    errors.catchAsync(async (req, res, next) => {
        const token = res.locals.token;
        const deviceId = res.locals.deviceId;

        // 查找当前 token 对应的应用安装记录
        const appInstall = await prisma.appInstall.findUnique({
            where: { token },
            include: {
                device: {
                    select: {
                        id: true,
                        uuid: true,
                        name: true,
                        namespace: true,
                    },
                },
            },
        });

        if (!appInstall) {
            return next(errors.createError(404, "Token 信息不存在"));
        }

        return res.json({
            success: true,
            token: appInstall.token,
            appId: appInstall.appId,
            deviceType: appInstall.deviceType,
            isReadOnly: appInstall.isReadOnly,
            note: appInstall.note,
            installedAt: appInstall.installedAt,
            updatedAt: appInstall.updatedAt,
            device: {
                id: appInstall.device.id,
                uuid: appInstall.device.uuid,
                name: appInstall.device.name,
                namespace: appInstall.device.namespace,
            },
        });
    })
);

/**
 * GET /_keys
 * 获取当前token对应设备的键名列表（分页，不包括内容）
 */
router.get(
    "/_keys",
    tokenReadLimiter,
    errors.catchAsync(async (req, res) => {
        const deviceId = res.locals.deviceId;
        const { sortBy, sortDir, limit, skip } = req.query;

        // 构建选项
        const options = {
            sortBy: sortBy || "key",
            sortDir: sortDir || "asc",
            limit: limit ? parseInt(limit) : 100,
            skip: skip ? parseInt(skip) : 0,
        };

        const keys = await kvStore.listKeysOnly(deviceId, options);
        const totalRows = keys.length;

        // 构建响应对象
        const response = {
            keys: keys,
            total_rows: totalRows,
            current_page: {
                limit: options.limit,
                skip: options.skip,
                count: keys.length,
            },
        };

        // 如果还有更多数据，添加load_more字段
        const nextSkip = options.skip + options.limit;
        if (nextSkip < totalRows) {
            const baseUrl = `${req.baseUrl}/_keys`;
            const queryParams = new URLSearchParams({
                sortBy: options.sortBy,
                sortDir: options.sortDir,
                limit: options.limit,
                skip: nextSkip,
            }).toString();

            response.load_more = `${baseUrl}?${queryParams}`;
        }

        return res.json(response);
    })
);

/**
 * GET /
 * 获取当前token对应设备的所有键名及元数据列表
 */
router.get(
    "/",
    tokenReadLimiter,
    errors.catchAsync(async (req, res) => {
        const deviceId = res.locals.deviceId;
        const { sortBy, sortDir, limit, skip } = req.query;

        // 构建选项
        const options = {
            sortBy: sortBy || "key",
            sortDir: sortDir || "asc",
            limit: limit ? parseInt(limit) : 100,
            skip: skip ? parseInt(skip) : 0,
        };

        const keys = await kvStore.list(deviceId, options);
        const totalRows = await kvStore.count(deviceId);

        // 构建响应对象
        const response = {
            items: keys,
            total_rows: totalRows,
        };

        // 如果还有更多数据，添加load_more字段
        const nextSkip = options.skip + options.limit;
        if (nextSkip < totalRows) {
            const baseUrl = `${req.baseUrl}`;
            const queryParams = new URLSearchParams({
                sortBy: options.sortBy,
                sortDir: options.sortDir,
                limit: options.limit,
                skip: nextSkip,
            }).toString();

            response.load_more = `${baseUrl}?${queryParams}`;
        }

        return res.json(response);
    })
);

/**
 * GET /:key
 * 通过键名获取键值
 */
router.get(
    "/:key",
    tokenReadLimiter,
    errors.catchAsync(async (req, res, next) => {
        const deviceId = res.locals.deviceId;
        const { key } = req.params;

        const value = await kvStore.get(deviceId, key);

        if (value === null) {
            return next(
                errors.createError(404, `未找到键名为 '${key}' 的记录`)
            );
        }

        return res.json(value);
    })
);

/**
 * GET /:key/metadata
 * 获取键的元数据
 */
router.get(
    "/:key/metadata",
    tokenReadLimiter,
    errors.catchAsync(async (req, res, next) => {
        const deviceId = res.locals.deviceId;
        const { key } = req.params;

        const metadata = await kvStore.getMetadata(deviceId, key);
        if (!metadata) {
            return next(
                errors.createError(404, `未找到键名为 '${key}' 的记录`)
            );
        }
        return res.json(metadata);
    })
);

/**
 * POST /_batchimport
 * 批量导入键值对
 */
router.post(
    "/_batchimport",
    tokenBatchLimiter,
    errors.catchAsync(async (req, res, next) => {
        // 检查token是否为只读
        if (res.locals.appInstall?.isReadOnly) {
            return next(errors.createError(403, "当前token为只读模式,无法修改数据"));
        }

        const deviceId = res.locals.deviceId;
        const data = req.body;

        if (!data || Object.keys(data).length === 0) {
            return next(
                errors.createError(
                    400,
                    '请提供有效的JSON数据，格式为 {"key":{}, "key2":{}}'
                )
            );
        }

        // 获取客户端IP
        const creatorIp =
            req.headers["x-forwarded-for"] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket?.remoteAddress ||
            "";

        // 使用优化的批量upsert方法
        const { results, errors: errorList } = await kvStore.batchUpsert(deviceId, data, creatorIp);

        return res.status(200).json({
            code: 200,
            message: "批量导入成功",
            data: {
                deviceId,
                summary: {
                    total: Object.keys(data).length,
                    successful: results.length,
                    failed: errorList.length,
                },
                results: results.map(r => ({
                    key: r.key,
                    isNew: r.created,
                })),
                ...(errorList.length > 0 && { errors: errorList }),
            },
        });
    })
);

/**
 * POST /:key
 * 更新或创建键值
 */
router.post(
    "/:key",
    tokenWriteLimiter,
    errors.catchAsync(async (req, res, next) => {
        // 检查token是否为只读
        if (res.locals.appInstall?.isReadOnly) {
            return next(errors.createError(403, "当前token为只读模式,无法修改数据"));
        }

        const deviceId = res.locals.deviceId;
        const { key } = req.params;
        let value = req.body;

        // 处理空值，转换为空对象
        if (value === null || value === undefined || value === '') {
            value = {};
        }

        // 验证是否能被 JSON 序列化
        try {
            JSON.stringify(value);
        } catch (error) {
            return next(
                errors.createError(400, "无效的数据格式")
            );
        }

        // 获取客户端IP
        const creatorIp =
            req.headers["x-forwarded-for"] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket?.remoteAddress ||
            "";

        const result = await kvStore.upsert(deviceId, key, value, creatorIp);

        // 广播单个键的变更
        const uuid = res.locals.device?.uuid;
        if (uuid) {
            broadcastKeyChanged(uuid, {
                key: result.key,
                action: "upsert",
                created: result.createdAt.getTime() === result.updatedAt.getTime(),
                updatedAt: result.updatedAt,
            });
        }

        return res.status(200).json({
            deviceId: result.deviceId,
            key: result.key,
            created: result.createdAt.getTime() === result.updatedAt.getTime(),
            updatedAt: result.updatedAt,
        });
    })
);

/**
 * DELETE /:key
 * 删除键值对
 */
router.delete(
    "/:key",
    tokenDeleteLimiter,
    errors.catchAsync(async (req, res, next) => {
        // 检查token是否为只读
        if (res.locals.appInstall?.isReadOnly) {
            return next(errors.createError(403, "当前token为只读模式,无法修改数据"));
        }

        const deviceId = res.locals.deviceId;
        const { key } = req.params;

        const result = await kvStore.delete(deviceId, key);

        if (!result) {
            return next(
                errors.createError(404, `未找到键名为 '${key}' 的记录`)
            );
        }

        // 广播删除
        const uuid = res.locals.device?.uuid;
        if (uuid) {
            broadcastKeyChanged(uuid, {
                key,
                action: "delete",
                deletedAt: new Date(),
            });
        }

        // 204状态码表示成功但无内容返回
        return res.status(204).end();
    })
);

export default router;
