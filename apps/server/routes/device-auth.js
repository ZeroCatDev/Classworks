import {Router} from "express";
import deviceCodeStore from "../utils/deviceCodeStore.js";
import errors from "../utils/errors.js";
import { prisma } from "../utils/prisma.js";

const router = Router();


/**
 * POST /device/code
 * 生成设备授权码
 *
 * 应用调用此接口获取一个设备代码，返回给用户在前端进行授权
 *
 * Response:
 * {
 *   "device_code": "1234-ABCD",
 *   "expires_in": 900 (秒)
 * }
 */
router.post(
    "/device/code",
    errors.catchAsync(async (req, res) => {
        const deviceCode = deviceCodeStore.create();

        return res.json({
            device_code: deviceCode,
            expires_in: 900, // 15分钟
            message: "请在前端输入此代码进行授权",
        });
    })
);

/**
 * POST /device/bind
 * 绑定令牌到设备代码
 *
 * 前端用户授权后调用此接口，将token绑定到设备代码
 * 此接口独立于授权流程，可单独调用
 *
 * Request Body:
 * {
 *   "device_code": "1234-ABCD",
 *   "token": "actual-token-string"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "令牌已成功绑定到设备代码"
 * }
 */
router.post(
    "/device/bind",
    errors.catchAsync(async (req, res, next) => {
        const {device_code, token} = req.body;

        if (!device_code || !token) {
            return next(
                errors.createError(400, "请提供 device_code 和 token")
            );
        }

        // 验证token是否有效（检查数据库）
        const appInstall = await prisma.appInstall.findUnique({
            where: {token},
        });

        if (!appInstall) {
            return next(errors.createError(400, "无效的令牌"));
        }

        // 绑定令牌到设备代码
        const success = deviceCodeStore.bindToken(device_code, token);

        if (!success) {
            return next(
                errors.createError(400, "设备代码不存在或已过期")
            );
        }

        return res.json({
            success: true,
            message: "令牌已成功绑定到设备代码",
        });
    })
);

/**
 * GET /device/token
 * 轮询获取令牌
 *
 * 应用通过设备代码轮询此接口，获取用户授权后的token
 * 获取成功后，服务端会删除此设备代码
 *
 * Query Parameters:
 * - device_code: 设备代码
 *
 * Response (pending):
 * {
 *   "status": "pending",
 *   "message": "等待用户授权"
 * }
 *
 * Response (success):
 * {
 *   "status": "success",
 *   "token": "actual-token-string"
 * }
 *
 * Response (expired):
 * {
 *   "status": "expired",
 *   "message": "设备代码已过期"
 * }
 */
router.get(
    "/device/token",
    errors.catchAsync(async (req, res, next) => {
        const {device_code} = req.query;

        if (!device_code) {
            return next(errors.createError(400, "请提供 device_code"));
        }

        // 尝试获取并移除令牌
        const token = deviceCodeStore.getAndRemove(device_code);

        if (token) {
            // 令牌已绑定，返回并删除
            return res.json({
                status: "success",
                token,
            });
        }

        // 检查设备代码是否存在
        const status = deviceCodeStore.getStatus(device_code);

        if (!status) {
            // 设备代码不存在或已过期
            return res.json({
                status: "expired",
                message: "设备代码不存在或已过期",
            });
        }

        // 设备代码存在但令牌未绑定
        return res.json({
            status: "pending",
            message: "等待用户授权",
            expires_in: Math.floor((status.expiresAt - Date.now()) / 1000),
        });
    })
);

/**
 * GET /device/status
 * 查询设备代码状态（仅用于调试）
 *
 * Query Parameters:
 * - device_code: 设备代码
 *
 * Response:
 * {
 *   "device_code": "1234-ABCD",
 *   "exists": true,
 *   "has_token": false,
 *   "expires_in": 850 (秒)
 * }
 */
router.get(
    "/device/status",
    errors.catchAsync(async (req, res, next) => {
        const {device_code} = req.query;

        if (!device_code) {
            return next(errors.createError(400, "请提供 device_code"));
        }

        const status = deviceCodeStore.getStatus(device_code);

        if (!status) {
            return res.json({
                device_code,
                exists: false,
                message: "设备代码不存在或已过期",
            });
        }

        return res.json({
            device_code,
            exists: true,
            has_token: status.hasToken,
            expires_in: Math.floor((status.expiresAt - Date.now()) / 1000),
            created_at: status.createdAt,
        });
    })
);

export default router;
