import {Router} from "express";
import {uuidAuth} from "../middleware/uuidAuth.js";
import crypto from "crypto";
import errors from "../utils/errors.js";
import {verifyDevicePassword} from "../utils/crypto.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

/**
 * GET /apps/devices/:uuid/apps
 * 获取设备安装的应用列表 (公开接口，无需认证)
 */
router.get(
    "/devices/:uuid/apps",
    errors.catchAsync(async (req, res, next) => {
        const {uuid} = req.params;

        // 查找设备
        const device = await prisma.device.findUnique({
            where: {uuid},
        });

        if (!device) {
            return next(errors.createError(404, "设备不存在"));
        }

        const installations = await prisma.appInstall.findMany({
            where: {deviceId: device.id},
        });

        const apps = installations.map(install => ({
            appId: install.appId,
            token: install.token,
            note: install.note,
            installedAt: install.createdAt,
        }));

        return res.json({
            success: true,
            apps,
        });
    })
);

/**
 * POST /apps/devices/:uuid/install/:appId
 * 为设备安装应用 (需要UUID认证)
 * appId 现在是 SHA256 hash
 */
router.post(
    "/devices/:uuid/install/:appId",
    uuidAuth,
    errors.catchAsync(async (req, res, next) => {
        const device = res.locals.device;
        const {appId} = req.params;
        const {note} = req.body;

        // 生成token
        const token = crypto.randomBytes(32).toString("hex");

        // 创建安装记录
        const installation = await prisma.appInstall.create({
            data: {
                deviceId: device.id,
                appId: appId,
                token,
                note: note || null,
            },
        });

        return res.status(201).json({
            id: installation.id,
            appId: installation.appId,
            token: installation.token,
            note: installation.note,
            name: installation.note, // 备注同时作为名称返回
            installedAt: installation.createdAt,
        });
    })
);

/**
 * DELETE /apps/devices/:uuid/uninstall/:installId
 * 卸载设备应用 (需要UUID认证)
 */
router.delete(
    "/devices/:uuid/uninstall/:installId",
    uuidAuth,
    errors.catchAsync(async (req, res, next) => {
        const device = res.locals.device;
        const {installId} = req.params;

        const installation = await prisma.appInstall.findUnique({
            where: {id: installId},
        });

        if (!installation) {
            return next(errors.createError(404, "应用未安装"));
        }

        // 确保安装记录属于当前设备
        if (installation.deviceId !== device.id) {
            return next(errors.createError(403, "无权操作此安装记录"));
        }

        await prisma.appInstall.delete({
            where: {id: installation.id},
        });

        return res.status(204).end();
    })
);

/**
 * GET /apps/tokens
 * 获取设备的token列表 (需要设备UUID)
 */
router.get(
    "/tokens",
    errors.catchAsync(async (req, res, next) => {
        const {uuid} = req.query;

        if (!uuid) {
            return next(errors.createError(400, "需要提供设备UUID"));
        }

        // 查找设备
        const device = await prisma.device.findUnique({
            where: {uuid},
        });

        if (!device) {
            return next(errors.createError(404, "设备不存在"));
        }

        // 获取该设备的所有应用安装记录（即token）
        const installations = await prisma.appInstall.findMany({
            where: {deviceId: device.id},
            orderBy: {installedAt: 'desc'},
        });

        const tokens = installations.map(install => ({
            id: install.id,
            token: install.token,
            appId: install.appId,
            installedAt: install.installedAt,
            note: install.note,
            name: install.note, // 备注同时作为名称返回
        }));

        return res.json({
            success: true,
            tokens,
            deviceUuid: uuid,
        });
    })
);

/**
 * POST /apps/auth/token
 * 通过 namespace 和密码获取 token (自动授权)
 * Body: { namespace: string, password: string, appId: string }
 */
router.post(
    "/auth/token",
    errors.catchAsync(async (req, res, next) => {
        const {namespace, password, appId} = req.body;

        if (!namespace) {
            return next(errors.createError(400, "需要提供 namespace"));
        }

        if (!appId) {
            return next(errors.createError(400, "需要提供 appId"));
        }

        // 通过 namespace 查找设备
        const device = await prisma.device.findUnique({
            where: {namespace},
            include: {
                autoAuths: true,
            },
        });

        if (!device) {
            return next(errors.createError(404, "设备不存在或 namespace 不正确"));
        }

        // 查找匹配的自动授权配置
        let matchedAutoAuth = null;

        // 如果提供了密码，查找匹配密码的自动授权
        if (password) {
            // 首先尝试直接匹配明文密码
            matchedAutoAuth = device.autoAuths.find(auth => auth.password === password);

            // 如果没有匹配到，尝试验证哈希密码（向后兼容）
            if (!matchedAutoAuth) {
                for (const autoAuth of device.autoAuths) {
                    if (autoAuth.password && autoAuth.password.startsWith('$2')) { // bcrypt 哈希以 $2 开头
                        try {
                            if (await verifyDevicePassword(password, autoAuth.password)) {
                                matchedAutoAuth = autoAuth;

                                // 自动迁移：将哈希密码更新为明文密码
                                await prisma.autoAuth.update({
                                    where: {id: autoAuth.id},
                                    data: {password: password}, // 保存明文密码
                                });

                                console.log(`AutoAuth ${autoAuth.id} 密码已自动迁移为明文`);
                                break;
                            }
                        } catch (err) {
                            // 如果验证失败，继续尝试下一个

                        }
                    }
                }
            }

            if (!matchedAutoAuth) {
                return next(errors.createError(401, "密码不正确"));
            }
        } else {
            // 如果没有提供密码，查找密码为空的自动授权
            matchedAutoAuth = device.autoAuths.find(auth => !auth.password);

            if (!matchedAutoAuth) {
                return next(errors.createError(401, "需要提供密码"));
            }
        }

        // 根据自动授权配置创建 AppInstall
        const token = crypto.randomBytes(32).toString("hex");

        const installation = await prisma.appInstall.create({
            data: {
                deviceId: device.id,
                appId: appId,
                token,
                note: null,
                isReadOnly: matchedAutoAuth.isReadOnly,
                deviceType: matchedAutoAuth.deviceType,
            },
        });

        return res.status(201).json({
            success: true,
            token: installation.token,
            deviceType: installation.deviceType,
            isReadOnly: installation.isReadOnly,
            installedAt: installation.installedAt,
        });
    })
);

