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

        // 文章音乐卡片开始播放时，停止顶部背景音乐（与 Typecho 版共享同一音频的行为一致）
        if (window.IcefoxBgm) {
            window.IcefoxBgm.stopFromCard();
        }
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

/**
 * 解析后的歌单会话缓存有效期（毫秒）
 * 第三方 API 解析整张歌单较慢，且返回的播放地址有时效，故不宜缓存过久
 */
const ICEFOX_BGM_CACHE_TTL = 15 * 60 * 1000;

/**
 * ============================================================
 * 顶部背景音乐播放器
 *
 * 由 Typecho 版 assets/js/icefox.js 顶部音乐逻辑移植：
 *  - 顶部栏 播放 / 暂停 按钮 + 播放进度条
 *  - 可拖拽悬浮播放器（封面 / 播放暂停 / 关闭）
 *  - 一曲播完自动连播，列表末尾回到第一首
 *  - 与文章音乐卡片互斥（同一时刻只播放一个）
 *
 * 歌曲 / 歌单数据由服务器端 Meting API 解析：
 *   GET {api}?server={数据源}&type={song|playlist}&id={ID}
 * 返回字段：name / artist / url / pic / lrc
 * ============================================================
 */
class BackgroundMusicPlayer {
    constructor() {
        this.audio = document.getElementById('icefoxBgmAudio');
        this.island = document.getElementById('musicIsland');
        this.listBox = document.getElementById('topMusicList');

        // 收起态与展开态各有一份封面，需同时更新
        this.covers = document.querySelectorAll('#musicIsland .di-cover');
        this.titleEl = document.getElementById('musicIslandTitle');
        this.artistEl = document.getElementById('musicIslandArtist');
        this.elapsedEl = document.getElementById('musicIslandElapsed');
        this.remainEl = document.getElementById('musicIslandRemain');
        this.trackEl = document.getElementById('musicIslandTrack');
        this.progressFill = document.getElementById('musicIslandFill');

        this.coverMini = document.getElementById('musicIslandCoverMini');
        this.coverLarge = document.getElementById('musicIslandCover');
        this.miniToggleBtn = document.getElementById('musicIslandMiniToggle');
        this.panelPlayBtn = document.getElementById('musicIslandPlay');
        this.prevBtn = document.getElementById('musicIslandPrev');
        this.nextBtn = document.getElementById('musicIslandNext');
        this.closeBtn = document.getElementById('musicIslandClose');

        // {api, type: 'song' | 'playlist', entries: [{id, server}]}
        this.source = this.readSource();
        // 由 Meting 解析出来的播放列表
        this.tracks = [];
        // 列表就绪前不响应播放操作
        this.ready = false;
        this.bound = false;

        this.index = 0;
        this.currentUrl = '';
        // 当前是否处于「背景音乐」播放状态（对应 Typecho 的 isTopMusic）
        this.isBgm = false;
    }

    /**
     * 读取数据源配置
     * @returns {{api: string, type: string, entries: {id: string, server: string}[]}|null}
     */
    readSource() {
        const box = this.listBox;
        if (!box) return null;

        const api = (box.getAttribute('data-api') || '').trim();
        if (!api) return null;

        const entries = [];

        box.querySelectorAll('[data-id]').forEach(function (el) {
            const id = (el.getAttribute('data-id') || '').trim();
            if (!id) return;

            entries.push({
                id: id,
                server: (el.getAttribute('data-server') || '').trim() || 'netease'
            });
        });

        if (!entries.length) return null;

        return {
            api: api,
            type: box.getAttribute('data-type') === 'song' ? 'song' : 'playlist',
            entries: entries
        };
    }

    /**
     * 初始化：先由 Meting API 解析出播放列表，再显示灵动岛
     */
    async init() {
        if (!this.audio || !this.island || !this.source) return;

        this.bindControls();

        let tracks = [];

        try {
            tracks = await this.loadTracks();
        } catch (error) {
            // 常见原因：API 未开启跨域、地址填写错误、歌单/单曲 ID 无效
            console.warn('[icefox] 背景音乐加载失败：', error);
        }

        if (!tracks.length) {
            // 解析失败时保持隐藏
            return;
        }

        this.tracks = tracks;
        this.ready = true;
        this.bindAudio();
        this.applyTrackUI(0);
        this.resetProgressUI();
        this.setPlayingUI(false);
        this.island.classList.remove('hidden');
    }

