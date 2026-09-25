/**
 * Icefox 主题 —— 站内搜索
 * 索引文件：站点根目录 /search.json（由 scripts/generators.js 生成）
 */
(function () {
    const input = document.getElementById('icefoxSearchInput');
    const btn = document.getElementById('icefoxSearchBtn');
    const resultsEl = document.getElementById('icefoxSearchResults');
    const statusEl = document.getElementById('icefoxSearchStatus');

    if (!input || !resultsEl) return;

    const root = (window.ICEFOX_CONFIG && window.ICEFOX_CONFIG.root) || '/';
    const INDEX_URL = root + 'search.json';

    let index = null;
    let loading = null;

    function loadIndex() {
        if (index) return Promise.resolve(index);
        if (loading) return loading;

        loading = fetch(INDEX_URL)
            .then(function (res) { return res.json(); })
            .then(function (data) {
                index = Array.isArray(data) ? data : [];
                return index;
            })
            .catch(function () {
                index = [];
                return index;
            });

        return loading;
    }

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function highlight(text, keyword) {
        if (!keyword) return escapeHtml(text);
        const safe = escapeHtml(text);
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return safe.replace(new RegExp(escapedKeyword, 'gi'), function (m) {
            return '<em>' + m + '</em>';
        });
    }

    function snippet(content, keyword, length) {
        length = length || 160;
        if (!content) return '';
        const lower = content.toLowerCase();
        const pos = keyword ? lower.indexOf(keyword.toLowerCase()) : -1;
        let start = 0;
        if (pos > 40) start = pos - 40;
        const text = content.slice(start, start + length);
        return (start > 0 ? '...' : '') + text + (start + length < content.length ? '...' : '');
    }

    function setStatus(html) {
        if (!html) {
            statusEl.style.display = 'none';
            statusEl.innerHTML = '';
            return;
        }
        statusEl.style.display = 'block';
        statusEl.innerHTML = html;
    }

    function render(list, keyword) {
        if (!list.length) {
            resultsEl.innerHTML = '';
            setStatus('没有找到相关内容，换个关键词试试吧');
            return;
        }

        setStatus('');
        resultsEl.innerHTML = list.map(function (item) {
            const meta = [item.date].concat(item.categories || []).filter(Boolean).join(' · ');
            return `
                <div class="search-result-item">
                    <a class="search-result-title" href="${escapeHtml(item.url)}">${highlight(item.title, keyword)}</a>
                    ${meta ? `<div class="search-result-meta">${escapeHtml(meta)}</div>` : ''}
                    <div class="search-result-desc">${highlight(snippet(item.content, keyword), keyword)}</div>
                </div>
            `;
        }).join('');
    }

    function search(keyword) {
        keyword = (keyword || '').trim();
        if (!keyword) {
            resultsEl.innerHTML = '';
            setStatus('请输入关键字开始搜索');
            return;
        }

        setStatus('搜索中...');

        loadIndex().then(function (data) {
            const lowerKeyword = keyword.toLowerCase();
            const matched = data.filter(function (item) {
                const haystack = [
                    item.title,
                    item.content,
                    (item.tags || []).join(' '),
                    (item.categories || []).join(' ')
                ].join(' ').toLowerCase();
                return haystack.indexOf(lowerKeyword) !== -1;
            }).slice(0, 50);

            render(matched, keyword);
        });
    }

    function submit() {
        const keyword = input.value.trim();
        const url = new URL(window.location.href);
        if (keyword) {
            url.searchParams.set('q', keyword);
        } else {
            url.searchParams.delete('q');
        }
        window.history.replaceState(null, '', url.toString());
        search(keyword);
    }

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            submit();
        }
    });

    // 支持直接通过 /search/?q=关键字 访问
    const initialKeyword = new URLSearchParams(window.location.search).get('q') ||
        new URLSearchParams(window.location.search).get('s') || '';
    if (initialKeyword) {
        input.value = initialKeyword;
        search(initialKeyword);
    } else {
        setStatus('请输入关键字开始搜索');
    }
})();
