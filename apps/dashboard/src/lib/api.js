import axiosInstance from './axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3030'
const SITE_KEY = import.meta.env.VITE_SITE_KEY || ''

class ApiClient {
    constructor(baseUrl, siteKey) {
        this.baseUrl = baseUrl
        this.siteKey = siteKey
    }

    async fetch(endpoint, options = {}) {
        const method = options.method || 'GET'
        const headers = {...options.headers}
        const data = options.body
        const params = options.params

        try {
            // 通过 axios 实例发起请求（已内置 baseURL 与 x-site-key）
            const result = await axiosInstance.request({
                url: endpoint,
                method,
                headers,
                data,
                params,
            })

            // axios 响应拦截器已返回 response.data，这里做空值统一
            if (result === '' || result === undefined || result === null) return {}
            return result
        } catch (err) {
            // 某些后端会在非 2xx 状态下直接返回有效数据，这里兜底返回 body
            const resp = err?.response
            if (resp && resp.data !== undefined) {
                return resp.data
            }
            throw err
        }
    }

    // 带认证的fetch
    async authenticatedFetch(endpoint, options = {}, token = null) {
        const headers = {
            ...options.headers,
        }

        // 如果提供了token，添加Authorization头
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        return this.fetch(endpoint, {
            ...options,
            headers,
        })
    }

    // 应用相关 API
    async getApps(params = {}) {
        const query = new URLSearchParams(params).toString()
        return this.fetch(`/apps${query ? `?${query}` : ''}`)
    }

    async getApp(appId) {
        return this.fetch(`/apps/info/${appId}`)
    }

    async getAppInstallations(appId, deviceUuid, params = {}) {
        const query = new URLSearchParams(params).toString()
        return this.fetch(`/apps/info/${appId}/device-installations${query ? `?${query}` : ''}`, {
            headers: {
                'x-device-uuid': deviceUuid,
            },
        })
    }

    // Token 管理 API
    async getDeviceTokens(deviceUuid, options = {}) {
        const params = new URLSearchParams({
            uuid: deviceUuid,
        });

        return this.fetch(`/apps/tokens?${params}`);
    }

    async revokeToken(targetToken, authOptions = {}) {
        const {deviceUuid, usePathParam = true, bearerToken} = authOptions;

        if (usePathParam) {
            // 使用路径参数方式 (推荐)
            const headers = {};

            if (bearerToken) {
                headers['Authorization'] = `Bearer ${bearerToken}`;
            } else if (deviceUuid) {
                headers['x-device-uuid'] = deviceUuid;
            }

            return this.fetch(`/apps/tokens/${targetToken}`, {
                method: 'DELETE',
                headers,
            });
        } else {
            // 使用查询参数方式 (向后兼容)
            const params = new URLSearchParams({token: targetToken});
            const headers = {};

            if (bearerToken) {
                headers['Authorization'] = `Bearer ${bearerToken}`;
            } else if (deviceUuid) {
                headers['x-device-uuid'] = deviceUuid;
            }

            return this.fetch(`/apps/tokens?${params}`, {
                method: 'DELETE',
                headers,
            });
        }
    }

    // 应用安装接口 (对应后端的 /apps/devices/:uuid/install/:appId)
    async authorizeApp(appId, deviceUuid, options = {}) {
        const {note, token} = options;

        const headers = {
            'x-device-uuid': deviceUuid,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // 使用新的安装接口
        return this.fetch(`/apps/devices/${deviceUuid}/install/${appId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({note: note || '应用授权'}),
        });
    }

    // 设备级别的应用卸载，使用新的 uninstall 接口
    async revokeDeviceToken(deviceUuid, installId, token = null) {
        const params = new URLSearchParams({uuid: deviceUuid});
        const headers = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return this.fetch(`/apps/devices/${deviceUuid}/uninstall/${installId}?${params}`, {
            method: 'DELETE',
            headers,
        });
    }


    // 设备授权相关 API
    async bindDeviceCode(deviceCode, token) {
        return this.fetch('/auth/device/bind', {
            method: 'POST',
            body: JSON.stringify({device_code: deviceCode, token}),
        })
    }

    async getDeviceCodeStatus(deviceCode) {
        return this.fetch(`/auth/device/status?device_code=${deviceCode}`)
    }

    // KV 存储管理 API
    async listKVItems(token, params = {}) {
        const query = new URLSearchParams(params).toString()
        return this.fetch(`/kv${query ? `?${query}` : ''}`, {
            headers: {'x-app-token': token}
        })
    }

    async getKVItem(token, key) {
        return this.fetch(`/kv/${encodeURIComponent(key)}`, {
            headers: {'x-app-token': token}
        })
    }

    async setKVItem(token, key, value) {
        return this.fetch(`/kv/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: {'x-app-token': token},
            body: JSON.stringify(value),
        })
    }

