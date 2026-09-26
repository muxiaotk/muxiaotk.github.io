/**
 * Icefox 主题主脚本（Hexo 版）
 * 由 Typecho 版 assets/js/icefox.js 移植，并适配静态站点：
 *  - 点赞：默认使用 localStorage，本地可用；配置 like.api 后可切换为远程接口
 *  - 无限滚动：适配 Hexo 的 /page/N/ 分页结构
 */

$(function () {
    printCopyright();
    initFancybox();
    initLikes();
    initInfiniteScroll();
    initTopContainerScroll();
    initCollapseToggle();
    initBackToTop();
});

/* ============================================================
 * Fancybox
 * ============================================================ */
function fancyboxOptions() {
    return {
        Thumbs: {
            autoStart: false
        },
        Toolbar: {
            display: {
                left: ["infobar"],
                middle: ["zoomIn", "zoomOut", "toggle1to1", "rotateCCW", "rotateCW", "flipX", "flipY"],
                right: ["slideshow", "thumbs", "close"],
            },
        },
        loop: true,
        keyboard: {
            Escape: "close",
            Delete: "close",
            Backspace: "close",
            PageUp: "next",
            PageDown: "prev",
            ArrowUp: "next",
            ArrowDown: "prev",
            ArrowRight: "next",
            ArrowLeft: "prev",
        },
    };
}

function initFancybox() {
    if (typeof Fancybox === 'undefined') return;
    Fancybox.bind("[data-fancybox]", fancyboxOptions());
}

/* ============================================================
 * 顶部栏滚动变色 + 图标切换
 * ============================================================ */
function initTopContainerScroll() {
    const $topContainer = $('.top-container');
    if (!$topContainer.length) return;

    // 顶部栏固定高 56px：横幅滚过顶部栏之后再切换底色与图标
    // 横幅高度随宽度自适应（9:5），所以阈值需要实时计算，不能写死
    let scrollThreshold = 264;
    let lastScrollState = false;

    function updateThreshold() {
        const header = document.querySelector('.header-container');
        if (header) {
            scrollThreshold = Math.max(0, header.offsetHeight - 56);
        }
    }

    updateThreshold();
    $(window).on('resize', updateThreshold);

    function toggleIcons(isScrolled) {
        $('.tc-user, .tc-music, .tc-edit, .tc-setting').each(function () {
            const $iconContainer = $(this);
            const iconType = $iconContainer.data('icon');
            const newIconType = isScrolled ? iconType + '-outline' : iconType;
            const $preloadedIcon = $(`.preloaded-icons [data-icon="${newIconType}"]`);
            if ($preloadedIcon.length) {
                $iconContainer.html($preloadedIcon.html());
            }
        });
    }

    $(window).scroll(function () {
        const isScrolled = $(this).scrollTop() > scrollThreshold;
        if (isScrolled === lastScrollState) return;

        if (isScrolled) {
            $topContainer.addClass('scrolled');
            toggleIcons(true);
        } else {
            $topContainer.removeClass('scrolled');
            toggleIcons(false);
        }
        lastScrollState = isScrolled;
    });

    $(window).trigger('scroll');
}

/* ============================================================
 * 全文 / 收起
 * ============================================================ */
function initCollapseToggle() {
    $(document).on('click', '.show_all_btn', function () {
        const cid = $(this).data('cid');
        $('.summary-' + cid).addClass('hidden');
        $('.full_content-' + cid).removeClass('hidden');
    });

    $(document).on('click', '.hide_all_btn', function () {
        const cid = $(this).data('cid');
        $('.summary-' + cid).removeClass('hidden');
        $('.full_content-' + cid).addClass('hidden');
    });
}

/* ============================================================
 * 回到顶部
 * ============================================================ */
