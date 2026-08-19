import {Router} from "express";
import {jwtAuth} from "../middleware/jwt-auth.js";
import errors from "../utils/errors.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

/**
 * GET /auto-auth/devices/:uuid/auth-configs
 * 获取设备的所有自动授权配置 (需要 JWT 认证，且设备必须绑定到该账户)
 */
router.get(
    "/devices/:uuid/auth-configs",
    jwtAuth,
    errors.catchAsync(async (req, res, next) => {
        const {uuid} = req.params;
        const account = res.locals.account;

        // 查找设备并验证是否属于当前账户
        const device = await prisma.device.findUnique({
            where: {uuid},
        });

        if (!device) {
            return next(errors.createError(404, "设备不存在"));
        }

        // 验证设备是否绑定到当前账户
        if (!device.accountId || device.accountId !== account.id) {
            return next(errors.createError(403, "该设备未绑定到您的账户"));
        }

        const autoAuths = await prisma.autoAuth.findMany({
            where: {deviceId: device.id},
            orderBy: {createdAt: 'desc'},
        });

        // 返回配置，智能处理密码显示
        const configs = autoAuths.map(auth => {
            // 检查是否是 bcrypt 哈希密码
            const isHashedPassword = auth.password && auth.password.startsWith('$2');

            return {
                id: auth.id,
                password: isHashedPassword ? null : auth.password, // 哈希密码不返回
                isLegacyHash: isHashedPassword, // 标记是否为旧的哈希密码
                deviceType: auth.deviceType,
                isReadOnly: auth.isReadOnly,
                createdAt: auth.createdAt,
                updatedAt: auth.updatedAt,
            };
        });

        return res.json({
            success: true,
            configs,
        });
    })
);

/**
 * POST /auto-auth/devices/:uuid/auth-configs
 * 创建新的自动授权配置 (需要 JWT 认证，且设备必须绑定到该账户)
 * Body: { password?: string, deviceType?: string, isReadOnly?: boolean }
 */
router.post(
    "/devices/:uuid/auth-configs",
    jwtAuth,
    errors.catchAsync(async (req, res, next) => {
        const {uuid} = req.params;
        const account = res.locals.account;
        const {password, deviceType, isReadOnly} = req.body;

        // 查找设备并验证是否属于当前账户
        const device = await prisma.device.findUnique({
            where: {uuid},
        });

        if (!device) {
            return next(errors.createError(404, "设备不存在"));
        }

        // 验证设备是否绑定到当前账户
        if (!device.accountId || device.accountId !== account.id) {
            return next(errors.createError(403, "该设备未绑定到您的账户"));
        }

        // 验证 deviceType 如果提供的话
        const validDeviceTypes = ['teacher', 'student', 'classroom', 'parent'];
        if (deviceType && !validDeviceTypes.includes(deviceType)) {
            return next(errors.createError(400, `设备类型必须是以下之一: ${validDeviceTypes.join(', ')}`));
        }

        // 规范化密码：空字符串视为 null
        const plainPassword = (password !== undefined && password !== '') ? password : null;

        // 查询该设备的所有自动授权配置，本地检查是否存在相同密码
        const allAuths = await prisma.autoAuth.findMany({
            where: {deviceId: device.id},
        });

        const existingAuth = allAuths.find(auth => auth.password === plainPassword);

        if (existingAuth) {
            return next(errors.createError(400, "该密码的自动授权配置已存在"));
        }

        // 创建新的自动授权配置（密码明文存储）
        const autoAuth = await prisma.autoAuth.create({
            data: {
                deviceId: device.id,
                password: plainPassword,
                deviceType: deviceType || null,
                isReadOnly: isReadOnly || false,
            },
        });

        return res.status(201).json({
            success: true,
            config: {
                id: autoAuth.id,
                password: autoAuth.password, // 返回明文密码
                deviceType: autoAuth.deviceType,
                isReadOnly: autoAuth.isReadOnly,
                createdAt: autoAuth.createdAt,
            },
        });
    })
);
/**
 * PUT /auto-auth/devices/:uuid/auth-configs/:configId
 * 更新自动授权配置 (需要 JWT 认证，且设备必须绑定到该账户)
 * Body: { password?: string, deviceType?: string, isReadOnly?: boolean }
 */
