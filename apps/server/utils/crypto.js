import bcrypt from "bcrypt";
import {Base64} from "js-base64";

const SALT_ROUNDS = 8;

/**
 * 从 base64 解码字符串
 */
export function decodeBase64(str) {
    if (!str) return null;
    try {
        return Base64.decode(str);
    } catch (error) {
        return null;
    }
}

/**
 * 对字符串进行 UTF-8 编码处理
 */
function encodeUTF8(str) {
    try {
        return encodeURIComponent(str);
    } catch (error) {
        return null;
    }
}

/**
 * 验证站点密钥
 */
export function verifySiteKey(providedKey, actualKey) {
    if (!actualKey) return true; // 如果没有设置站点密钥，则总是通过
    if (!providedKey) return false;
    const decodedKey = decodeBase64(providedKey);
    if (!decodedKey) return false;
    const encodedKey = encodeUTF8(decodedKey);
    if (!encodedKey) return false;
    console.debug(encodedKey);
    return encodedKey === actualKey;
}

/**
 * 哈希密码
 * @param {string} password - 明文密码
 * @returns {Promise<string>} 哈希后的密码
 */
export async function hashPassword(password) {
    if (!password) return null;
    return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证设备密码
 * @param {string} providedPassword - 用户提供的明文密码
 * @param {string} hashedPassword - 存储的哈希密码
 * @returns {Promise<boolean>} 密码是否匹配
 */
export async function verifyDevicePassword(providedPassword, hashedPassword) {
    if (!providedPassword || !hashedPassword) return false;
    try {
        return await bcrypt.compare(providedPassword, hashedPassword);
    } catch (error) {
        console.error('密码验证错误:', error);
        return false;
    }
}