    async deleteKVItem(token, key) {
        return this.fetch(`/kv/${encodeURIComponent(key)}`, {
            method: 'DELETE',
            headers: {'x-app-token': token}
        })
    }

    async getKVKeys(token, pattern = '*') {
        return this.fetch(`/kv/_keys?pattern=${encodeURIComponent(pattern)}`, {
            headers: {'x-app-token': token}
        })
    }

    // 设备信息 API
    async getDeviceInfo(deviceUuid) {
        return this.fetch(`/devices/${deviceUuid}`)
    }

    // 获取设备应用列表 API (公开接口，无需认证)
    async getDeviceApps(deviceUuid) {
        return this.fetch(`/apps/devices/${deviceUuid}/apps`)
    }


    // 账户相关 API（Authorization 由 axios 拦截器统一注入）
    async getOAuthProviders() {
        return this.fetch('/accounts/oauth/providers')
    }

    async getAccountProfile() {
        return this.fetch('/accounts/profile')
    }

    async getAccountDevices() {
        return this.fetch('/accounts/devices')
    }

    async bindDevice(deviceUuid) {
        return this.fetch('/accounts/devices/bind', {
            method: 'POST',
            body: JSON.stringify({uuid: deviceUuid}),
        })
    }

    async unbindDevice(deviceUuid) {
        return this.fetch('/accounts/devices/unbind', {
            method: 'POST',
            body: JSON.stringify({uuid: deviceUuid}),
        })
    }

    async getDeviceAccount(deviceUuid) {
        return this.fetch(`/accounts/device/${deviceUuid}/account`)
    }

    // ===== 账户 Token 刷新与信息 =====
    async refreshAccessToken(refreshToken) {
        return this.fetch('/accounts/refresh', {
            method: 'POST',
            // 刷新接口不应由请求拦截器附加旧的 Authorization
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({refresh_token: refreshToken}),
        })
    }

    async getTokenInfo(accessToken) {
        return this.fetch('/accounts/token-info', {
            headers: {'Authorization': `Bearer ${accessToken}`}
        })
    }

    // 绑定设备到当前账户
    async bindDeviceToAccount(deviceUuid) {
        return this.fetch('/accounts/devices/bind', {
            method: 'POST',
            body: JSON.stringify({uuid: deviceUuid}),
        })
    }

    // 解绑设备
    async unbindDeviceFromAccount(deviceUuid) {
        return this.fetch('/accounts/devices/unbind', {
            method: 'POST',
            body: JSON.stringify({uuid: deviceUuid}),
        })
    }

    // 批量解绑设备
    async batchUnbindDevices(deviceUuids) {
        return this.fetch('/accounts/devices/unbind', {
            method: 'POST',
            body: JSON.stringify({uuids: deviceUuids}),
        })
    }

    // 设备名称管理 API
    async setDeviceName(deviceUuid, name, token = null) {
        const headers = {
            'x-device-uuid': deviceUuid,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return this.fetch(`/devices/${deviceUuid}/name`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({name}),
        });
    }


    // 设备注册 API
    async registerDevice(uuid, deviceName, token = null) {
        return this.authenticatedFetch('/devices', {
            method: 'POST',
            body: JSON.stringify({uuid, deviceName}),
        }, token)
    }


    // 兼容性方法 - 保持旧的API调用方式
    async getTokens(deviceUuid, options = {}) {
        return this.getDeviceTokens(deviceUuid, options);
    }

