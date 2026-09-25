/**
 * Icefox 主题 —— 评论回复管理器（Alpine.js）
 *
 * 说明：Hexo 为静态站点，评论需要后端支持。
 *       在 _config.yml 中配置 comment.enable / comment.type / comment.api 后生效。
 *       未启用评论时，本组件仅提供「点赞菜单」相关交互。
 */

// Emoji 数据
const EMOJI_DATA = {
    '表情': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳'],
    '手势': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
    '动物': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗'],
    '食物': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨'],
    '活动': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸', '🥌'],
    '符号': ['❤', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮', '✝', '☪', '🕉', '☸', '✡', '🔯', '🕎', '☯', '☦', '🛐', '⛎', '♈']
};

function commentReplyManager() {
    return {
        activeCommentId: null,
        replyForm: null,

        init() {
            document.addEventListener('click', this.handleClickOutside.bind(this));
        },

        /* ---------------- 下拉菜单 ---------------- */

        togglePostTimeComment(event, postId) {
            event.preventDefault();
            event.stopPropagation();

            const currentModal = document.getElementById(`ptcm-${postId}`);
            if (!currentModal) return;

            const currentAlpineComponent = Alpine.$data(currentModal);
            if (!currentAlpineComponent) return;

            if (currentAlpineComponent.ptcmShow) {
                currentAlpineComponent.ptcmShow = false;
                return;
            }

            this.hideAllPostTimeCommentModals();
            currentAlpineComponent.ptcmShow = true;
        },

        hideAllPostTimeCommentModals() {
            const allModals = document.querySelectorAll('.post-time-comment');
            allModals.forEach(modal => {
                const alpineComponent = Alpine.$data(modal);
                if (alpineComponent && alpineComponent.ptcmShow !== undefined) {
                    alpineComponent.ptcmShow = false;
                }
            });
        },

        hidePostTimeCommentModal(postId) {
            const modal = document.getElementById(`ptcm-${postId}`);
            if (modal) {
                const alpineComponent = Alpine.$data(modal);
                if (alpineComponent && alpineComponent.ptcmShow !== undefined) {
                    alpineComponent.ptcmShow = false;
                }
            }
        },

        /* ---------------- 回复表单 ---------------- */

        showReplyForm(event, postId, coid, authorName) {
            event.preventDefault();

            if (!window.ICEFOX_CONFIG.commentEnable) {
                return this.commentDisabledTip();
            }

            const clickedElement = event.target;
            const commentItem = clickedElement.closest('.pcc-comment-item');
            if (!commentItem) return;

            if (!coid || coid === '0') {
                const domCoid = commentItem.dataset.commentId;
                if (domCoid && domCoid !== '0') coid = domCoid;
            }

            const formId = `reply-form-${postId}-${Date.now()}`;

            if (this.activeCommentId === commentItem) {
                this.removeReplyForm();
                this.activeCommentId = null;
                return;
            }

            this.removeReplyForm();

            const replyForm = this.createReplyForm(formId, postId, authorName, coid);
            commentItem.parentNode.insertBefore(replyForm, commentItem.nextSibling);

            this.activeCommentId = commentItem;
            this.hidePostTimeCommentModal(postId);

            setTimeout(() => {
                const input = replyForm.querySelector('input[type="text"]');
                if (input) input.focus();
            }, 100);
        },

        showPostReplyForm(event, postId) {
            event.preventDefault();
            event.stopPropagation();

            if (!window.ICEFOX_CONFIG.commentEnable) {
                this.hidePostTimeCommentModal(postId);
                return this.commentDisabledTip();
            }

            this.removeReplyForm();

            const formId = `post-reply-form-${postId}-${Date.now()}`;
            const postItem = event.target.closest('.post-item') || event.target.closest('.post-detail');
            if (!postItem) return;

            const commentContainer = postItem.querySelector('.post-comment-container');
            if (!commentContainer) return;

            const replyForm = this.createPostReplyForm(formId, postId);
            commentContainer.style.display = '';
            commentContainer.appendChild(replyForm);

            this.activeCommentId = `post-${postId}`;
            this.hidePostTimeCommentModal(postId);

            setTimeout(() => {
                const input = replyForm.querySelector('input[type="text"]');
                if (input) input.focus();
            }, 100);
        },

        commentDisabledTip() {
            const el = document.getElementById('icefox-comment-tip');
            if (el) {
                el.style.display = 'block';
                setTimeout(() => { el.style.display = 'none'; }, 3000);
            } else {
                alert('本站暂未开放评论功能');
            }
        },

        /* ---------------- 表单构建 ---------------- */

        buildFormHtml(options) {
            const { mode, authorName, modelName } = options;
            const savedAuthor = localStorage.getItem('icefox_comment_author') || '';
            const savedEmail = localStorage.getItem('icefox_comment_email') || '';
            const savedUrl = localStorage.getItem('icefox_comment_url') || '';

            const tabsHtml = Object.keys(EMOJI_DATA).map(tab => `
                <button type="button" class="emoji-tab"
                        :class="{'active': currentEmojiTab === '${tab}'}"
                        @click="currentEmojiTab = '${tab}'">${tab}</button>
            `).join('');

            const emojiHtml = Object.entries(EMOJI_DATA).map(([category, emojis]) =>
                emojis.map(emoji => `
                    <span class="emoji-item"
                          x-show="currentEmojiTab === '${category}'"
                          @click="${modelName} += '${emoji}'; emojiPickerShow = false">${emoji}</span>
                `).join('')
            ).join('');

            const title = mode === 'reply' ? `回复 ${authorName}` : '发表评论';
            const placeholder = mode === 'reply' ? '写下你的回复...' : '写下你的评论...';
            const submitText = mode === 'reply' ? '发表回复' : '发表评论';

            return `
                <div class="reply-form" x-data="{${modelName}: '', emojiPickerShow: false, currentEmojiTab: '表情'}">
                    <div class="reply-form-header">
                        <strong>${title}</strong>
                        <button type="button" class="reply-form-close">×</button>
                    </div>
                    <form>
                        <div class="reply-form-user-info">
                            <div class="reply-form-input">
                                <input type="text" name="author_name" placeholder="昵称" required
                                       value="${this.escapeHtml(savedAuthor)}">
                            </div>
                            <div class="reply-form-input">
                                <input type="email" name="author_email" placeholder="邮箱" required
                                       value="${this.escapeHtml(savedEmail)}">
                            </div>
                            <div class="reply-form-input">
                                <input type="url" name="author_url" placeholder="网址"
                                       value="${this.escapeHtml(savedUrl)}">
                            </div>
                        </div>
                        <div class="reply-form-input">
                            <input type="text" name="reply_content" placeholder="${placeholder}" required
                                   x-model="${modelName}">
                        </div>
                        <div class="reply-form-bottom">
                            <div class="reply-form-emoji-container">
                                <button type="button" class="reply-form-emoji-toggle"
                                        @click.stop="emojiPickerShow = !emojiPickerShow">
                                    😀 <span>表情</span>
                                </button>
                                <div class="reply-form-emoji-picker"
                                     :class="{'show': emojiPickerShow}" @click.stop>
                                    <div class="emoji-picker-header">
                                        <span class="emoji-picker-title">选择表情</span>
                                        <button type="button" class="emoji-picker-close"
                                                @click="emojiPickerShow = false">×</button>
                                    </div>
                                    <div class="emoji-picker-tabs">${tabsHtml}</div>
                                    <div class="emoji-picker-content">${emojiHtml}</div>
                                </div>
                            </div>
                            <div class="reply-form-actions">
                                <button type="submit" class="reply-submit-btn">${submitText}</button>
                                <button type="button" class="reply-cancel-btn">取消</button>
                            </div>
                        </div>
                    </form>
                </div>
            `;
        },

        bindFormEvents(form, postId, coid, authorName) {
            const closeBtn = form.querySelector('.reply-form-close');
            const cancelBtn = form.querySelector('.reply-cancel-btn');
            const submitForm = form.querySelector('form');

            closeBtn.addEventListener('click', () => this.removeReplyForm());
            cancelBtn.addEventListener('click', () => this.removeReplyForm());
            submitForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.postComment(e, postId, coid);
            });
        },

        createReplyForm(formId, postId, authorName, coid) {
            const form = document.createElement('div');
            form.className = 'reply-form-container';
            form.id = formId;
            form.dataset.coid = coid;
            form.innerHTML = this.buildFormHtml({ mode: 'reply', authorName, modelName: 'replyContent' });
            this.bindFormEvents(form, postId, coid, authorName);
            return form;
        },

        createPostReplyForm(formId, postId) {
            const form = document.createElement('div');
            form.className = 'reply-form-container post-reply-form';
            form.id = formId;
            form.dataset.coid = 0;
            form.innerHTML = this.buildFormHtml({ mode: 'comment', authorName: '', modelName: 'postReplyContent' });
            this.bindFormEvents(form, postId, 0, '');
            return form;
        },

        removeReplyForm() {
            document.querySelectorAll('.reply-form-container').forEach(form => {
                const commentContainer = form.closest('.post-comment-container');
                form.remove();

                if (commentContainer) {
                    const likeList = commentContainer.querySelector('.pcc-like-list');
                    const commentList = commentContainer.querySelector('.pcc-comment-list');
                    const hasLikes = likeList && likeList.style.display !== 'none';
                    const hasComments = commentList && commentList.querySelectorAll('.pcc-comment-item').length > 0;
                    if (!hasLikes && !hasComments) {
                        commentContainer.style.display = 'none';
                    }
                }
            });
            this.activeCommentId = null;
        },

        /* ---------------- 提交评论 ---------------- */

        async postComment(event, postId, coid) {
            const form = event.target;
            const authorName = form.querySelector('input[name="author_name"]').value.trim();
            const authorEmail = form.querySelector('input[name="author_email"]').value.trim();
            const authorUrl = form.querySelector('input[name="author_url"]').value.trim();
            const content = form.querySelector('input[name="reply_content"]').value.trim();

            if (!authorName || !authorEmail || !content) {
                alert('请填写必要信息');
                return;
            }

            localStorage.setItem('icefox_comment_author', authorName);
            localStorage.setItem('icefox_comment_email', authorEmail);
            localStorage.setItem('icefox_comment_url', authorUrl);

            const actionUrl = window.ICEFOX_CONFIG.actionUrl;
            if (!actionUrl) {
                alert('未配置评论接口，无法提交评论');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '提交中...';

            try {
                const response = await fetch(`${actionUrl}${actionUrl.indexOf('?') === -1 ? '?' : '&'}do=addComment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        author: authorName,
                        mail: authorEmail,
                        url: authorUrl || '',
                        text: content,
                        cid: postId,
                        coid: coid
                    })
                });

                const result = await response.json();
                if (result.success) {
                    if (result.comment) {
                        this.addCommentToList(postId, result.comment);
                    }
                    this.removeReplyForm();
                } else {
                    alert(result.message || '评论发表失败，请稍后重试');
                }
            } catch (error) {
                console.error('评论提交错误:', error);
                alert('网络错误，请稍后重试');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        },

        addCommentToList(postId, commentData) {
            const allPostItems = document.querySelectorAll('.post-item');
            let targetCommentList = null;

            for (const item of allPostItems) {
                const likeList = item.querySelector('.pcc-like-list');
                if (likeList && likeList.dataset.cid == postId) {
                    targetCommentList = item.querySelector('.pcc-comment-list');
                    break;
                }
            }
            if (!targetCommentList) return;

            const commentItem = document.createElement('div');
            commentItem.className = 'pcc-comment-item';
            commentItem.dataset.commentId = commentData.coid;

            const isAdmin = commentData.userGroup === 'administrator';
            const authorBadge = isAdmin ? '<span class="author-badge">作者</span>' : '';

            const authorLink = `<a href="${commentData.url || '#'}">${this.escapeHtml(commentData.author)}</a>`;
            const contentSpan = `<span class="cursor-help pcc-comment-content"
                       @click="showReplyForm($event, '${postId}', '${commentData.coid}', '${this.escapeHtml(commentData.author)}')">${this.escapeHtml(commentData.text)}</span>`;

            if (!commentData.parent || commentData.parent == 0) {
                commentItem.innerHTML = `
                    ${authorLink}
                    ${authorBadge}
                    <span>:</span>
                    ${contentSpan}
                `;
            } else {
                const parentComment = targetCommentList.querySelector(`[data-comment-id="${commentData.parent}"]`);
                let parentAuthor = '原评论';
                let parentUrl = '#';
                let parentAuthorBadge = '';

                if (parentComment) {
                    const parentLink = parentComment.querySelector('a');
                    if (parentLink) {
                        parentAuthor = parentLink.textContent;
                        parentUrl = parentLink.href;
                    }
                    if (parentComment.querySelector('.author-badge')) {
                        parentAuthorBadge = '<span class="author-badge">作者</span>';
                    }
                }

                commentItem.innerHTML = `
                    ${authorLink}
                    ${authorBadge}
                    <span>回复</span>
                    <a href="${parentUrl}">${this.escapeHtml(parentAuthor)}</a>
                    ${parentAuthorBadge}
                    <span>:</span>
                    ${contentSpan}
                `;
            }

            if (!commentData.parent || commentData.parent == 0) {
                if (targetCommentList.firstChild) {
                    targetCommentList.insertBefore(commentItem, targetCommentList.firstChild);
                } else {
                    targetCommentList.appendChild(commentItem);
                }
            } else {
                const parentComment = targetCommentList.querySelector(`[data-comment-id="${commentData.parent}"]`);
                if (parentComment && parentComment.nextSibling) {
                    targetCommentList.insertBefore(commentItem, parentComment.nextSibling);
                } else {
                    targetCommentList.appendChild(commentItem);
                }
            }

            if (window.Alpine) {
                Alpine.initTree(commentItem);
            }
        },

        /* ---------------- 工具 ---------------- */

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text == null ? '' : text;
            return div.innerHTML;
        },

        handleClickOutside(event) {
            if (this.activeCommentId && !event.target.closest('.reply-form-container') && !event.target.closest('.pcc-comment-content')) {
                this.removeReplyForm();
            }

            if (!event.target.closest('.ptc-more') && !event.target.closest('.post-time-comment-modal')) {
                this.hideAllPostTimeCommentModals();
            }
        }
    };
}

window.commentReplyManager = commentReplyManager;