router.put(
    "/devices/:uuid/auth-configs/:configId",
    jwtAuth,
    errors.catchAsync(async (req, res, next) => {
        const {uuid, configId} = req.params;
        const account = res.locals.account;
        const {password, deviceType, isReadOnly} = req.body;

        // 查找设备并验证是否属于当前账户
        const device = await prisma.device.findUnique({
            where: {uuid},
        });

        if (!device) {
            return next(errors.createError(404, "设备不存在"));
        }

        // 验证设备是否绑定到当前账户
        if (!device.accountId || device.accountId !== account.id) {
            return next(errors.createError(403, "该设备未绑定到您的账户"));
        }

        // 查找自动授权配置
        const autoAuth = await prisma.autoAuth.findUnique({
            where: {id: configId},
        });

        if (!autoAuth) {
            return next(errors.createError(404, "自动授权配置不存在"));
        }

        // 确保配置属于当前设备
        if (autoAuth.deviceId !== device.id) {
            return next(errors.createError(403, "无权操作此配置"));
        }

        // 验证 deviceType
        const validDeviceTypes = ['teacher', 'student', 'classroom', 'parent'];
        if (deviceType && !validDeviceTypes.includes(deviceType)) {
            return next(errors.createError(400, `设备类型必须是以下之一: ${validDeviceTypes.join(', ')}`));
        }

        // 准备更新数据
        const updateData = {};

        if (password !== undefined) {
            // 规范化密码：空字符串视为 null
            const plainPassword = (password !== '') ? password : null;

            // 查询该设备的所有配置，本地检查新密码是否与其他配置冲突
            const allAuths = await prisma.autoAuth.findMany({
                where: {deviceId: device.id},
            });

            const conflictAuth = allAuths.find(auth =>
                auth.id !== configId && auth.password === plainPassword
            );

            if (conflictAuth) {
                return next(errors.createError(400, "该密码已被其他配置使用"));
            }

            updateData.password = plainPassword;
        }

        if (deviceType !== undefined) {
            updateData.deviceType = deviceType || null;
        }

        if (isReadOnly !== undefined) {
            updateData.isReadOnly = isReadOnly;
        }

        // 更新配置
        const updatedAuth = await prisma.autoAuth.update({
            where: {id: configId},
            data: updateData,
        });

        return res.json({
            success: true,
            config: {
                id: updatedAuth.id,
                password: updatedAuth.password, // 返回明文密码
                deviceType: updatedAuth.deviceType,
                isReadOnly: updatedAuth.isReadOnly,
                updatedAt: updatedAuth.updatedAt,
            },
        });
    })
);

/**
 * DELETE /auto-auth/devices/:uuid/auth-configs/:configId
 * 删除自动授权配置 (需要 JWT 认证，且设备必须绑定到该账户)
 */
router.delete(
    "/devices/:uuid/auth-configs/:configId",
    jwtAuth,
    errors.catchAsync(async (req, res, next) => {
        const {uuid, configId} = req.params;
        const account = res.locals.account;

        // 查找设备并验证是否属于当前账户
        const device = await prisma.device.findUnique({
            where: {uuid},
        });

        if (!device) {
            return next(errors.createError(404, "设备不存在"));
        }

        // 验证设备是否绑定到当前账户
        if (!device.accountId || device.accountId !== account.id) {
            return next(errors.createError(403, "该设备未绑定到您的账户"));
        }

        // 查找自动授权配置
        const autoAuth = await prisma.autoAuth.findUnique({
            where: {id: configId},
        });

        if (!autoAuth) {
            return next(errors.createError(404, "自动授权配置不存在"));
        }

        // 确保配置属于当前设备
        if (autoAuth.deviceId !== device.id) {
            return next(errors.createError(403, "无权操作此配置"));
        }

        // 删除配置
        await prisma.autoAuth.delete({
            where: {id: configId},
        });

        return res.status(204).end();
    })
);

/**
 * PUT /auto-auth/devices/:uuid/namespace
 * 修改设备的 namespace (需要 JWT 认证，且设备必须绑定到该账户)
 * Body: { namespace: string }
 */
router.put(
    "/devices/:uuid/namespace",
    jwtAuth,
    errors.catchAsync(async (req, res, next) => {
        const {uuid} = req.params;
        const account = res.locals.account;
        const {namespace} = req.body;

        if (!namespace) {
            return next(errors.createError(400, "需要提供 namespace"));
        }

        // 规范化 namespace：去除首尾空格
        const trimmedNamespace = namespace.trim();

        if (!trimmedNamespace) {
            return next(errors.createError(400, "namespace 不能为空"));
        }

        // 查找设备并验证是否属于当前账户
        const device = await prisma.device.findUnique({
            where: {uuid},
        });

        if (!device) {
            return next(errors.createError(404, "设备不存在"));
        }

        // 验证设备是否绑定到当前账户
        if (!device.accountId || device.accountId !== account.id) {
            return next(errors.createError(403, "该设备未绑定到您的账户"));
        }

        // 检查新的 namespace 是否已被其他设备使用
        if (device.namespace !== trimmedNamespace) {
            const existingDevice = await prisma.device.findUnique({
                where: {namespace: trimmedNamespace},
            });

            if (existingDevice) {
                return next(errors.createError(409, "该 namespace 已被其他设备使用"));
            }
        }

        // 更新设备的 namespace
        const updatedDevice = await prisma.device.update({
            where: {id: device.id},
            data: {namespace: trimmedNamespace},
        });

        return res.json({
            success: true,
            device: {
                id: updatedDevice.id,
                uuid: updatedDevice.uuid,
                name: updatedDevice.name,
                namespace: updatedDevice.namespace,
                updatedAt: updatedDevice.updatedAt,
            },
        });
    })
);

export default router;