function initBackToTop() {
    const $backToTop = $('#backToTop');
    if (!$backToTop.length) return;

    const showThreshold = 320;

    $(window).on('scroll', function () {
        if ($(window).scrollTop() > showThreshold) {
            $backToTop.addClass('show');
        } else {
            $backToTop.removeClass('show');
        }
    });

    $backToTop.on('click', function () {
        $('html, body').animate({ scrollTop: 0 }, 600, 'linear', function () {
            $backToTop.removeClass('show');
        });
    });
}

/* ============================================================
 * 无限滚动（适配 Hexo 分页）
 * ============================================================ */
function initInfiniteScroll() {
    if (typeof Scrollload === 'undefined') return;
    if (!$('.scrollload-container').length) return;

    const $currentPageEl = $('.current-page');
    const $totalPagesEl = $('.total-pages');
    if (!$currentPageEl.length || !$totalPagesEl.length) return;

    let currentPage = parseInt($currentPageEl.data('page')) || 1;
    const totalPages = parseInt($totalPagesEl.data('total')) || 1;

    if (currentPage >= totalPages) return;

    // 启用无限滚动后隐藏分页链接（无 JS 时仍保留作为回退）
    $('.page-nav-wrapper').hide();

    const dir = (window.ICEFOX_CONFIG && window.ICEFOX_CONFIG.paginationDir) || 'page';

    function basePath() {
        let path = window.location.pathname;
        path = path.replace(new RegExp('/' + dir + '/\\d+/?$'), '');
        if (path === '') path = '/';
        if (path.charAt(path.length - 1) !== '/') path += '/';
        return path;
    }

    const scrollload = new Scrollload({
        container: document.querySelector('.scrollload-container'),
        content: document.querySelector('.scrollload-content'),
        threshold: 100,
        loadingHtml: `
            <div class="scrollload-loading">
                <div class="loading-spinner"></div>
                <span>正在加载更多内容...</span>
            </div>
        `,
        noMoreDataHtml: `
            <div class="scrollload-nomore">
                <span>没有更多内容了</span>
            </div>
        `,
        exceptionHtml: `
            <div class="scrollload-error">
                <span>加载失败，请稍后重试</span>
                <button class="retry-btn" onclick="location.reload()">重新加载</button>
            </div>
        `,
        loadMore: function (sl) {
            currentPage++;
            if (currentPage > totalPages) {
                sl.noMoreData();
                return;
            }
            loadNextPage(currentPage, sl, totalPages, basePath(), dir);
        }
    });
}

function loadNextPage(page, scrollloadInstance, totalPages, base, dir) {
    if (page > totalPages) {
        scrollloadInstance.noMoreData();
        return;
    }

    const nextPageUrl = base + dir + '/' + page + '/';

    $.ajax({
        url: nextPageUrl,
        type: 'GET',
        dataType: 'html',
        success: function (response) {
            try {
                const $response = $(response);
                const $newPosts = $response.find('.scrollload-content .post-item');

                if ($newPosts.length === 0) {
                    scrollloadInstance.noMoreData();
                    return;
                }

                const $content = $('.scrollload-content');

                $newPosts.each(function () {
                    const $newItem = $(this).appendTo($content);

                    if (window.Alpine) {
                        window.Alpine.initTree($newItem[0]);
                    }

                    const $likeContainer = $newItem.find('.pcc-like-list');
                    if ($likeContainer.length) {
                        const cid = $likeContainer.data('cid');
                        if (cid) {
                            loadLikeData(cid, $likeContainer);
                        }
                    }

                    const $musicPlayers = $newItem.find('[data-music-player]');
                    if ($musicPlayers.length && window.IcefoxMusicManager) {
                        $musicPlayers.each(function () {
                            if (!this.dataset.musicPlayerInitialized) {
                                const player = new MusicPlayer(this);
                                window.IcefoxMusicManager.register(player);
                                this.dataset.musicPlayerInitialized = 'true';
                            }
                        });
                    }
                });

                initFancybox();

                const $newPagination = $response.find('.total-pages');
                if ($newPagination.length) {
                    const newTotalPages = parseInt($newPagination.data('total'));
                    if (page >= newTotalPages) {
                        scrollloadInstance.noMoreData();
                        return;
                    }
                }

                scrollloadInstance.unLock();
            } catch (error) {
                scrollloadInstance.throwException();
            }
        },
        error: function (xhr) {
            if (xhr.status === 404) {
                scrollloadInstance.noMoreData();
            } else {
                scrollloadInstance.throwException();
            }
        }
    });
}

