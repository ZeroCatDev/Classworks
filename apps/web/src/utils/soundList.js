/**
 * 自动生成的音频文件列表
 * 由 scripts/generate-sound-list.js 生成
 * 请勿手动修改此文件
 */

// 所有可用的音频文件列表
export const soundFiles = [
  "Teams Ping.mp3",
  "Teams Remix.mp3",
  "Teams bounce.mp3",
  "Teams incoming-ringtone-level30.mp3",
  "Teams incoming-ringtone-level40.mp3",
  "Teams meetup_ring.mp3",
  "Teams screenshare_ring.mp3",
  "Teams teams_meet_up_reminder.mp3",
  "Teams teams_notification.mp3",
  "Teams 优先处理.mp3",
  "Teams 共鸣.mp3",
  "Teams 召唤.mp3",
  "Teams 叮铃.mp3",
  "Teams 增强.mp3",
  "Teams 尤里卡.mp3",
  "Teams 弹拨.mp3",
  "Teams 提醒.mp3",
  "Teams 摇摆.mp3",
  "Teams 时空.mp3",
  "Teams 气泡(大声).mp3",
  "Teams 气泡.mp3",
  "Teams 波普.mp3",
  "Teams 波纹.mp3",
  "Teams 滴水.mp3",
  "Teams 点击.mp3",
  "Teams 蜂鸣声.mp3",
  "Teams 警报.mp3",
  "Teams 赋予希望.mp3",
  "Teams 轻弹.mp3",
  "Teams 进阶.mp3",
  "Teams 重复振铃.mp3",
  "Teams 颤振.mp3",
  "Teams 高分.mp3",
  "Teams 默认.mp3",
  "Teams 默认通话铃.mp3"
];

// 默认的单次通知铃声
export const defaultSingleSound = 'Teams 默认.mp3';

// 默认的持续通知铃声
export const defaultUrgentSound = 'Teams 默认通话铃.mp3';

// 获取音频文件的完整路径
export function getSoundPath(filename) {
  if (!filename) return null;
  // 使用public目录路径，Vite会在构建时将public目录的文件复制到dist根目录
  // 这样开发和生产环境都能正确加载音频文件
  return `/sounds/${filename}`;
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
