document.addEventListener('DOMContentLoaded', async () => {
    let ffmpeg = null;
    let fetchFile = null;

    async function loadFFmpeg() {
        try {
            if (!window.FFmpeg || !FFmpeg.createFFmpeg) {
                throw new Error('FFmpeg 库未正确加载，请检查网络连接或脚本引入');
            }
            
            const { createFFmpeg, fetchFile: ffmpegFetchFile } = FFmpeg;
            ffmpeg = createFFmpeg({ log: true });
            
            if (ffmpegFetchFile) {
                fetchFile = ffmpegFetchFile;
            } else {
                fetchFile = function(file) {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(new Uint8Array(reader.result));
                        reader.readAsArrayBuffer(file);
                    });
                };
            }

            ffmpeg.on('log', ({ message }) => {
                console.log('[FFmpeg]', message);
            });

            ffmpeg.on('progress', ({ progress }) => {
                const percent = Math.round(progress * 100);
                progressBar.style.width = `${percent}%`;
                progressPercentage.textContent = `${percent}%`;
            });

            convertNote.textContent = '正在加载FFmpeg...';
            await ffmpeg.load();

            return true;
        } catch (error) {
            console.error('FFmpeg 加载失败:', error);
            showModal('错误', 'FFmpeg加载失败，请刷新页面重试');
            return false;
        }
    }

    const videoUpload = document.getElementById('videoUpload');
    const videoPlayer = document.getElementById('videoPlayer');
    const previewSection = document.getElementById('previewSection');
    const videoInfo = document.getElementById('videoInfo');
    const settingsSection = document.getElementById('settingsSection');
    const convertBtn = document.getElementById('convertBtn');
    const convertBtnText = document.getElementById('convertBtnText');
    const convertBtnLoading = document.getElementById('convertBtnLoading');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const convertNote = document.getElementById('convertNote');
    const outputSection = document.getElementById('outputSection');
    const outputGif = document.getElementById('outputGif');
    const downloadBtn = document.getElementById('downloadBtn');
    const resultInfo = document.getElementById('resultInfo');

    let videoFile = null;
    let videoDuration = 0;

    videoUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        videoFile = file;
        previewSection.style.display = 'block';
        
        const videoUrl = URL.createObjectURL(file);
        videoPlayer.src = videoUrl;
        
        videoPlayer.onloadedmetadata = () => {
            videoDuration = videoPlayer.duration;
            videoInfo.innerHTML = `
                <p><strong>文件名：</strong>${file.name}</p>
                <p><strong>文件大小：</strong>${formatFileSize(file.size)}</p>
                <p><strong>视频时长：</strong>${formatDuration(videoDuration)}</p>
                <p><strong>分辨率：</strong>${videoPlayer.videoWidth} × ${videoPlayer.videoHeight}</p>
            `;
            document.getElementById('duration').max = Math.min(videoDuration, 60);
            
            if (videoDuration < 5) {
                document.getElementById('duration').value = videoDuration.toFixed(1);
            }
            
            settingsSection.style.display = 'block';
            convertBtn.disabled = false;
        };
    });

    convertBtn.addEventListener('click', async () => {
        if (!videoFile) return;

        const startTime = parseFloat(document.getElementById('startTime').value);
        const duration = parseFloat(document.getElementById('duration').value);
        const frameRate = parseInt(document.getElementById('frameRate').value);
        const quality = document.getElementById('quality').value;
        const scale = parseInt(document.getElementById('scale').value) / 100;
        const loopCount = parseInt(document.getElementById('loopCount').value);

        if (startTime + duration > videoDuration) {
            showModal('错误', '结束时间不能超过视频时长');
            return;
        }

        convertBtn.disabled = true;
        convertBtnText.style.display = 'none';
        convertBtnLoading.style.display = 'inline';
        progressContainer.style.display = 'block';
        convertNote.style.display = 'block';
        outputSection.style.display = 'none';

        try {
            if (!ffmpeg || !ffmpeg.loaded) {
                const loaded = await loadFFmpeg();
                if (!loaded) {
                    convertBtn.disabled = false;
                    convertBtnText.style.display = 'inline';
                    convertBtnLoading.style.display = 'none';
                    return;
                }
            }

            convertNote.textContent = '正在处理视频...';

            const inputFileName = `input_${Date.now()}.mp4`;
            const outputFileName = `output_${Date.now()}.gif`;

            await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

            let qualityParam = '';
            switch (quality) {
                case 'high':
                    qualityParam = 'scale=iw*' + scale + ':ih*' + scale + ',palettegen=max_colors=256';
                    break;
                case 'medium':
                    qualityParam = 'scale=iw*' + scale + ':ih*' + scale + ',palettegen=max_colors=128';
                    break;
                case 'low':
                    qualityParam = 'scale=iw*' + scale + ':ih*' + scale + ',palettegen=max_colors=64';
                    break;
            }

            await ffmpeg.run(
                '-ss', startTime.toString(),
                '-t', duration.toString(),
                '-i', inputFileName,
                '-filter_complex', `[0:v]${qualityParam}[palette];[0:v][palette]paletteuse=dither=sierra2_4a`,
                '-r', frameRate.toString(),
                '-loop', loopCount.toString(),
                outputFileName
            );

            const data = await ffmpeg.readFile(outputFileName);
            const gifBlob = new Blob([data.buffer], { type: 'image/gif' });
            const gifUrl = URL.createObjectURL(gifBlob);

            outputGif.src = gifUrl;
            resultInfo.innerHTML = `
                <p><strong>生成时间：</strong>${new Date().toLocaleString()}</p>
                <p><strong>GIF时长：</strong>${duration.toFixed(1)}秒</p>
                <p><strong>帧率：</strong>${frameRate} fps</p>
                <p><strong>文件大小：</strong>${formatFileSize(gifBlob.size)}</p>
            `;

            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.href = gifUrl;
                link.download = `video_to_gif_${Date.now()}.gif`;
                link.click();
            };

            outputSection.style.display = 'block';
            convertNote.textContent = 'GIF生成完成！';
            
        } catch (error) {
            console.error('转换失败:', error);
            showModal('错误', 'GIF生成失败：' + error.message);
        } finally {
            convertBtn.disabled = false;
            convertBtnText.style.display = 'inline';
            convertBtnLoading.style.display = 'none';
            progressBar.style.width = '0%';
            progressPercentage.textContent = '0%';
        }
    });

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function showModal(title, message) {
        document.querySelector('.modal-title').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        document.getElementById('defaultModal').classList.add('active');
    }
});