/* ============================================================
 * 点赞
 * ============================================================ */
const ICEFOX_LIKES_KEY = 'icefox_likes';
const ICEFOX_ANON_KEY = 'icefox_anonymous_id';

function getAnonymousId() {
    let anonymousId = localStorage.getItem(ICEFOX_ANON_KEY);
    if (!anonymousId) {
        anonymousId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(ICEFOX_ANON_KEY, anonymousId);
    }
    return anonymousId;
}

function localLikesStore() {
    try {
        return JSON.parse(localStorage.getItem(ICEFOX_LIKES_KEY) || '{}') || {};
    } catch (e) {
        return {};
    }
}

function saveLocalLikesStore(store) {
    try {
        localStorage.setItem(ICEFOX_LIKES_KEY, JSON.stringify(store));
    } catch (e) {
        /* ignore */
    }
}

function currentLikerName() {
    return localStorage.getItem('icefox_comment_author') || '我';
}

function initLikes() {
    if (window.ICEFOX_CONFIG && window.ICEFOX_CONFIG.likeEnable === false) return;

    getAnonymousId();
    $('.pcc-like-list').hide();

    $('.post-comment-container').each(function () {
        const $commentContainer = $(this);
        const $commentList = $commentContainer.find('.pcc-comment-list');
        const hasComments = $commentList.find('.pcc-comment-item').length > 0;
        if (!hasComments) {
            $commentContainer.hide();
        }
    });

    $('.pcc-like-list').each(function () {
        const $likeContainer = $(this);
        const cid = $likeContainer.data('cid');
        if (cid) {
            loadLikeData(cid, $likeContainer);
        }
    });

    $(document).on('click', '.pcc-like-list', function (e) {
        e.stopPropagation();
        const cid = $(this).data('cid');
        if (cid) {
            doToggleLike(cid, $(this));
        }
    });
}

function usesLocalLikes() {
    return !(window.ICEFOX_CONFIG && window.ICEFOX_CONFIG.likeApi);
}

function loadLikeData(cid, $container) {
    if (usesLocalLikes()) {
        const store = localLikesStore();
        const entry = store[cid] || { count: 0, likers: [], liked: false };
        updateLikeUI($container, entry.count || 0, !!entry.liked, (entry.likers || []).map(function (name) {
            return { author: name };
        }));
        return;
    }

    const anonymousId = getAnonymousId();
    const commentAuthor = localStorage.getItem('icefox_comment_author') || '';
    const commentEmail = localStorage.getItem('icefox_comment_email') || '';

    let url = window.ICEFOX_CONFIG.likeApi + '?do=getLikes&cid=' + cid + '&anonymous_id=' + encodeURIComponent(anonymousId);
    if (commentAuthor && commentEmail) {
        url += '&comment_author=' + encodeURIComponent(commentAuthor) + '&comment_email=' + encodeURIComponent(commentEmail);
    }

    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            if (response.success) {
                updateLikeUI($container, response.likes, response.isLiked, response.likeUsers || []);
            }
        }
    });
}

