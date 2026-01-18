/**
 * 自动生成音频文件列表脚本
 * 读取 src/assets/sounds 文件夹中的所有音频文件并生成列表
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 音频文件路径
const soundsDir = path.join(__dirname, '../public/sounds');
const outputFile = path.join(__dirname, '../src/utils/soundList.js');

// 读取音频文件
function getSoundFiles() {
  try {
    const files = fs.readdirSync(soundsDir);
    // 过滤出音频文件（.mp3, .wav, .ogg等）
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext);
    });

    return audioFiles.sort();
  } catch (error) {
    console.error('读取音频文件夹失败:', error);
    return [];
  }
}

// 生成文件内容
function generateSoundList() {
  const soundFiles = getSoundFiles();

  const fileContent = `/**
 * 自动生成的音频文件列表
 * 由 scripts/generate-sound-list.js 生成
 * 请勿手动修改此文件
 */

// 所有可用的音频文件列表
export const soundFiles = ${JSON.stringify(soundFiles, null, 2)};

// 默认的单次通知铃声
export const defaultSingleSound = 'Teams 默认.mp3';

// 默认的持续通知铃声
export const defaultUrgentSound = 'Teams 默认通话铃.mp3';

// 获取音频文件的完整路径
export function getSoundPath(filename) {
  if (!filename) return null;
  // 使用public目录路径，Vite会在构建时将public目录的文件复制到dist根目录
  // 这样开发和生产环境都能正确加载音频文件
  return \`/sounds/\${filename}\`;
}

// 播放音频文件
export function playSound(filename, loop = false) {
  const path = getSoundPath(filename);
  if (!path) {
    console.warn('音频文件不存在:', filename);
    return null;
  }

  try {
    // eslint-disable-next-line no-undef
    const audio = new Audio(path);
    audio.loop = loop;

    // 尝试播放，但不阻止返回audio对象
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        // 静默处理错误，调用者应该自己处理
        console.warn('播放音频失败:', err.name, err.message);
      });
    }

    return audio;
  } catch (error) {
    console.error('创建音频对象失败:', error);
    return null;
  }
}

// 播放音频文件（Promise版本，用于更好的错误处理）
export function playSoundAsync(filename, loop = false) {
  return new Promise((resolve, reject) => {
    const path = getSoundPath(filename);
    if (!path) {
      reject(new Error('音频文件不存在'));
      return;
    }

    try {
      // eslint-disable-next-line no-undef
      const audio = new Audio(path);
      audio.loop = loop;

      // 预加载音频文件
      audio.preload = 'auto';

      audio.play()
        .then(() => resolve(audio))
        .catch(err => reject(err));
    } catch (error) {
      reject(error);
    }
  });
}

// 停止音频播放
export function stopSound(audio) {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}
`;

  return fileContent;
}

// 写入文件
function writeSoundList() {
  try {
    const content = generateSoundList();

    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, content, 'utf-8');
    console.log('✓ 音频文件列表生成成功:', outputFile);
    console.log('✓ 共找到', getSoundFiles().length, '个音频文件');
  } catch (error) {
    console.error('✗ 生成音频列表失败:', error);
    process.exit(1);
  }
}

// 执行生成
writeSoundList();
