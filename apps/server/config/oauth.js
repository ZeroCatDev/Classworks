// OAuth 提供者配置
export const oauthProviders = {
    github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        authorizationURL: "https://github.com/login/oauth/authorize",
        tokenURL: "https://github.com/login/oauth/access_token",
        userInfoURL: "https://api.github.com/user",
        scope: "read:user user:email",
        // 展示相关
        name: "GitHub",
        displayName: "GitHub",
        icon: "github",
        color: "#24292e",
        description: "使用 GitHub 账号登录",
        website: "https://github.com",
    },
    zerocat: {
        clientId: process.env.ZEROCAT_CLIENT_ID,
        clientSecret: process.env.ZEROCAT_CLIENT_SECRET,
        authorizationURL: "https://zerocat-api.houlang.cloud/oauth/authorize",
        tokenURL: "https://zerocat-api.houlang.cloud/oauth/token",
        userInfoURL: "https://zerocat-api.houlang.cloud/oauth/userinfo",
        scope: "user:basic user:email",
        // 展示相关
        name: "ZeroCat",
        displayName: "ZeroCat",
        icon: "zerocat",
        color: "#415f91",
        description: "使用 ZeroCat 账号登录",
        website: "https://zerocat.dev",
    },
    stcn: {
        // STCN（Casdoor）- 标准 OIDC Provider
        clientId: process.env.STCN_CLIENT_ID,
        clientSecret: process.env.STCN_CLIENT_SECRET,
        // Casdoor 标准端点
        authorizationURL: "https://auth.smart-teach.cn/login/oauth/authorize",
        tokenURL: "https://auth.smart-teach.cn/api/login/oauth/access_token",
        userInfoURL: "https://auth.smart-teach.cn/api/userinfo",
        scope: "openid profile email offline_access",
        // 展示相关
        name: "stcn",
        displayName: "智教联盟账户",
        icon: "casdoor",
        color: "#1068af",
        description: "使用智教联盟账户登录",
        website: "https://auth.smart-teach.cn",
        tokenRequestFormat: "json", // Casdoor 推荐 JSON 提交
    },
    hly: {
        // 厚浪云（Logto） - OIDC Provider
        clientId: process.env.HLY_CLIENT_ID,
        clientSecret: process.env.HLY_CLIENT_SECRET,
        authorizationURL: "https://oauth.houlang.cloud/oidc/auth",
        tokenURL: "https://oauth.houlang.cloud/oidc/token",
        userInfoURL: "https://oauth.houlang.cloud/oidc/me",
        scope: "openid profile email offline_access",
        // 展示相关
        name: "厚浪云",
        displayName: "厚浪云",
        icon: "logto",
        color: "#2d53f8",
        textColor: "#ffffff",
        order: 40,
        description: "使用厚浪云账号登录",
        website: "https://houlang.cloud",
        pkce: true, // 启用PKCE支持
    },
    dlass: {
        // Dlass（Casdoor）- 标准 OIDC Provider
        clientId: process.env.DLASS_CLIENT_ID,
        clientSecret: process.env.DLASS_CLIENT_SECRET,
        // Casdoor 标准端点
        authorizationURL: "https://auth.lingloft.cn/login/oauth/authorize",
        tokenURL: "https://auth.lingloft.cn/api/login/oauth/access_token",
        userInfoURL: "https://auth.lingloft.cn/api/userinfo",
        scope: "openid profile email offline_access",
        // 展示相关
        name: "dlass",
        displayName: "Dlass 账户",
        icon: "casdoor",
        color: "#3498db",
        description: "使用Dlass账户登录",
        website: "https://dlass.tech",
        tokenRequestFormat: "json", // Casdoor 推荐 JSON 提交
    },
};

// 获取OAuth回调URL
export function getCallbackURL(provider) {
    const baseUrl = process.env.BASE_URL;
    return `${baseUrl}/accounts/oauth/${provider}/callback`;
}

// 生成随机state参数
export function generateState() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}