/**
 * POST /apps/tokens/:token/set-student-name
 * 设置学生名称 (仅限学生类型的 token)
 * Body: { name: string }
 */
router.post(
    "/tokens/:token/set-student-name",
    errors.catchAsync(async (req, res, next) => {
        const {token} = req.params;
        const {name} = req.body;

        if (!name) {
            return next(errors.createError(400, "需要提供学生名称"));
        }

        // 查找 token 对应的应用安装记录
        const appInstall = await prisma.appInstall.findUnique({
            where: {token},
            include: {
                device: true,
            },
        });

        if (!appInstall) {
            return next(errors.createError(404, "Token 不存在"));
        }

        // 验证 token 类型是否为 student
        if (!['student', 'parent'].includes(appInstall.deviceType)) {
            return next(errors.createError(403, "只有学生和家长类型的 token 可以设置名称"));
        }

        // 读取设备的 classworks-list-main 键值
        const kvRecord = await prisma.kVStore.findUnique({
            where: {
                deviceId_key: {
                    deviceId: appInstall.deviceId,
                    key: 'classworks-list-main',
                },
            },
        });

        if (!kvRecord) {
            return next(errors.createError(404, "设备未设置学生列表"));
        }

        // 解析学生列表
        let studentList;
        try {
            studentList = kvRecord.value;
            if (!Array.isArray(studentList)) {
                return next(errors.createError(500, "学生列表格式错误"));
            }
        } catch (error) {
            return next(errors.createError(500, "无法解析学生列表"));
        }

        // 验证名称是否在学生列表中
        const studentExists = studentList.some(student => student.name === name);

        if (!studentExists) {
            return next(errors.createError(400, "该名称不在学生列表中"));
        }

        // 更新 AppInstall 的 note 字段
        const updatedInstall = await prisma.appInstall.update({
            where: {id: appInstall.id},
            data: {note: appInstall.deviceType === 'parent' ? `${name} 家长` : name},
        });

        return res.json({
            success: true,
            token: updatedInstall.token,
            name: updatedInstall.note,
            deviceType: updatedInstall.deviceType,
            updatedAt: updatedInstall.updatedAt,
        });
    })
);

/**
 * POST /apps/tokens/:token/set-teacher-name
 * 设置教师名称 (仅限教师类型的 token)
 * Body: { name: string }
 */
router.post(
    "/tokens/:token/set-teacher-name",
    errors.catchAsync(async (req, res, next) => {
        const {token} = req.params;
        const {name} = req.body;

        if (!name) {
            return next(errors.createError(400, "需要提供教师名称"));
        }

        // 查找 token 对应的应用安装记录
        const appInstall = await prisma.appInstall.findUnique({
            where: {token},
            include: {
                device: true,
            },
        });

        if (!appInstall) {
            return next(errors.createError(404, "Token 不存在"));
        }

        // 验证 token 类型是否为 teacher
        if (appInstall.deviceType !== 'teacher') {
            return next(errors.createError(403, "只有教师类型的 token 可以使用此接口"));
        }

        // 更新 AppInstall 的 note 字段为教师名称
        const updatedInstall = await prisma.appInstall.update({
            where: {id: appInstall.id},
            data: {note: name},
        });

        return res.json({
            success: true,
            token: updatedInstall.token,
            name: updatedInstall.note,
            deviceType: updatedInstall.deviceType,
            updatedAt: updatedInstall.updatedAt,
        });
    })
);

/**
 * PUT /apps/tokens/:token/note
 * 更新令牌的备注信息
 * Body: { note: string }
 */
router.put(
    "/tokens/:token/note",
    errors.catchAsync(async (req, res, next) => {
        const {token} = req.params;
        const {note} = req.body;

        // 查找 token 对应的应用安装记录
        const appInstall = await prisma.appInstall.findUnique({
            where: {token},
        });

        if (!appInstall) {
            return next(errors.createError(404, "Token 不存在"));
        }

        // 更新 AppInstall 的 note 字段
        const updatedInstall = await prisma.appInstall.update({
            where: {id: appInstall.id},
            data: {note: note || null},
        });

        return res.json({
            success: true,
            token: updatedInstall.token,
            note: updatedInstall.note,
            updatedAt: updatedInstall.updatedAt,
        });
    })
);

export default router;