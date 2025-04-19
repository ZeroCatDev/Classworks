// 处理新的base64编码的config参数
const encodedConfig = urlParams.get('config');
if (encodedConfig) {
  try {
    // 解码base64
    const base64Decoded = atob(encodedConfig);

    // 转换回UTF-8字节数组
    const utf8Bytes = new Uint8Array(base64Decoded.length);
    for (let i = 0; i < base64Decoded.length; i++) {
      utf8Bytes[i] = base64Decoded.charCodeAt(i);
    }

    // 解码UTF-8字节数组为字符串
    const utf8Decoder = new TextDecoder();
    const jsonString = utf8Decoder.decode(utf8Bytes);

    // 解析JSON
    const configObj = JSON.parse(jsonString);

    // 应用每个设置
    for (const [key, value] of Object.entries(configObj)) {
      const success = setSetting(key, value);
      if (success) {
        appliedSettings[key] = value;
      }
    }

    return appliedSettings;
  } catch (error) {
    console.error('解析配置参数失败:', error);
  }
}
