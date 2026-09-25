/**
 * icefox 主题音乐播放器
 *
 * @package icefox
 * @author 小胖脸
 * @version 3.0.0
 * @link https://xiaopanglian.com
 */

/**
 * 单个音乐卡片播放器类
 */
class MusicPlayer {
    constructor(container) {
        this.container = container;
        this.audio = container.querySelector('audio');
        this.playBtn = container.querySelector('.play-btn');
        this.progressBar = container.querySelector('.progress-bar');
        this.progressFill = container.querySelector('.progress-fill');
        this.timeDisplay = container.querySelector('.time');
        this.playIcon = container.querySelector('.play-icon');
        this.pauseIcon = container.querySelector('.pause-icon');

        this.isPlaying = false;

        this.init();
    }

    /**
     * 初始化播放器
     */
    init() {
        if (!this.audio || !this.playBtn) {
            console.error('音乐播放器初始化失败：缺少必要元素');
            return;
        }

        // 绑定播放/暂停事件
        this.playBtn.addEventListener('click', () => this.toggle());

        // 监听播放事件，通知全局管理器
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
            if (window.IcefoxMusicManager) {
                window.IcefoxMusicManager.onPlay(this);
            }
        });

        // 监听暂停事件
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });

        // 更新进度条
        this.audio.addEventListener('timeupdate', () => this.updateProgress());

        // 更新时间显示
        this.audio.addEventListener('loadedmetadata', () => this.updateTime());

        // 播放结束时重置
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            this.progressFill.style.width = '0%';
        });

        // 点击进度条跳转
        if (this.progressBar) {
            this.progressBar.addEventListener('click', (e) => this.seek(e));
        }

        // 错误处理
        this.audio.addEventListener('error', (e) => {
            console.error('音频加载失败:', e);
            alert('音频加载失败，请检查音频地址是否正确');
        });
    }

    /**
     * 切换播放/暂停
     */
    toggle() {
        if (this.audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    /**
     * 播放音乐
     */
    play() {
        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('播放失败:', error);
            });
        }
    }

    /**
     * 暂停音乐
     */
    pause() {
        this.audio.pause();
    }

    /**
     * 更新播放按钮图标
     */
    updatePlayButton() {
        if (this.isPlaying) {
            this.playIcon.classList.add('is-hidden');
            this.pauseIcon.classList.remove('is-hidden');
            this.playBtn.classList.add('playing');
        } else {
            this.playIcon.classList.remove('is-hidden');
            this.pauseIcon.classList.add('is-hidden');
            this.playBtn.classList.remove('playing');
        }
    }

    /**
     * 更新进度条
     */
    updateProgress() {
        if (!this.audio.duration) return;

        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressFill.style.width = percent + '%';
        this.updateTime();
    }

    /**
     * 更新时间显示
     */
    updateTime() {
        if (!this.audio.duration || isNaN(this.audio.duration)) {
            this.timeDisplay.textContent = '00:00 / 00:00';
            return;
        }

        const current = this.formatTime(this.audio.currentTime);
        const duration = this.formatTime(this.audio.duration);
        this.timeDisplay.textContent = `${current} / ${duration}`;
    }

    /**
     * 格式化时间
     */
    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 跳转到指定位置
     */
    seek(e) {
        if (!this.audio.duration) return;

        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = percent * this.audio.duration;
    }
}

/**
 * 全局音乐播放管理器
 */
window.IcefoxMusicManager = {
    currentPlayer: null,
    players: [],

    /**
     * 注册播放器
     */
    register(player) {
        if (!this.players.includes(player)) {
            this.players.push(player);
        }
    },

    /**
     * 当某个播放器开始播放时调用
     */
    onPlay(player) {
        // 暂停所有其他播放器
        this.players.forEach(p => {
            if (p !== player && p.isPlaying) {
                p.pause();
            }
        });

        this.currentPlayer = player;
    },

    /**
     * 初始化页面上的所有音乐卡片
     */
    init() {
        const containers = document.querySelectorAll('[data-music-player]');

        containers.forEach(container => {
            // 检查是否已经初始化过
            if (container.dataset.musicPlayerInitialized) {
                return;
            }

            const player = new MusicPlayer(container);
            this.register(player);

            // 标记为已初始化
            container.dataset.musicPlayerInitialized = 'true';
        });
    },

    /**
     * 暂停所有播放器
     */
    pauseAll() {
        this.players.forEach(p => p.pause());
    }
};

// 页面加载时初始化
$(document).ready(function() {
    IcefoxMusicManager.init();
});
