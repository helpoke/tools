/**
 * VideoProcessor — Universal video processing engine.
 *
 * Shared FFmpeg singleton, parallel multi-worker processing, time-range
 * extraction, and segment concatenation. Works with all video/* tools.
 *
 * Usage:
 *   var blob = await VideoProcessor.process({
 *       file: sourceFile,
 *       duration: videoPlayer.duration,
 *       outputExt: 'mp4',
 *       buildArgs: function(inputName, outputName, segment) {
 *           if (segment) {
 *               return ['-ss', segment.startTime, '-t', segment.duration,
 *                       '-i', inputName, '-vf', myFilter, '-c:a', 'copy'];
 *           }
 *           return ['-i', inputName, '-vf', myFilter, '-c:a', 'copy'];
 *       },
 *       startTime: 5,        // optional trim
 *       endTime: 30,         // optional trim
 *       onProgress: function(pct, status) { ... }
 *   });
 */
(function () {
    'use strict';

    // ============================================================
    // Configuration
    // ============================================================

    var CONFIG = {
        MIN_SEGMENT_DURATION: 8,
        MIN_DURATION_FOR_PARALLEL: 15,
        MAX_WORKERS: 4,
        BATCH_SIZE: 2,
        LOAD_TIMEOUT: 180000,
        CORE_VERSION: '0.12.10',
        NON_CONCATENABLE_FORMATS: ['gif'],
        CDN_SOURCES: [
            { name: 'local', coreURL: '../lib/ffmpeg-core.js' },
            { name: 'unpkg CDN', coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js' },
            { name: 'jsDelivr CDN', coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js' }
        ]
    };

    // ============================================================
    // Singleton state
    // ============================================================

    var _ffmpegInstance = null;
    var _ffmpegLoading = false;
    var _ffmpegLoadError = null;
    var _loadTimeoutId = null;
    var _activeWorkers = [];

    // ============================================================
    // Internal utilities
    // ============================================================

    var MIME_MAP = {
        mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
        avi: 'video/x-msvideo', mkv: 'video/x-matroska', flv: 'video/x-flv',
        gif: 'image/gif', mp3: 'audio/mpeg', wav: 'audio/wav',
        aac: 'audio/aac', m4a: 'audio/mp4', ogg: 'audio/ogg'
    };

    function getMime(ext) {
        return MIME_MAP[ext] || 'video/mp4';
    }

    function getExtension(filename) {
        return (filename.split('.').pop() || 'mp4').toLowerCase();
    }

    function formatDuration(seconds) {
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    // ============================================================
    // FFmpeg singleton — shared across all tools
    // ============================================================

    async function getFFmpeg(coreURL) {
        if (_ffmpegInstance) return _ffmpegInstance;
        if (_ffmpegLoadError) throw new Error(_ffmpegLoadError);
        if (_ffmpegLoading) {
            return new Promise(function (resolve, reject) {
                var check = setInterval(function () {
                    if (_ffmpegInstance) { clearInterval(check); resolve(_ffmpegInstance); }
                    if (_ffmpegLoadError) { clearInterval(check); reject(new Error(_ffmpegLoadError)); }
                }, 200);
            });
        }

        _ffmpegLoading = true;

        _loadTimeoutId = setTimeout(function () {
            _ffmpegLoadError = window.t('video.ffmpeg.loadTimeout');
            _ffmpegLoading = false;
        }, CONFIG.LOAD_TIMEOUT);

        if (typeof FFmpegWASM === 'undefined') {
            _ffmpegLoading = false;
            _ffmpegLoadError = window.t('video.ffmpeg.scriptNotLoaded');
            throw new Error(_ffmpegLoadError);
        }

        var lastError = null;
        var sources = coreURL
            ? [{ name: 'custom', coreURL: coreURL }]
            : CONFIG.CDN_SOURCES;

        for (var i = 0; i < sources.length; i++) {
            try {
                var FFmpeg = FFmpegWASM.FFmpeg;
                var ffmpeg = new FFmpeg();
                await ffmpeg.load({ coreURL: sources[i].coreURL });
                clearTimeout(_loadTimeoutId);
                _ffmpegInstance = ffmpeg;
                _ffmpegLoading = false;
                return ffmpeg;
            } catch (err) {
                lastError = err;
                console.warn('[VideoProcessor] ' + sources[i].name + ' 加载失败:', err.message);
            }
        }

        clearTimeout(_loadTimeoutId);
        _ffmpegLoading = false;
        _ffmpegLoadError = lastError ? lastError.message : window.t('video.ffmpeg.loadFailed');
        throw new Error(_ffmpegLoadError);
    }

    // ============================================================
    // Independent worker — for parallel processing
    // ============================================================

    async function createWorker(coreURL) {
        if (typeof FFmpegWASM === 'undefined') {
            throw new Error('FFmpegWASM global not loaded');
        }
        var FFmpeg = FFmpegWASM.FFmpeg;
        var worker = new FFmpeg();
        await worker.load({ coreURL: coreURL || CONFIG.CDN_SOURCES[0].coreURL });
        _activeWorkers.push(worker);
        return worker;
    }

    function terminateWorker(worker) {
        var idx = _activeWorkers.indexOf(worker);
        if (idx >= 0) _activeWorkers.splice(idx, 1);
        try { worker.terminate(); } catch (e) { }
    }

    function terminateAllWorkers() {
        for (var i = 0; i < _activeWorkers.length; i++) {
            try { _activeWorkers[i].terminate(); } catch (e) { }
        }
        _activeWorkers.length = 0;
    }

    // ============================================================
    // File I/O
    // ============================================================

    async function readFile(file) {
        return new Uint8Array(await file.arrayBuffer());
    }

    // ============================================================
    // Single-threaded execution
    // ============================================================

    async function exec(opts) {
        var ffmpeg = opts.ffmpeg;
        var fileData = opts.fileData;
        var ext = opts.ext;
        var outputExt = opts.outputExt;
        var buildArgs = opts.buildArgs;
        var onProgress = opts.onProgress || function () { };

        var inputName = 'input.' + ext;
        var outputName = 'output.' + outputExt;

        await ffmpeg.writeFile(inputName, fileData);

        var args = buildArgs(inputName, outputName, null);
        args.push('-y', outputName);

        ffmpeg.on('progress', function (e) {
            var pct = Math.round(e.progress * 100);
            if (pct > 0) onProgress(pct);
        });

        await ffmpeg.exec(args);

        var data = await ffmpeg.readFile(outputName);
        if (!data || data.length === 0) {
            throw new Error(window.t('video.ffmpeg.outputEmpty'));
        }

        try { await ffmpeg.deleteFile(inputName); } catch (e) { }
        try { await ffmpeg.deleteFile(outputName); } catch (e) { }

        return new Blob([data.buffer], { type: getMime(outputExt) });
    }

    // ============================================================
    // Fast segment extraction (-c copy, no re-encode)
    // ============================================================

    async function extractSegment(ffmpeg, fileData, ext, startTime, duration, outputExt) {
        var inputName = 'extract_in.' + ext;
        var outputName = 'extract_out.' + outputExt;

        await ffmpeg.writeFile(inputName, fileData);

        var args = [
            '-ss', startTime.toFixed(3),
            '-i', inputName,
            '-t', duration.toFixed(3),
            '-c', 'copy',
            '-avoid_negative_ts', 'make_zero',
            '-y', outputName
        ];

        await ffmpeg.exec(args);
        var data = await ffmpeg.readFile(outputName);

        try { await ffmpeg.deleteFile(inputName); } catch (e) { }
        try { await ffmpeg.deleteFile(outputName); } catch (e) { }

        return new Blob([data.buffer], { type: getMime(outputExt) });
    }

    // ============================================================
    // Concatenate video blobs (concat demuxer, -c copy)
    // ============================================================

    async function concatBlobs(ffmpeg, blobs, outputExt) {
        if (blobs.length === 0) throw new Error(window.t('video.ffmpeg.noSegments'));
        if (blobs.length === 1) return blobs[0];

        for (var i = 0; i < blobs.length; i++) {
            var partData = new Uint8Array(await blobs[i].arrayBuffer());
            await ffmpeg.writeFile('part_' + i + '.' + outputExt, partData);
        }

        var list = '';
        for (var j = 0; j < blobs.length; j++) {
            list += "file 'part_" + j + "." + outputExt + "'\n";
        }
        await ffmpeg.writeFile('concat.txt', list);

        var args = ['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', '-y', 'final.' + outputExt];
        await ffmpeg.exec(args);

        var data = await ffmpeg.readFile('final.' + outputExt);
        if (!data || data.length === 0) {
            throw new Error(window.t('video.ffmpeg.concatFailed'));
        }

        for (var k = 0; k < blobs.length; k++) {
            try { await ffmpeg.deleteFile('part_' + k + '.' + outputExt); } catch (e) { }
        }
        try { await ffmpeg.deleteFile('concat.txt'); } catch (e) { }
        try { await ffmpeg.deleteFile('final.' + outputExt); } catch (e) { }

        return new Blob([data.buffer], { type: getMime(outputExt) });
    }

    // ============================================================
    // Worker count calculator
    // ============================================================

    function getWorkerCount(duration, maxWorkers) {
        maxWorkers = maxWorkers || CONFIG.MAX_WORKERS;
        if (!duration || duration < CONFIG.MIN_DURATION_FOR_PARALLEL) return 1;
        var cores = navigator.hardwareConcurrency || 4;
        return Math.min(Math.min(cores, maxWorkers), Math.max(1, Math.floor(duration / CONFIG.MIN_SEGMENT_DURATION)));
    }

    // ============================================================
    // Parallel segment processing (internal)
    // ============================================================

    async function _processSegmentsParallel(opts) {
        var fileData = opts.fileData;
        var ext = opts.ext;
        var outputExt = opts.outputExt;
        var segments = opts.segments;
        var coreURL = opts.coreURL;
        var batchSize = opts.batchSize || CONFIG.BATCH_SIZE;
        var buildArgs = opts.buildArgs;
        var onProgress = opts.onProgress || function () { };
        var progressBase = opts.progressBase || 10;
        var progressSpan = opts.progressSpan || 80;

        var segmentCount = segments.length;

        // Create all workers in parallel
        onProgress(progressBase, window.t('video.ffmpeg.initThreads', { count: segmentCount }));

        var workerPromises = [];
        var createdCount = 0;
        for (var w = 0; w < segmentCount; w++) {
            (function (idx) {
                workerPromises.push(
                    createWorker(coreURL).then(function (worker) {
                        createdCount++;
                        onProgress(progressBase + Math.round(createdCount / segmentCount * 5),
                            window.t('video.ffmpeg.threadReady', { current: createdCount, total: segmentCount }));
                        return worker;
                    })
                );
            })(w);
        }

        var workers;
        try {
            workers = await Promise.all(workerPromises);
        } catch (err) {
            console.warn('[VideoProcessor] Worker creation failed:', err.message);
            return null;
        }

        // Per-segment progress tracking
        var segProgress = new Array(segmentCount).fill(0);
        var completed = 0;
        var lastReportedPct = progressBase + 5;

        function updateProgress() {
            var sum = 0;
            for (var i = 0; i < segProgress.length; i++) sum += segProgress[i];
            var avg = sum / segProgress.length;
            var pct = progressBase + 5 + Math.round(avg * (progressSpan - 5));
            if (pct > lastReportedPct) {
                lastReportedPct = pct;
                onProgress(pct, window.t('video.ffmpeg.processing', { current: completed, total: segmentCount }));
            }
        }

        // Process segments in batches
        var results = [];

        for (var batchStart = 0; batchStart < workers.length; batchStart += batchSize) {
            var batchEnd = Math.min(batchStart + batchSize, workers.length);
            var batchPromises = [];

            for (var s = batchStart; s < batchEnd; s++) {
                (function (ffmpeg, seg) {
                    // Each worker gets its own copy to prevent ArrayBuffer detachment
                    var segData = new Uint8Array(fileData);
                    var inputName = 'in_' + seg.index + '.' + ext;
                    var outputName = 'out_' + seg.index + '.' + outputExt;

                    batchPromises.push(
                        (async function () {
                            await ffmpeg.writeFile(inputName, segData);

                            var args = buildArgs(inputName, outputName, seg);
                            args.push('-y', outputName);

                            ffmpeg.on('progress', function (e) {
                                var p = e.progress || 0;
                                if (p > segProgress[seg.index]) {
                                    segProgress[seg.index] = p;
                                    updateProgress();
                                }
                            });

                            await ffmpeg.exec(args);

                            var data = await ffmpeg.readFile(outputName);
                            if (!data || data.length === 0) {
                                throw new Error('Segment ' + (seg.index + 1) + ' produced empty output');
                            }

                            try { await ffmpeg.deleteFile(inputName); } catch (e) { }
                            try { await ffmpeg.deleteFile(outputName); } catch (e) { }

                            segProgress[seg.index] = 1;
                            completed++;
                            updateProgress();

                            terminateWorker(ffmpeg);
                            return { index: seg.index, data: data };
                        })()
                    );
                })(workers[s], segments[s]);
            }

            try {
                var batchResults = await Promise.all(batchPromises);
                results = results.concat(batchResults);
            } catch (err) {
                console.warn('[VideoProcessor] Batch ' + (batchStart / batchSize + 1) + ' failed:', err.message);
                return null;
            }
        }

        if (results.length === 0) return null;

        results.sort(function (a, b) { return a.index - b.index; });

        var blobs = [];
        for (var r = 0; r < results.length; r++) {
            blobs.push(new Blob([results[r].data.buffer], { type: getMime(outputExt) }));
        }

        return blobs;
    }

    // ============================================================
    // Main orchestrator: process()
    // ============================================================

    async function process(opts) {
        var file = opts.file;
        var duration = opts.duration;
        var outputExt = opts.outputExt;
        var buildArgs = opts.buildArgs;
        var onProgress = opts.onProgress || function () { };
        var startTime = opts.startTime || 0;
        var endTime = opts.endTime || duration;
        var maxWorkers = opts.maxWorkers || CONFIG.MAX_WORKERS;
        var batchSize = opts.batchSize || CONFIG.BATCH_SIZE;
        var coreURL = opts.coreURL || CONFIG.CDN_SOURCES[0].coreURL;

        var ext = getExtension(file.name);
        var fileData = opts.fileData;

        // Validate
        startTime = Math.max(0, Math.min(startTime, duration));
        endTime = Math.max(startTime, Math.min(endTime, duration));
        var rangeDuration = endTime - startTime;
        var useTimeRange = (startTime > 0.5 || endTime < duration - 0.5);

        // Formats that cannot be concatenated with -c copy — skip parallel
        if (CONFIG.NON_CONCATENABLE_FORMATS.indexOf(outputExt) >= 0) {
            onProgress(0, window.t('video.ffmpeg.singleThread'));
            var gifFFmpeg = await getFFmpeg(coreURL);
            var gifData = fileData || await readFile(file);
            return exec({
                ffmpeg: gifFFmpeg, fileData: gifData, ext: ext,
                outputExt: outputExt, buildArgs: buildArgs,
                onProgress: function (pct) {
                    onProgress(Math.round(pct * 0.95), window.t('video.ffmpeg.processingSimple'));
                }
            });
        }

        // Read file once
        if (!fileData) {
            onProgress(0, window.t('video.ffmpeg.readingFile'));
            fileData = await readFile(file);
        }

        // Determine parallelism
        var workerCount = getWorkerCount(rangeDuration, maxWorkers);
        var useParallel = workerCount > 1;

        // ===================================
        // Single-threaded path
        // ===================================
        if (!useParallel) {
            onProgress(2, window.t('video.ffmpeg.singleThread'));
            var stFFmpeg = await getFFmpeg(coreURL);

            var stSeg = useTimeRange ? { startTime: startTime, duration: rangeDuration, index: 0 } : null;
            var blob = await exec({
                ffmpeg: stFFmpeg,
                fileData: fileData,
                ext: ext,
                outputExt: outputExt,
                buildArgs: function (inName, outName) {
                    return buildArgs(inName, outName, stSeg);
                },
                onProgress: function (pct) {
                    onProgress(2 + Math.round(pct * 0.93), window.t('video.ffmpeg.processingSimple'));
                }
            });

            onProgress(100, window.t('video.ffmpeg.done'));
            return blob;
        }

        // ===================================
        // Parallel path
        // ===================================
        var parts = [];
        var mainFFmpeg = null;

        var getMainFFmpeg = async function () {
            if (!mainFFmpeg) mainFFmpeg = await getFFmpeg(coreURL);
            return mainFFmpeg;
        };

        // Extract prefix (fast -c copy, no re-encode)
        if (startTime > 0.5) {
            onProgress(1, window.t('video.ffmpeg.extractPrefix', { start: formatDuration(0), end: formatDuration(startTime) }));
            try {
                var mf = await getMainFFmpeg();
                var prefixBlob = await extractSegment(mf, fileData, ext, 0, startTime, outputExt);
                parts.push(prefixBlob);
            } catch (err) {
                console.warn('[VideoProcessor] Prefix extraction failed:', err.message);
            }
        }

        // Build segments for the middle range
        var segmentDuration = rangeDuration / workerCount;
        var segments = [];
        for (var i = 0; i < workerCount; i++) {
            var segStart = startTime + i * segmentDuration;
            var segDur = (i === workerCount - 1)
                ? (endTime - segStart)
                : segmentDuration;
            segments.push({
                index: i,
                startTime: parseFloat(segStart.toFixed(3)),
                duration: parseFloat(segDur.toFixed(3))
            });
        }

        // Progress window for middle processing
        var segProgressBase = parts.length > 0 ? 12 : 5;
        var segProgressSpan = endTime < duration - 0.5 ? 78 : (parts.length > 0 ? 83 : 90);

        var middleBlobs = await _processSegmentsParallel({
            fileData: fileData,
            ext: ext,
            outputExt: outputExt,
            segments: segments,
            coreURL: coreURL,
            batchSize: batchSize,
            buildArgs: buildArgs,
            onProgress: onProgress,
            progressBase: segProgressBase,
            progressSpan: segProgressSpan
        });

        // Fallback: parallel failed → single-threaded
        if (!middleBlobs) {
            console.warn('[VideoProcessor] Parallel failed, falling back to single-threaded...');
            terminateAllWorkers();
            onProgress(segProgressBase, window.t('video.ffmpeg.singleThreadFallback'));
            var fbFFmpeg = await getMainFFmpeg();
            var fbSeg = { startTime: startTime, duration: rangeDuration, index: 0 };
            var fbBlob = await exec({
                ffmpeg: fbFFmpeg, fileData: fileData, ext: ext, outputExt: outputExt,
                buildArgs: function (inName, outName) { return buildArgs(inName, outName, fbSeg); },
                onProgress: function (pct) {
                    onProgress(segProgressBase + Math.round(pct * segProgressSpan / 100), window.t('video.ffmpeg.processingFallback'));
                }
            });
            middleBlobs = [fbBlob];
        }

        for (var m = 0; m < middleBlobs.length; m++) {
            parts.push(middleBlobs[m]);
        }

        // Extract suffix (fast -c copy)
        if (endTime < duration - 0.5) {
            var suffixPct = parts.length > 1 ? 90 : 85;
            onProgress(suffixPct, window.t('video.ffmpeg.extractSuffix', { start: formatDuration(endTime), end: formatDuration(duration) }));
            try {
                var mf2 = await getMainFFmpeg();
                var suffixBlob = await extractSegment(mf2, fileData, ext, endTime, duration - endTime, outputExt);
                parts.push(suffixBlob);
            } catch (err) {
                console.warn('[VideoProcessor] Suffix extraction failed:', err.message);
            }
        }

        // Concat all parts
        if (parts.length > 1) {
            onProgress(94, window.t('video.ffmpeg.merging'));
            var mf3 = await getMainFFmpeg();
            var finalBlob = await concatBlobs(mf3, parts, outputExt);
            onProgress(100, window.t('video.ffmpeg.mergeDone'));
            return finalBlob;
        } else if (parts.length === 1) {
            onProgress(100, window.t('video.ffmpeg.done'));
            return parts[0];
        }

        throw new Error(window.t('video.ffmpeg.processFailed'));
    }

    // ============================================================
    // Export
    // ============================================================

    var api = {
        CONFIG: CONFIG,
        getFFmpeg: getFFmpeg,
        createWorker: createWorker,
        readFile: readFile,
        getMime: getMime,
        exec: exec,
        process: process,
        extractSegment: extractSegment,
        concatBlobs: concatBlobs,
        getWorkerCount: getWorkerCount,
        terminateAllWorkers: terminateAllWorkers,
        terminateWorker: terminateWorker
    };

    window.VideoProcessor = api;

    // Backward-compatible alias
    window.FFmpegParallel = {
        process: function (opts) {
            return process({
                file: opts.file,
                fileData: opts.fileData,
                duration: opts.duration,
                outputExt: opts.outputExt,
                buildArgs: function (inName, outName, seg) {
                    var s = seg || { index: 0, startTime: 0, duration: opts.duration };
                    return opts.buildArgs(s, inName, outName);
                },
                onProgress: opts.onProgress,
                maxWorkers: opts.maxWorkers,
                batchSize: opts.batchSize,
                coreURL: opts.coreURL
            });
        },
        getWorkerCount: getWorkerCount,
        createWorker: createWorker,
        CONFIG: CONFIG
    };
})();
