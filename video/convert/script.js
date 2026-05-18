(function () {
    const videoUpload = document.getElementById('videoUpload');
    const videoPlayer = document.getElementById('videoPlayer');
    const previewCanvas = document.getElementById('previewCanvas');
    const videoInfo = document.getElementById('videoInfo');
    const settingsSection = document.getElementById('settingsSection');
    const outputSection = document.getElementById('outputSection');
    const outputVideo = document.getElementById('outputVideo');
    const convertBtn = document.getElementById('convertBtn');
    const convertBtnText = document.getElementById('convertBtnText');
    const convertBtnLoading = document.getElementById('convertBtnLoading');
    const downloadBtn = document.getElementById('downloadBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const convertNote = document.getElementById('convertNote');
    const formatInfoText = document.getElementById('formatInfoText');
    const resultInfo = document.getElementById('resultInfo');
    const outputFormat = document.getElementById('outputFormat');
    const videoQuality = document.getElementById('videoQuality');
    const videoBitrate = document.getElementById('videoBitrate');
    const audioBitrate = document.getElementById('audioBitrate');
    const resolutionScale = document.getElementById('resolutionScale');
    const customWidth = document.getElementById('customWidth');
    const frameRate = document.getElementById('frameRate');
    const keepAudio = document.getElementById('keepAudio');
    const customBitrateRow = document.getElementById('customBitrateRow');
    const customResRow = document.getElementById('customResRow');
    const modal = document.getElementById('defaultModal');
    const modalMessage = document.getElementById('modalMessage');

    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    let sourceFile = null;
    let outputBlob = null;
    let cancelConversion = false;

    // FFmpeg.wasm lazy init
    let ffmpegInstance = null;
    let ffmpegLoading = false;
    let ffmpegLoadError = null;

    // Formats that require FFmpeg (not supported by browser MediaRecorder)
    const FFMPEG_FORMATS = ['wmv', 'mov', 'avi', 'mkv'];

    function needsFFmpeg(fmt) {
        return FFMPEG_FORMATS.indexOf(fmt) !== -1;
    }

    function showModal(msg) {
        modalMessage.textContent = msg;
        modal.classList.add('active');
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    function formatDuration(seconds) {
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function getExtension(filename) {
        return (filename.split('.').pop() || '').toLowerCase();
    }

    function getQualityBitrate() {
        switch (videoQuality.value) {
            case 'high': return 5000;
            case 'medium': return 2500;
            case 'low': return 1000;
            case 'custom': return parseInt(videoBitrate.value) || 2500;
            default: return 2500;
        }
    }

    function getTargetResolution(origW, origH) {
        var scale = resolutionScale.value;
        if (scale === 'custom') {
            var w = parseInt(customWidth.value) || origW;
            var ratio = origH / origW;
            return { width: w, height: Math.round(w * ratio) };
        }
        var pct = parseInt(scale) / 100;
        return { width: Math.round(origW * pct), height: Math.round(origH * pct) };
    }

    function getOutputMimeType(fmt) {
        var map = {
            'webm': 'video/webm',
            'webm-vp9': 'video/webm',
            'mp4': 'video/mp4',
            'wmv': 'video/x-ms-wmv',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'mkv': 'video/x-matroska'
        };
        return map[fmt] || 'video/webm';
    }

    function getOutputExtension(fmt) {
        if (fmt === 'webm-vp9') return 'webm';
        return fmt;
    }

    function getSupportedMime() {
        var fmt = outputFormat.value;
        var codecs = [];
        if (fmt === 'webm') {
            codecs = ['video/webm;codecs=vp8', 'video/webm;codecs=vp8.0', 'video/webm'];
        } else if (fmt === 'webm-vp9') {
            codecs = ['video/webm;codecs=vp9', 'video/webm;codecs=vp9.0', 'video/webm;codecs=vp8', 'video/webm'];
        } else if (fmt === 'mp4') {
            codecs = ['video/mp4;codecs=avc1', 'video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp8', 'video/webm'];
        }
        for (var i = 0; i < codecs.length; i++) {
            if (MediaRecorder.isTypeSupported(codecs[i])) {
                return codecs[i];
            }
        }
        return 'video/webm';
    }

    function updateFormatInfo() {
        var fmt = outputFormat.value;
        var msg;
        if (needsFFmpeg(fmt)) {
            var labels = { wmv: 'WMV', mov: 'MOV', avi: 'AVI', mkv: 'MKV' };
            msg = '将使用 FFmpeg 引擎输出 ' + (labels[fmt] || fmt.toUpperCase()) + ' 格式（首次使用需下载约30MB引擎文件）';
        } else {
            var mime = getSupportedMime();
            if (mime.startsWith('video/mp4')) {
                msg = '将输出 MP4 (H.264) 格式，兼容大多数播放器和设备';
            } else if (mime.includes('vp9')) {
                msg = '将输出 WebM (VP9) 格式，体积更小但转换较慢';
            } else {
                msg = '将输出 WebM (VP8) 格式，兼容性良好';
            }
            if ((fmt === 'mp4' && !mime.startsWith('video/mp4')) ||
                (fmt === 'webm-vp9' && !mime.includes('vp9'))) {
                msg += '（注意：浏览器不支持所选编码，已自动降级）';
            }
        }
        formatInfoText.textContent = msg;

        // Dim quality preset for FFmpeg formats (quality controlled by bitrate directly)
        var isFFmpeg = needsFFmpeg(fmt);
        var qualityRow = document.getElementById('videoQuality').closest('.setting-row');
        if (qualityRow) qualityRow.style.opacity = isFFmpeg ? '0.5' : '';
    }

    outputFormat.addEventListener('change', updateFormatInfo);
    videoQuality.addEventListener('change', function () {
        customBitrateRow.style.display = videoQuality.value === 'custom' ? '' : 'none';
    });
    resolutionScale.addEventListener('change', function () {
        customResRow.style.display = resolutionScale.value === 'custom' ? '' : 'none';
    });

    videoUpload.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            showModal('文件大小超过100MB限制。当前文件大小：' + formatSize(file.size));
            videoUpload.value = '';
            return;
        }
        resetAll();
        sourceFile = file;
        outputBlob = null;
        var url = URL.createObjectURL(file);
        videoPlayer.src = url;

        // Timeout: if metadata never loads (e.g. TS files), show info anyway
        var metadataTimeout = setTimeout(function () {
            if (videoPlayer.readyState < 1) {
                showFileInfo(file);
            }
        }, 3000);
        videoPlayer.onloadedmetadata = function () {
            clearTimeout(metadataTimeout);
            showFileInfo(file);
        };
        videoPlayer.onerror = function () {
            clearTimeout(metadataTimeout);
            showFileInfo(file);
        };

        function showFileInfo(file) {
            var ext = getExtension(file.name);
            var w = videoPlayer.videoWidth || 0;
            var h = videoPlayer.videoHeight || 0;
            var dur = videoPlayer.duration || 0;
            var browserPlays = videoPlayer.readyState >= 2;
            videoInfo.innerHTML =
                '<p><strong>文件名：</strong>' + file.name + '</p>' +
                '<p><strong>原始格式：</strong>' + ext.toUpperCase() + ' | ' +
                '<strong>分辨率：</strong>' + (w && h ? w + 'x' + h : '未知（需FFmpeg解码）') + ' | ' +
                '<strong>时长：</strong>' + (dur ? formatDuration(dur) : '未知') + ' | ' +
                '<strong>大小：</strong>' + formatSize(file.size) + '</p>' +
                (browserPlays ? '' : '<p style="color:#e67e22;">* 浏览器无法直接播放此格式，将使用 FFmpeg 引擎转换</p>');
            settingsSection.style.display = '';
            updateFormatInfo();
            if (w) customWidth.value = w;
            convertBtn.disabled = false;
        }
    });

    function resetAll() {
        videoPlayer.controls = true;
        videoPlayer.onended = null;
        outputSection.style.display = 'none';
        convertBtn.disabled = true;
        convertBtnText.style.display = '';
        convertBtnLoading.style.display = 'none';
        progressContainer.style.display = 'none';
        convertNote.style.display = 'none';
    }

    // ---- FFmpeg.wasm ----
    async function getFFmpeg() {
        if (ffmpegInstance) return ffmpegInstance;
        if (ffmpegLoadError) throw new Error(ffmpegLoadError);
        if (ffmpegLoading) {
            return new Promise(function (resolve, reject) {
                var check = setInterval(function () {
                    if (ffmpegInstance) { clearInterval(check); resolve(ffmpegInstance); }
                    if (ffmpegLoadError) { clearInterval(check); reject(new Error(ffmpegLoadError)); }
                }, 200);
            });
        }
        ffmpegLoading = true;
        convertNote.textContent = '正在加载 FFmpeg 引擎（约30MB，首次加载）...';
        try {
            if (typeof FFmpegWASM === 'undefined') {
                throw new Error('FFmpeg 脚本未加载，请检查网络连接后刷新页面。');
            }
            var FFmpeg = FFmpegWASM.FFmpeg;
            var ffmpeg = new FFmpeg();
            ffmpeg.on('log', function (e) { console.log('[ffmpeg]', e.message); });
            ffmpeg.on('progress', function (e) {
                var pct = Math.min(Math.round(e.progress * 100), 99);
                progressBar.style.width = pct + '%';
                progressPercentage.textContent = pct + '%';
            });
            await ffmpeg.load({
                coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js'
            });
            ffmpegInstance = ffmpeg;
            convertNote.textContent = 'FFmpeg 引擎就绪，开始转换...';
        } catch (e) {
            ffmpegLoadError = e.message || 'FFmpeg 加载失败';
            throw new Error(ffmpegLoadError);
        } finally {
            ffmpegLoading = false;
        }
        return ffmpegInstance;
    }

    async function convertWithFFmpeg(file, fmt, targetRes, fpsSelect, includeAudio) {
        var ffmpeg = await getFFmpeg();
        var ext = getExtension(file.name);
        var inputName = 'input.' + ext;
        var outputName = 'output.' + getOutputExtension(fmt);
        var videoBitrateVal = getQualityBitrate();

        // Write input
        var inputData = new Uint8Array(await file.arrayBuffer());
        await ffmpeg.writeFile(inputName, inputData);

        // Build args
        var args = ['-i', inputName];

        // Video codec
        switch (fmt) {
            case 'wmv':
                args.push('-c:v', 'wmv2', '-c:a', 'wmav2');
                break;
            case 'mov':
                args.push('-c:v', 'libx264', '-c:a', 'aac', '-strict', 'experimental');
                break;
            case 'avi':
                args.push('-c:v', 'libx264', '-c:a', 'aac', '-strict', 'experimental');
                break;
            case 'mkv':
                args.push('-c:v', 'libx264', '-c:a', 'aac', '-strict', 'experimental');
                break;
            default:
                args.push('-c:v', 'libx264', '-c:a', 'aac', '-strict', 'experimental');
        }

        // Bitrate
        args.push('-b:v', videoBitrateVal + 'k');

        // Resolution
        if (targetRes.width && targetRes.height) {
            args.push('-vf', 'scale=' + targetRes.width + ':' + targetRes.height);
        }

        // FPS
        if (fpsSelect > 0) {
            args.push('-r', String(fpsSelect));
        }

        // Audio
        if (!includeAudio) {
            args.push('-an');
        }

        args.push('-y', outputName);

        // Execute
        await ffmpeg.exec(args);

        // Read output
        var data = await ffmpeg.readFile(outputName);
        var mime = getOutputMimeType(fmt);
        var blob = new Blob([data.buffer], { type: mime });

        // Cleanup virtual FS
        try { await ffmpeg.deleteFile(inputName); } catch (e) { }
        try { await ffmpeg.deleteFile(outputName); } catch (e) { }

        return blob;
    }

    // ---- Browser MediaRecorder ----
    function convertWithMediaRecorder(video, targetRes, fpsSelect, includeAudio, videoBitrateVal) {
        return new Promise(function (resolve, reject) {
            var duration = video.duration;
            var origW = video.videoWidth;
            var origH = video.videoHeight;
            var needsCanvas = (targetRes.width !== origW || targetRes.height !== origH || fpsSelect > 0);
            var canvas = previewCanvas;
            var ctx;
            var chunks = [];
            var recorder;
            var startTime = Date.now();

            if (needsCanvas) {
                canvas.width = targetRes.width;
                canvas.height = targetRes.height;
                ctx = canvas.getContext('2d');
            }

            video.muted = true;
            video.playsInline = true;
            video.controls = false;
            video.currentTime = 0;

            video.play().then(function () {
                convertNote.textContent = '转换中...';
                var sourceStream;
                try {
                    sourceStream = video.captureStream(fpsSelect || undefined);
                } catch (e) {
                    sourceStream = video.captureStream();
                }

                if (sourceStream.getVideoTracks().length === 0) {
                    reject(new Error('无法获取视频轨道'));
                    return;
                }

                if (needsCanvas) {
                    var canvasStream = canvas.captureStream(fpsSelect || 30);
                    var combined = new MediaStream();
                    combined.addTrack(canvasStream.getVideoTracks()[0]);
                    if (includeAudio) {
                        sourceStream.getAudioTracks().forEach(function (t) { combined.addTrack(t); });
                    }
                    sourceStream = combined;
                } else if (!includeAudio) {
                    sourceStream.getAudioTracks().forEach(function (t) { t.stop(); });
                }

                var mimeType = getSupportedMime();
                try {
                    recorder = new MediaRecorder(sourceStream, { mimeType: mimeType, videoBitsPerSecond: videoBitrateVal });
                } catch (e) {
                    recorder = new MediaRecorder(sourceStream, { mimeType: 'video/webm', videoBitsPerSecond: videoBitrateVal });
                }

                recorder.ondataavailable = function (e) {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = function () {
                    var actualMime = recorder.mimeType || mimeType || 'video/webm';
                    var blob = new Blob(chunks, { type: actualMime });
                    video.controls = true;
                    video.onended = null;
                    if (blob.size === 0) {
                        reject(new Error('输出为空，浏览器可能不支持该视频编码'));
                    } else {
                        resolve({ blob: blob, ext: actualMime.startsWith('video/mp4') ? 'mp4' : 'webm' });
                    }
                };

                recorder.onerror = function (e) {
                    reject(new Error('录制出错：' + (e.error ? e.error.message : '未知错误')));
                };

                recorder.start(250);

                if (needsCanvas) {
                    (function drawLoop() {
                        if (cancelConversion || video.ended || (video.paused && video.currentTime >= duration - 0.2)) return;
                        ctx.drawImage(video, 0, 0, targetRes.width, targetRes.height);
                        requestAnimationFrame(drawLoop);
                    })();
                }

                (function monitorProgress() {
                    if (cancelConversion || video.ended) return;
                    var progress = Math.min(video.currentTime / duration * 100, 99);
                    progressBar.style.width = progress + '%';
                    progressPercentage.textContent = Math.round(progress) + '%';
                    var elapsed = (Date.now() - startTime) / 1000;
                    var remaining = progress > 1 ? (elapsed / progress * (100 - progress)) : 0;
                    convertNote.textContent = '转换中... 剩余约 ' + Math.ceil(remaining) + ' 秒';
                    if (video.ended || (video.paused && video.currentTime >= duration - 0.2)) {
                        if (recorder && recorder.state === 'recording') recorder.stop();
                        return;
                    }
                    requestAnimationFrame(monitorProgress);
                })();

                video.onended = function () {
                    if (recorder && recorder.state === 'recording') recorder.stop();
                };
            }).catch(function (e) {
                reject(new Error('视频播放失败：' + e.message));
            });
        });
    }

    // ---- Main conversion ----
    convertBtn.addEventListener('click', function () {
        if (!sourceFile) return;
        startConversion();
    });

    function startConversion() {
        var video = videoPlayer;
        var browserCanPlay = video.readyState >= 2;
        var fmt = outputFormat.value;

        // If browser can't decode or format needs FFmpeg, use FFmpeg path
        var useFFmpeg = needsFFmpeg(fmt) || !browserCanPlay;

        if (!browserCanPlay && !useFFmpeg) {
            showModal('视频尚未加载完成，请稍后再试。');
            return;
        }

        cancelConversion = false;
        convertBtn.disabled = true;
        convertBtnText.style.display = 'none';
        convertBtnLoading.style.display = '';
        progressContainer.style.display = '';
        progressBar.style.width = '0%';
        progressPercentage.textContent = '0%';
        convertNote.style.display = '';
        convertNote.textContent = '正在准备...';
        outputSection.style.display = 'none';

        var origW = video.videoWidth;
        var origH = video.videoHeight;
        var targetRes = getTargetResolution(origW, origH);
        var fpsSelect = parseInt(frameRate.value) || 0;
        var includeAudio = keepAudio.checked;
        var videoBitrateVal = getQualityBitrate() * 1000;

        function cleanup() {
            video.controls = true;
            video.onended = null;
            convertBtnText.style.display = '';
            convertBtnLoading.style.display = 'none';
            convertBtn.disabled = !sourceFile;
            progressContainer.style.display = 'none';
            convertNote.style.display = 'none';
        }

        function onError(msg) {
            cancelConversion = true;
            cleanup();
            showModal(msg);
        }

        function onSuccess(blob, outExt) {
            outputBlob = blob;
            var outUrl = URL.createObjectURL(blob);
            outputVideo.src = outUrl;
            outputSection.style.display = '';

            var origName = sourceFile.name.replace(/\.[^.]+$/, '');
            resultInfo.innerHTML =
                '<p><strong>输出格式：</strong>' + outExt.toUpperCase() + ' | ' +
                '<strong>分辨率：</strong>' + targetRes.width + 'x' + targetRes.height + ' | ' +
                '<strong>大小：</strong>' + formatSize(blob.size) + ' | ' +
                '<strong>压缩比：</strong>' + (sourceFile.size > 0 ? (blob.size / sourceFile.size * 100).toFixed(1) : '0.0') + '%</p>';
            downloadBtn.onclick = function () {
                var a = document.createElement('a');
                a.href = outUrl;
                a.download = origName + '_helpoke.' + outExt;
                a.click();
            };
            cleanup();
        }

        // Choose engine
        if (useFFmpeg) {
            convertNote.textContent = '正在初始化 FFmpeg...';
            getFFmpeg().then(function () {
                return convertWithFFmpeg(sourceFile, fmt, targetRes, fpsSelect, includeAudio);
            }).then(function (blob) {
                if (cancelConversion) return;
                if (blob.size === 0) { onError('转换失败：输出为空。'); return; }
                onSuccess(blob, getOutputExtension(fmt));
            }).catch(function (e) {
                if (!cancelConversion) onError('FFmpeg 转换失败：' + e.message);
            });
        } else {
            convertWithMediaRecorder(video, targetRes, fpsSelect, includeAudio, videoBitrateVal).then(function (result) {
                if (cancelConversion) return;
                onSuccess(result.blob, result.ext);
            }).catch(function (e) {
                if (!cancelConversion) onError(e.message);
            });
        }
    }

    settingsSection.style.display = 'none';
    outputSection.style.display = 'none';
    updateFormatInfo();
})();