function doToggleLike(cid, $container) {
    if ($container.hasClass('liking')) return;
    $container.addClass('liking');

    if (usesLocalLikes()) {
        const store = localLikesStore();
        const entry = store[cid] || { count: 0, likers: [], liked: false };
        const name = currentLikerName();

        if (entry.liked) {
            entry.count = Math.max(0, (entry.count || 0) - 1);
            entry.likers = (entry.likers || []).filter(function (n) { return n !== name; });
            entry.liked = false;
        } else {
            entry.count = (entry.count || 0) + 1;
            entry.likers = (entry.likers || []).concat([name]);
            entry.liked = true;
        }

        store[cid] = entry;
        saveLocalLikesStore(store);

        updateLikeUI($container, entry.count, entry.liked, entry.likers.map(function (n) {
            return { author: n };
        }));

        $container.removeClass('liking');
        return;
    }

    const anonymousId = getAnonymousId();
    const commentAuthor = localStorage.getItem('icefox_comment_author') || '';
    const commentEmail = localStorage.getItem('icefox_comment_email') || '';

    let url = window.ICEFOX_CONFIG.likeApi + '?do=like&cid=' + cid + '&anonymous_id=' + encodeURIComponent(anonymousId);
    if (commentAuthor && commentEmail) {
        url += '&comment_author=' + encodeURIComponent(commentAuthor) + '&comment_email=' + encodeURIComponent(commentEmail);
    }

    $.ajax({
        url: url,
        type: 'POST',
        dataType: 'json',
        success: function (response) {
            if (response.success) {
                updateLikeUI($container, response.likes, response.isLiked, response.likeUsers || []);
            }
        },
        complete: function () {
            $container.removeClass('liking');
        }
    });
}

function updateLikeUI($container, likes, isLiked, likeUsers) {
    const cid = $container.data('cid');
    const $commentContainer = $container.closest('.post-comment-container');

    likes = parseInt(likes) || 0;

    if (likes === 0) {
        $container.hide();

        const $commentList = $commentContainer.find('.pcc-comment-list');
        const hasComments = $commentList.find('.pcc-comment-item').length > 0;
        if (!hasComments) {
            $commentContainer.hide();
        }

        const $menuBtn = $('.like-menu-btn[data-cid="' + cid + '"]');
        $menuBtn.find('.like-menu-text').text('点赞');
        $menuBtn.find('.like-menu-icon').attr('fill', 'none').css('color', '');
        return;
    }

    $container.show();
    $commentContainer.show();

    const $icon = $container.find('.like-icon');
    if (isLiked) {
        $icon.attr('fill', 'currentColor').css('color', '#ff6b6b');
    } else {
        $icon.attr('fill', 'none').css('color', '');
    }

    $container.find('.like-users-text').text(generateLikesText(likes, likeUsers));

    const $menuBtn = $('.like-menu-btn[data-cid="' + cid + '"]');
    if (isLiked) {
        $menuBtn.find('.like-menu-text').text('取消点赞');
        $menuBtn.find('.like-menu-icon').attr('fill', 'currentColor').css('color', '#ff6b6b');
    } else {
        $menuBtn.find('.like-menu-text').text('点赞');
        $menuBtn.find('.like-menu-icon').attr('fill', 'none').css('color', '');
    }
}

function generateLikesText(likes, likeUsers) {
    if (likes === 0) return '0 个点赞';
    if (!likeUsers || likeUsers.length === 0) return likes + ' 个点赞';

    const displayCount = Math.min(3, likeUsers.length);
    const names = likeUsers.slice(0, displayCount).map(function (user) { return user.author; }).join('、');
    return names + '、' + likes + '个点赞';
}

/* Alpine.js 菜单点击点赞 */
window.toggleLike = function (event, cid) {
    event.stopPropagation();
    const $container = $('.pcc-like-list[data-cid="' + cid + '"]');
    if ($container.length) {
        doToggleLike(cid, $container);
    }
};

/* ============================================================
 * 版权信息
 * ============================================================ */
function printCopyright() {
    console.log('%cIcefox主题 By xiaopanglian v3.0.3 %chttps://www.xiaopanglian.com', 'color: white;  background-color: #99cc99; padding: 10px;', 'color: white; background-color: #ff6666; padding: 10px;');
}