    async deleteToken(targetToken, deviceUuid = null) {
        // 向后兼容的删除方法
        return this.revokeToken(targetToken, {deviceUuid, usePathParam: true});
    }

    // 便捷方法：使用设备UUID删除token
    async revokeTokenByDevice(targetToken, deviceUuid) {
        return this.revokeToken(targetToken, {
            deviceUuid,
            usePathParam: true
        });
    }

    // 便捷方法：使用账户token删除token
    async revokeTokenByAccount(targetToken, bearerToken) {
        return this.revokeToken(targetToken, {
            bearerToken,
            usePathParam: true
        });
    }

    // 便捷方法：应用自撤销
    async revokeOwnToken(targetToken) {
        return this.fetch(`/apps/tokens/${targetToken}`, {
            method: 'DELETE',
            headers: {
                'x-app-token': targetToken,
            },
        });
    }

    // 新的便捷方法
    async getTokensWithAuth(authType, authValue, options = {}) {
        const headers = {};
        const params = new URLSearchParams(options);

        switch (authType) {
            case 'uuid':
                headers['x-device-uuid'] = authValue;
                params.set('uuid', authValue);
                break;
            case 'token':
                headers['x-app-token'] = authValue;
                break;
            case 'bearer':
                headers['Authorization'] = `Bearer ${authValue}`;
                break;
        }

        return this.fetch(`/apps/tokens?${params}`, {headers});
    }

    async revokeTokenWithAuth(targetToken, authType, authValue) {
        const headers = {};
        const params = new URLSearchParams({token: targetToken});

        switch (authType) {
            case 'uuid':
                headers['x-device-uuid'] = authValue;
                break;
            case 'token':
                headers['x-app-token'] = authValue;
                break;
            case 'bearer':
                headers['Authorization'] = `Bearer ${authValue}`;
                break;
        }

        return this.fetch(`/apps/tokens?${params}`, {
            method: 'DELETE',
            headers,
        });
    }

    // ============ AutoAuth 管理 API ============
    // 注意：所有 AutoAuth 管理接口现在需要 JWT Token 认证
    // 只有已绑定账户的设备才能使用这些接口

    // 获取设备的自动授权配置列表
    async getAutoAuthConfigs(deviceUuid, token) {
        return this.authenticatedFetch(`/auto-auth/devices/${deviceUuid}/auth-configs`, {
            method: 'GET',
        }, token);
    }

    // 创建自动授权配置
    async createAutoAuthConfig(deviceUuid, token, config) {
        return this.authenticatedFetch(`/auto-auth/devices/${deviceUuid}/auth-configs`, {
            method: 'POST',
            body: JSON.stringify(config),
        }, token);
    }

    // 更新自动授权配置
    async updateAutoAuthConfig(deviceUuid, token, configId, updates) {
        return this.authenticatedFetch(`/auto-auth/devices/${deviceUuid}/auth-configs/${configId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }, token);
    }

    // 删除自动授权配置
    async deleteAutoAuthConfig(deviceUuid, token, configId) {
        return this.authenticatedFetch(`/auto-auth/devices/${deviceUuid}/auth-configs/${configId}`, {
            method: 'DELETE',
        }, token);
    }

    // 修改设备的 namespace
    async updateDeviceNamespace(deviceUuid, token, namespace) {
        return this.authenticatedFetch(`/auto-auth/devices/${deviceUuid}/namespace`, {
            method: 'PUT',
            body: JSON.stringify({namespace}),
        }, token);
    }

    // 通过 namespace 和密码获取 token (Apps API)
    async getTokenByNamespace(namespace, password, appId) {
        return this.fetch('/apps/auth/token', {
            method: 'POST',
            body: JSON.stringify({namespace, password, appId}),
        });
    }

    // 设置学生名称 (Apps API)
    async setStudentName(token, name) {
        return this.fetch(`/apps/tokens/${token}/set-student-name`, {
            method: 'POST',
            body: JSON.stringify({name}),
        });
    }
}

export const apiClient = new ApiClient(API_BASE_URL, SITE_KEY)
