import {Router} from "express";
import {extractDeviceInfo} from "../middleware/uuidAuth.js";
import errors from "../utils/errors.js";
import {getOnlineDevices} from "../utils/socket.js";
import {registeredDevicesTotal} from "../utils/metrics.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

/**
 * 为新设备创建默认的自动登录配置
 * @param {number} deviceId - 设备ID
 */
async function createDefaultAutoAuth(deviceId) {
    try {
        // 创建默认的自动授权配置：不需要密码、类型是classroom（一体机）
        await prisma.autoAuth.create({
            data: {
                deviceId: deviceId,
                password: null, // 无密码
                deviceType: "classroom", // 一体机类型
                isReadOnly: false, // 非只读
            },
        });
    } catch (error) {
        console.error('创建默认自动登录配置失败:', error);
        // 这里不抛出错误，避免影响设备创建流程
    }
}

/**
 * POST /devices
 * 注册新设备
 */
router.post(
    "/",
    errors.catchAsync(async (req, res, next) => {
        const {uuid, deviceName, namespace} = req.body;

        if (!uuid) {
            return next(errors.createError(400, "设备UUID是必需的"));
        }

        if (!deviceName) {
            return next(errors.createError(400, "设备名称是必需的"));
        }

        try {
            // 检查UUID是否已存在
            const existingDevice = await prisma.device.findUnique({
                where: {uuid},
            });

            if (existingDevice) {
                return next(errors.createError(409, "设备UUID已存在"));
            }

            // 处理 namespace：如果没有提供，则使用 uuid
            const deviceNamespace = namespace && namespace.trim() ? namespace.trim() : uuid;

            // 检查 namespace 是否已被使用
            const existingNamespace = await prisma.device.findUnique({
                where: {namespace: deviceNamespace},
            });

            if (existingNamespace) {
                return next(errors.createError(409, "该 namespace 已被使用"));
            }

            // 创建设备
            const device = await prisma.device.create({
                data: {
                    uuid,
                    name: deviceName,
                    namespace: deviceNamespace,
                },
            });

            // 为新设备创建默认的自动登录配置
            await createDefaultAutoAuth(device.id);

            // 更新注册设备总数指标
            const totalDevices = await prisma.device.count();
            registeredDevicesTotal.set(totalDevices);

            return res.status(201).json({
                success: true,
                device: {
                    id: device.id,
                    uuid: device.uuid,
                    name: device.name,
                    namespace: device.namespace,
                    createdAt: device.createdAt,
                },
            });
        } catch (error) {
            throw error;
        }
    })
);

/**
 * GET /devices/:uuid
 * 获取设备信息 (公开接口，无需认证)
 */
router.get(
    "/:uuid",
    errors.catchAsync(async (req, res, next) => {
        const {uuid} = req.params;

        // 查找设备，包含绑定的账户信息
        const device = await prisma.device.findUnique({
            where: {uuid},
            include: {
                account: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        if (!device) {
            return next(errors.createError(404, "设备不存在"));
        }

        return res.json({
            id: device.id,
            uuid: device.uuid,
            name: device.name,
            hasPassword: !!device.password,
            passwordHint: device.passwordHint,
            createdAt: device.createdAt,
            account: device.account ? {
                id: device.account.id,
                name: device.account.name,
                email: device.account.email,
                avatarUrl: device.account.avatarUrl,
            } : null,
            isBoundToAccount: !!device.account,
            namespace: device.namespace,
        });
    })
);
/**
 * PUT /devices/:uuid/name
 * 设置设备名称 (需要UUID认证)
 */
router.put(
    "/:uuid/name",
    extractDeviceInfo,
    errors.catchAsync(async (req, res, next) => {
        const {name} = req.body;
        const device = res.locals.device;

        if (!name) {
            return next(errors.createError(400, "设备名称是必需的"));
        }

        const updatedDevice = await prisma.device.update({
            where: {id: device.id},
            data: {name},
        });

        return res.json({
            success: true,
            device: {
                id: updatedDevice.id,
                uuid: updatedDevice.uuid,
                name: updatedDevice.name,
                hasPassword: !!updatedDevice.password,
                passwordHint: updatedDevice.passwordHint,
            },
        });
    })
);


/**
 * GET /devices/online
 * 查询在线设备（WebSocket 已连接）
 * 返回：[{ uuid, connections, name? }]
 */
router.get(
    "/online",
    errors.catchAsync(async (req, res) => {
        const list = getOnlineDevices();

        if (list.length === 0) {
            return res.json({success: true, devices: []});
        }

        // 补充设备名称
        const uuids = list.map((x) => x.uuid);
        const rows = await prisma.device.findMany({
            where: {uuid: {in: uuids}},
            select: {uuid: true, name: true},
        });
        const nameMap = new Map(rows.map((r) => [r.uuid, r.name]));

        const devices = list.map((x) => ({
            uuid: x.uuid,
            connections: x.connections,
            name: nameMap.get(x.uuid) || null,
        }));

        res.json({success: true, devices});
    })
);

export default router;