    /**
     * 绑定顶部按钮与悬浮播放器
     */
    bindControls() {
        if (this.bound) return;
        this.bound = true;

        // 点击缩略图 / 大封面：展开与收起
        [this.coverMini, this.coverLarge].forEach((cover) => {
            if (cover) cover.addEventListener('click', () => this.toggleExpand());
        });

        if (this.miniToggleBtn) this.miniToggleBtn.addEventListener('click', () => this.togglePlay());
        if (this.panelPlayBtn) this.panelPlayBtn.addEventListener('click', () => this.togglePlay());
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.playPrev());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.playNext());
        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
        if (this.trackEl) this.trackEl.addEventListener('click', (e) => this.seek(e));
    }

    /**
     * 绑定音频事件
     */
    bindAudio() {
        this.audio.addEventListener('ended', () => this.playNext());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
    }

    /**
     * 加载播放列表：优先使用会话缓存，否则请求 Meting API
     * @returns {Promise<{title: string, artist: string, url: string, cover: string}[]>}
     */
    async loadTracks() {
        const cached = this.readCache();
        if (cached) return cached;

        const groups = await Promise.all(
            this.source.entries.map((entry) => this.requestSongs(entry))
        );

        const tracks = [];
        groups.forEach(function (group) {
            group.forEach(function (track) { tracks.push(track); });
        });

        if (tracks.length) this.writeCache(tracks);
        return tracks;
    }

    /**
     * 请求单条 ID（单曲或整张歌单）
     * @returns {Promise<{title: string, artist: string, url: string, cover: string}[]>}
     */
    async requestSongs(entry) {
        const response = await fetch(this.buildApiUrl(entry));
        if (!response.ok) {
            throw new Error('Meting API 响应异常：HTTP ' + response.status);
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : [data];

        return list.map((item) => this.toTrack(item)).filter(Boolean);
    }

    /**
     * 组装 Meting 请求地址
     */
    buildApiUrl(entry) {
        const base = this.source.api;
        const separator = base.indexOf('?') === -1 ? '?' : '&';

        return base + separator +
            'server=' + encodeURIComponent(entry.server) +
            '&type=' + encodeURIComponent(this.source.type) +
            '&id=' + encodeURIComponent(entry.id);
    }

    /**
     * 统一成播放器内部结构
     */
    toTrack(item) {
        if (!item || !item.url) return null;

        let artist = item.artist;
        if (Array.isArray(artist)) artist = artist.join(' / ');

        return {
            title: item.name || '',
            artist: artist || '',
            url: this.normalizeUrl(item.url),
            cover: this.normalizeUrl(item.pic)
        };
    }

    /**
     * 站点为 HTTPS 时把 http 资源升级为 https，避免被浏览器拦截
     */
    normalizeUrl(url) {
        if (!url) return '';

        const value = String(url).trim();
        if (window.location.protocol === 'https:' && /^http:\/\//i.test(value)) {
            return value.replace(/^http:\/\//i, 'https://');
        }

        return value;
    }

    /* ---------------- 会话缓存 ---------------- */

    cacheKey() {
        const entries = this.source.entries.map(function (entry) {
            return entry.server + ':' + entry.id;
        }).join(',');

        return 'icefox_bgm|' + this.source.api + '|' + this.source.type + '|' + entries;
    }

    readCache() {
        try {
            const raw = window.sessionStorage.getItem(this.cacheKey());
            if (!raw) return null;

            const cached = JSON.parse(raw);
            if (!cached || !cached.time || Date.now() - cached.time > ICEFOX_BGM_CACHE_TTL) return null;

            return Array.isArray(cached.tracks) && cached.tracks.length ? cached.tracks : null;
        } catch (error) {
            return null;
        }
    }

    writeCache(tracks) {
        try {
            window.sessionStorage.setItem(this.cacheKey(), JSON.stringify({
                time: Date.now(),
                tracks: tracks
            }));
        } catch (error) {
            /* 隐私模式下写入失败，忽略 */
        }
    }

    /* ---------------- 播放控制 ---------------- */

    /**
     * 播放 / 暂停
     */
    togglePlay() {
        if (!this.ready) return;

        if (!this.audio.paused) {
            this.pause();
            return;
        }

        // isBgm 为假说明之前是文章音乐卡片在播（或从未播放过），从第一首开始
        if (this.isBgm) {
            this.resume();
        } else {
            this.start(0);
        }
    }

    /**
     * 展开 / 收起灵动岛
     */
    toggleExpand() {
        if (!this.ready || !this.island) return;
        this.island.classList.toggle('expanded');
    }

    /**
     * 从指定索引开始播放
     */
    start(index) {
        const track = this.tracks[index];
        if (!track) return;

        this.index = index;

        if (this.currentUrl !== track.url) {
            this.currentUrl = track.url;
            this.audio.src = track.url;
            this.audio.load();
        }

        this.applyTrackUI(index);
        this.resetProgressUI();
        this.resume();
    }

    /**
     * 继续播放
     */
    resume() {
        if (!this.tracks.length) return;

        // 暂停文章中的音乐卡片，保证同一时刻只有一个声音
        if (window.IcefoxMusicManager) {
            window.IcefoxMusicManager.pauseAll();
        }

        this.isBgm = true;

        const promise = this.audio.play();
        if (promise && typeof promise.catch === 'function') {
            // 浏览器自动播放策略限制时静默失败
            promise.catch(function () { });
        }

        this.setPlayingUI(true);
    }

    /**
     * 暂停
     */
    pause() {
        this.audio.pause();
        this.setPlayingUI(false);
    }

    /**
     * 下一首（一曲播完也走这里）
     */
    playNext() {
        if (!this.ready) return;
        this.start((this.index + 1) % this.tracks.length);
    }

    /**
     * 上一首
     */
    playPrev() {
        if (!this.ready) return;
        this.start((this.index - 1 + this.tracks.length) % this.tracks.length);
    }

    /**
     * 关闭播放：停止并回到第一首、收起灵动岛
     */
    close() {
        this.reset(false);
    }

    /**
     * 文章音乐卡片开始播放时调用：停止背景音乐
     */
    stopFromCard() {
        if (!this.isBgm) return;
        this.reset(true);
    }

    /**
     * 复位播放状态
     * @param {boolean} keepSource 是否保留音频地址（否则下次播放重新加载）
     */
    reset(keepSource) {
        this.audio.pause();
        if (!keepSource) {
            this.audio.removeAttribute('src');
            this.audio.load();
        }

        this.currentUrl = '';
        this.index = 0;
        this.isBgm = false;

        if (this.island) this.island.classList.remove('expanded');
        this.resetProgressUI();
        this.applyTrackUI(0);
        this.setPlayingUI(false);
    }

    /* ---------------- 界面同步 ---------------- */

    /**
     * 把当前歌曲信息写入界面
     */
    applyTrackUI(index) {
        const track = this.tracks[index];
        if (!track) return;

        this.covers.forEach(function (cover) {
            if (track.cover) cover.src = track.cover;
            cover.alt = track.title || 'cover';
        });

        if (this.titleEl) this.titleEl.textContent = track.title || '未知歌曲';
        if (this.artistEl) this.artistEl.textContent = track.artist || '';
    }

    /**
     * 播放状态：切换播放 / 暂停图标，启停音频律动
     */
    setPlayingUI(playing) {
        if (this.island) this.island.classList.toggle('playing', playing);
    }

    /**
     * 更新进度条与时间显示
     */
    updateProgress() {
        const duration = this.audio.duration;
        if (!duration || isNaN(duration)) return;

        const current = this.audio.currentTime;
        this.updateProgressFill(current / duration);

        if (this.elapsedEl) this.elapsedEl.textContent = this.formatTime(current);
        if (this.remainEl) this.remainEl.textContent = '-' + this.formatTime(duration - current);
    }

    /**
     * 进度与时间归零
     */
    resetProgressUI() {
        this.updateProgressFill(0);
        if (this.elapsedEl) this.elapsedEl.textContent = '0:00';
        if (this.remainEl) this.remainEl.textContent = '-0:00';
    }

    /**
     * @param {number} ratio 0 ~ 1
     */
    updateProgressFill(ratio) {
        if (!this.progressFill) return;

        const percent = Math.min(100, Math.max(0, ratio * 100));
        this.progressFill.style.width = percent + '%';
    }

    /**
     * @param {number} seconds
     * @returns {string} 形如 3:05
     */
    formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) seconds = 0;

        const total = Math.floor(seconds);
        const secs = total % 60;

        return Math.floor(total / 60) + ':' + (secs < 10 ? '0' : '') + secs;
    }

    /**
     * 点击进度条跳转
     */
    seek(event) {
        const duration = this.audio.duration;
        if (!duration || isNaN(duration) || !this.trackEl) return;

        const rect = this.trackEl.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));

        this.audio.currentTime = ratio * duration;
        this.updateProgress();
    }

}

// 页面加载时初始化
$(document).ready(function() {
    IcefoxMusicManager.init();

    window.IcefoxBgm = new BackgroundMusicPlayer();
    window.IcefoxBgm.init();
});
