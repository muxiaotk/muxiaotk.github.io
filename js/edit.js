/**
 * Icefox 主题 —— 文章发布页（需要后端接口）
 * 由 Typecho 版 edit-page.php 移植，适配 _config.yml 中的 edit.api
 */
function editPageManager() {
    return {
        postContent: '',
        mediaFiles: [],
        position: '',
        positionUrl: '',
        visibility: 'public',
        isAdvertise: false,
        showLocationPicker: false,
        showVisibilityPicker: false,
        submitStatus: '',

        get visibilityText() {
            const texts = { 'public': '公开', 'private': '私密' };
            return texts[this.visibility] || '公开';
        },

        autoResize(event) {
            const textarea = event.target;
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        },

        handleMediaSelect(event) {
            const files = Array.from(event.target.files);

            const hasVideo = files.some(f => f.type.startsWith('video/'));
            const hasImage = files.some(f => f.type.startsWith('image/'));
            const currentHasVideo = this.mediaFiles.some(f => f.type.startsWith('video/'));
            const currentHasImage = this.mediaFiles.some(f => f.type.startsWith('image/'));

            if (currentHasVideo) {
                alert('已上传视频,不能再添加其他文件');
                event.target.value = '';
                return;
            }

            if (currentHasImage && hasVideo) {
                alert('已上传图片,不能再上传视频');
                event.target.value = '';
                return;
            }

            if (hasVideo) {
                const videoFiles = files.filter(f => f.type.startsWith('video/'));
                if (videoFiles.length > 1) {
                    alert('只能上传1个视频');
                    event.target.value = '';
                    return;
                }
                if (hasImage) {
                    alert('上传视频时不能同时上传图片');
                    event.target.value = '';
                    return;
                }
                const videoFile = videoFiles[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.mediaFiles.push({ file: videoFile, type: videoFile.type, preview: e.target.result });
                };
                reader.readAsDataURL(videoFile);
                event.target.value = '';
                return;
            }

            const remainingSlots = 9 - this.mediaFiles.length;
            if (remainingSlots <= 0) {
                alert('最多只能上传9张图片');
                event.target.value = '';
                return;
            }

            const filesToAdd = files.slice(0, remainingSlots);
            if (files.length > remainingSlots) {
                alert(`最多只能上传9张图片，已自动选择前${remainingSlots}张`);
            }

            filesToAdd.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.mediaFiles.push({ file: file, type: file.type, preview: e.target.result });
                };
                reader.readAsDataURL(file);
            });

            event.target.value = '';
        },

        removeMedia(index) {
            this.mediaFiles.splice(index, 1);
        },

        async submitPost() {
            if (!this.postContent.trim() && this.mediaFiles.length === 0) {
                alert('请输入内容或选择图片/视频');
                return;
            }

            const api = window.ICEFOX_CONFIG && window.ICEFOX_CONFIG.editApi;
            if (!api) {
                alert('未配置发布接口，无法提交');
                return;
            }

            this.submitStatus = '发布中...';

            try {
                const formData = new FormData();
                formData.append('content', this.postContent);
                formData.append('position', this.position);
                formData.append('positionUrl', this.positionUrl);
                formData.append('visibility', this.visibility);
                formData.append('isAdvertise', this.isAdvertise ? '1' : '0');

                this.mediaFiles.forEach((media, index) => {
                    formData.append(`media_${index}`, media.file);
                });

                const response = await fetch(`${api}?do=createPost`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    this.submitStatus = '发布成功！';
                    setTimeout(() => {
                        window.location.href = result.redirect || '/';
                    }, 1000);
                } else {
                    this.submitStatus = '';
                    alert(result.message || '发布失败，请稍后重试');
                }
            } catch (error) {
                this.submitStatus = '';
                alert('网络错误，请稍后重试');
            }
        }
    };
}

window.editPageManager = editPageManager;

document.addEventListener('DOMContentLoaded', function () {
    const publishBtn = document.getElementById('publishBtn');
    const editForm = document.getElementById('editForm');

    if (publishBtn && editForm) {
        publishBtn.addEventListener('click', function () {
            editForm.dispatchEvent(new Event('submit', { cancelable: true }));
        });
    }
});
