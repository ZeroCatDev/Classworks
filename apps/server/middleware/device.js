/**
 * 设备管理中间件
 *
 * 提供统一的设备UUID处理逻辑：
 * 1. deviceMiddleware - 自动获取或创建设备，将设备信息存储到res.locals.device
 * 2. deviceInfoMiddleware - 仅获取设备信息，不创建新设备
 * 3. passwordMiddleware - 验证设备密码
 */
import errors from "../utils/errors.js";
import {verifyDevicePassword} from "../utils/crypto.js";
import {analyzeDevice} from "../utils/deviceDetector.js";
import { prisma } from "../utils/prisma.js";

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
 * 设备中间件 - 统一处理设备UUID
 *
 * 从req.params.deviceUuid或req.body.deviceUuid获取UUID
 * 如果设备不存在则自动创建，并智能生成设备名称
 * 将设备信息存储到res.locals.device
 *
 * 使用方式：
 * router.post('/path', deviceMiddleware, handler)
 * router.get('/path/:deviceUuid', deviceMiddleware, handler)
 */
export const deviceMiddleware = errors.catchAsync(async (req, res, next) => {
    const deviceUuid = req.params.deviceUuid || req.body.deviceUuid;

    if (!deviceUuid) {
        return next(errors.createError(400, "缺少设备UUID"));
    }

    // 查找或创建设备
    let device = await prisma.device.findUnique({
        where: {uuid: deviceUuid},
    });

    if (!device) {
        // 设备不存在，自动创建并生成智能设备名称
        const userAgent = req.headers['user-agent'];
        const customDeviceType = req.body.deviceType || req.query.deviceType;
        const note = req.body.note || req.query.note;

        // 生成设备名称，确保不为空
        const deviceName = analyzeDevice(userAgent, req.headers, customDeviceType, note).generatedName;

        device = await prisma.device.create({
            data: {
                uuid: deviceUuid,
                name: deviceName,
                password: null,
                passwordHint: null,
                accountId: null,
            },
        });

        // 为新创建的设备添加默认的自动登录配置
        await createDefaultAutoAuth(device.id);

        // 将设备分析结果添加到响应中
        res.locals.deviceAnalysis = deviceAnalysis;
    }

    // 将设备信息存储到res.locals
    res.locals.device = device;
    next();
});

/**
 * 设备信息中间件 - 仅获取设备信息，不创建新设备
 *
 * 从req.params.deviceUuid获取UUID
 * 如果设备不存在则返回404错误
 * 将设备信息存储到res.locals.device
 *
 * 使用方式：
 * router.get('/path/:deviceUuid', deviceInfoMiddleware, handler)
 */
export const deviceInfoMiddleware = errors.catchAsync(async (req, res, next) => {
    const deviceUuid = req.params.deviceUuid;

    if (!deviceUuid) {
        return next(errors.createError(400, "缺少设备UUID"));
    }

    // 查找设备
    const device = await prisma.device.findUnique({
        where: {uuid: deviceUuid},
    });

    if (!device) {
        return next(errors.createError(404, "设备不存在"));
    }

    // 将设备信息存储到res.locals
    res.locals.device = device;
    next();
});

/**
 * 密码验证中间件 - 验证设备密码
 *
 * 前置条件：必须先使用deviceMiddleware或deviceInfoMiddleware
 * 从req.body.password获取密码
 * 如果设备有密码但未提供或密码错误，则返回401错误
 *
 * 特殊规则：如果设备绑定了账户，且req.account存在且匹配，则跳过密码验证
 *
 * 使用方式：
 * router.post('/path', deviceMiddleware, passwordMiddleware, handler)
 */
export const passwordMiddleware = errors.catchAsync(async (req, res, next) => {
    const device = res.locals.device;
    const {password} = req.body;

    if (!device) {
        return next(errors.createError(500, "设备信息未加载，请先使用deviceMiddleware"));
    }

    // 如果设备绑定了账户，且请求中有账户信息且匹配，则跳过密码验证
    if (device.accountId && req.account && req.account.id === device.accountId) {
        return next();
    }

    // 如果设备有密码，验证密码
    if (device.password) {
        if (!password) {
            return next(errors.createError(401, "设备需要密码"));
        }

        const isValid = await verifyDevicePassword(password, device.password);
        if (!isValid) {
            return next(errors.createError(401, "密码错误"));
        }
    }

    next();
});