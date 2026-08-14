/**
 * MTD Desktop - 渲染进程逻辑
 * 侧边栏布局 + 文件上传 + 历史记录
 */
(function () {
    'use strict';

    const sp = window.superplugin;
    const $ = (id) => document.getElementById(id);

    // ===== DOM 元素 =====
    const els = {
        // 侧边栏
        navItems: document.querySelectorAll('.nav-item'),
        views: document.querySelectorAll('.view'),
        pandocDotSidebar: $('pandocDotSidebar'),
        pandocStatusSidebar: $('pandocStatusSidebar'),
        appVersion: $('appVersion'),

        // 转换页面
        uploadZone: $('uploadZone'),
        uploadInner: $('uploadInner'),
        fileInput: $('fileInput'),
        docTitle: $('docTitle'),
        markdownInput: $('markdownInput'),
        charCount: $('charCount'),
        fileNameDisplay: $('fileNameDisplay'),
        optionsToggle: $('optionsToggle'),
        optionsContent: $('optionsContent'),
        optRemoveHr: $('optRemoveHr'),
        optHardBreaks: $('optHardBreaks'),
        optDisableNumbering: $('optDisableNumbering'),
        optToc: $('optToc'),
        convertNote: $('convertNote'),
        btnConvert: $('btnConvert'),
        btnClear: $('btnClear'),
        resultBanner: $('resultBanner'),

        // 历史页面
        historyList: $('historyList'),
        historyCount: $('historyCount'),
        btnClearHistory: $('btnClearHistory'),

        // 状态页面
        pandocBadge: $('pandocBadge'),
        pandocDot: $('pandocDot'),
        pandocStatusText: $('pandocStatusText'),
        pandocVersion: $('pandocVersion'),
        pandocPath: $('pandocPath'),
        btnCheckPandoc: $('btnCheckPandoc'),
        btnInstallPandoc: $('btnInstallPandoc'),

        // 设置页面
        autoLaunchToggle: $('autoLaunchToggle'),
        minimizeToggle: $('minimizeToggle'),
        aboutVersion: $('aboutVersion'),
        btnRefreshDeps: $('btnRefreshDeps'),
        depRuntime: $('depRuntime'),
        depPandoc: $('depPandoc'),
        depSystem: $('depSystem'),
        depNpm: $('depNpm'),

        // 字体设置
        fontEnabledToggle: $('fontEnabledToggle'),
        fontSettingsBody: $('fontSettingsBody'),
        fontFamilySelect: $('fontFamilySelect'),
        fontFamilyEnSelect: $('fontFamilyEnSelect'),
        bodySizeInput: $('bodySizeInput'),
        h1SizeInput: $('h1SizeInput'),
        h2SizeInput: $('h2SizeInput'),
        h3SizeInput: $('h3SizeInput'),
        h4SizeInput: $('h4SizeInput'),
        h5SizeInput: $('h5SizeInput'),
        h6SizeInput: $('h6SizeInput'),
        btnSaveFontSettings: $('btnSaveFontSettings'),
        btnResetFontSettings: $('btnResetFontSettings'),

        footerText: $('footerText'),
    };

    let lastSavedPath = null;
    let currentFileName = null;
    let pandocReady = false;
    let cachedFontSettings = null;

    // ===== 侧边栏导航 =====
    function switchView(viewName) {
        els.navItems.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        els.views.forEach(view => {
            view.classList.toggle('active', view.id === 'view-' + viewName);
        });

        if (viewName === 'history') {
            loadHistory();
        }
        if (viewName === 'settings') {
            loadDependencies();
        }
    }

    // ===== 文件上传 =====
    async function openFilePicker() {
        const result = await sp.file.openMarkdown();
        if (result.success) {
            loadFileContent(result.content, result.fileName);
        }
    }

    function loadFileContent(content, fileName) {
        currentFileName = fileName;
        els.markdownInput.value = content;
        els.fileNameDisplay.textContent = '已加载: ' + fileName;
        els.fileNameDisplay.style.display = 'inline';
        updateCharCount();
        setFooter('已加载文件: ' + fileName);
    }

    // 拖拽上传
    function setupDragDrop() {
        els.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            els.uploadZone.classList.add('dragover');
        });

        els.uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            els.uploadZone.classList.remove('dragover');
        });

        els.uploadZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            els.uploadZone.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length === 0) return;

            const file = files[0];
            const ext = file.name.split('.').pop().toLowerCase();
            if (!['md', 'markdown', 'txt'].includes(ext)) {
                setFooter('不支持的文件类型，请上传 .md 或 .txt 文件');
                return;
            }

            const text = await file.text();
            loadFileContent(text, file.name);
        });
    }

    // ===== 转换功能 =====
    async function convertToWord() {
        const content = els.markdownInput.value.trim();
        if (!content) {
            setFooter('请输入或上传 Markdown 内容');
            els.markdownInput.focus();
            return;
        }

        // 检查 Pandoc
        if (!pandocReady) {
            const status = await sp.pandoc.check();
            if (!status.found) {
                setFooter('未找到 Pandoc，请先安装');
                switchView('status');
                return;
            }
            pandocReady = true;
        }

        const options = {
            content: content,
            title: els.docTitle.value.trim() || 'AI对话导出',
            sourceFileName: currentFileName,
            note: els.convertNote.value.trim(),
            table_style: document.querySelector('input[name="tableStyle"]:checked')?.value || 'three-line',
            remove_hr: els.optRemoveHr.checked,
            hard_line_breaks: els.optHardBreaks.checked,
            disable_auto_numbering: els.optDisableNumbering.checked,
            toc: els.optToc.checked,
            font_settings: getFontSettingsForConversion(),
        };

        // 加载状态
        els.btnConvert.classList.add('loading');
        els.btnConvert.disabled = true;
        els.btnConvert.querySelector('span').textContent = '转换中...';
        setFooter('正在转换...');

        try {
            const result = await sp.convert.save(options);

            if (result.success) {
                lastSavedPath = result.filePath;
                showResultBanner(true, result);
                setFooter('转换成功');
                els.convertNote.value = '';
                currentFileName = null;
            } else if (result.canceled) {
                setFooter('已取消保存');
            } else {
                showResultBanner(false, null, result.error);
                setFooter('转换失败: ' + (result.error || '未知错误'));
            }
        } catch (err) {
            showResultBanner(false, null, err.message);
            setFooter('转换失败: ' + err.message);
        } finally {
            els.btnConvert.classList.remove('loading');
            els.btnConvert.disabled = false;
            els.btnConvert.querySelector('span').textContent = '转换为 Word';
        }
    }

    function showResultBanner(success, result, error) {
        const banner = els.resultBanner;
        banner.style.display = 'flex';
        banner.className = 'result-banner ' + (success ? 'success' : 'error');

        if (success) {
            banner.innerHTML = `
                <div class="result-banner-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div class="result-banner-body">
                    <h3>转换成功！</h3>
                    <p>${result.filePath}</p>
                    <p style="margin-top:4px">耗时 ${(result.timeMs / 1000).toFixed(1)}s · ${result.sizeKB} KB</p>
                </div>
                <div class="result-banner-actions">
                    <button class="btn btn-outline btn-sm" onclick="window._superplugin.openFolder()">打开文件夹</button>
                    <button class="btn btn-outline btn-sm" onclick="document.getElementById('resultBanner').style.display='none'">关闭</button>
                </div>
            `;
        } else {
            banner.innerHTML = `
                <div class="result-banner-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <div class="result-banner-body">
                    <h3>转换失败</h3>
                    <p>${error || '未知错误'}</p>
                </div>
                <div class="result-banner-actions">
                    <button class="btn btn-outline btn-sm" onclick="document.getElementById('resultBanner').style.display='none'">关闭</button>
                </div>
            `;
        }
    }

    window._superplugin = {
        openFolder: () => {
            if (lastSavedPath) sp.shell.showItemInFolder(lastSavedPath);
        }
    };

    function clearInput() {
        els.markdownInput.value = '';
        currentFileName = null;
        els.fileNameDisplay.style.display = 'none';
        els.resultBanner.style.display = 'none';
        updateCharCount();
        els.markdownInput.focus();
        setFooter('已清空');
    }

    function updateCharCount() {
        const len = els.markdownInput.value.length;
        els.charCount.textContent = len.toLocaleString() + ' 字符';
    }

    // ===== 选项折叠 =====
    function toggleOptions() {
        const expanded = els.optionsToggle.classList.toggle('expanded');
        els.optionsContent.classList.toggle('show', expanded);
    }

    // ===== Pandoc 状态 =====
    async function checkPandoc() {
        els.pandocBadge.textContent = '检查中...';
        els.pandocBadge.className = 'badge checking';
        els.pandocDot.className = 'status-dot';
        els.pandocStatusText.textContent = '检查中...';
        els.pandocDotSidebar.className = 'status-dot';
        els.pandocStatusSidebar.textContent = '检查中';

        try {
            const result = await sp.pandoc.check();
            updatePandocUI(result);
        } catch (err) {
            els.pandocBadge.textContent = '错误';
            els.pandocBadge.className = 'badge stopped';
            els.pandocStatusText.textContent = '检测失败';
            els.pandocStatusSidebar.textContent = '错误';
            els.pandocDot.className = 'status-dot stopped';
            els.pandocDotSidebar.className = 'status-dot stopped';
        }
    }

    function updatePandocUI(result) {
        if (result.found) {
            pandocReady = true;
            els.pandocBadge.textContent = '已安装';
            els.pandocBadge.className = 'badge running';
            els.pandocDot.className = 'status-dot running';
            els.pandocDotSidebar.className = 'status-dot running';
            els.pandocStatusText.textContent = '已安装';
            els.pandocStatusSidebar.textContent = '就绪';
            els.pandocVersion.textContent = result.version || '-';
            els.pandocPath.textContent = result.path || '-';
        } else {
            pandocReady = false;
            els.pandocBadge.textContent = '未安装';
            els.pandocBadge.className = 'badge warning';
            els.pandocDot.className = 'status-dot warning';
            els.pandocDotSidebar.className = 'status-dot warning';
            els.pandocStatusText.textContent = '未安装';
            els.pandocStatusSidebar.textContent = '未安装';
            els.pandocVersion.textContent = '-';
            els.pandocPath.textContent = '-';
        }
    }

    // ===== 历史记录 =====
    async function loadHistory() {
        try {
            const records = await sp.history.load();
            renderHistory(records);
        } catch (err) {
            setFooter('加载历史记录失败');
        }
    }

    function renderHistory(records) {
        els.historyCount.textContent = `共 ${records.length} 条记录`;

        if (records.length === 0) {
            els.historyList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <p>暂无转换记录</p>
                </div>
            `;
            return;
        }

        const html = records.map(r => {
            const date = new Date(r.timestamp);
            const dateStr = formatTime(date);
            const outputName = escapeHtml(r.outputFileName || r.title || '未命名文档');
            const sourceName = r.sourceFileName ? escapeHtml(r.sourceFileName) : null;
            const noteText = r.note ? escapeHtml(r.note) : '';

            // 注释区域：有注释显示注释+编辑按钮，无注释显示添加按钮
            let noteSection;
            if (noteText) {
                noteSection = `
                    <div class="history-item-note">
                        <span class="history-item-note-text">${noteText}</span>
                        <button class="note-btn" title="编辑注释" onclick="window._superplugin.editNote('${r.id}')">编辑</button>
                    </div>
                `;
            } else {
                noteSection = `
                    <div class="history-item-note empty">
                        <span class="history-item-note-text">暂无注释</span>
                        <button class="note-btn" title="添加注释" onclick="window._superplugin.editNote('${r.id}')">添加注释</button>
                    </div>
                `;
            }

            return `
                <div class="history-item" data-id="${r.id}">
                    <div class="history-item-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div class="history-item-body">
                        <div class="history-item-title">${outputName}</div>
                        <div class="history-item-meta">
                            <span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${dateStr}</span>
                            ${sourceName ? `<span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>源: ${sourceName}</span>` : ''}
                        </div>
                        ${noteSection}
                    </div>
                    <div class="history-item-actions">
                        <button class="icon-btn danger" title="删除记录" onclick="window._superplugin.deleteHistory('${r.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        els.historyList.innerHTML = html;
    }

    // 编辑历史记录注释
    window._superplugin.editNote = (id) => {
        const item = document.querySelector(`.history-item[data-id="${id}"]`);
        if (!item) return;

        const noteSection = item.querySelector('.history-item-note');
        if (!noteSection) return;

        const currentTextEl = noteSection.querySelector('.history-item-note-text');
        const currentText = currentTextEl ? currentTextEl.textContent.trim() : '';
        const isPlaceholder = currentText === '暂无注释';
        const actualText = isPlaceholder ? '' : currentText;

        noteSection.className = 'history-item-note';
        noteSection.innerHTML = `
            <div style="flex:1;">
                <input type="text" class="history-item-note-edit" value="${escapeAttr(actualText)}" placeholder="输入注释内容...">
                <div class="history-item-note-actions">
                    <button class="note-btn primary" onclick="window._superplugin.saveNote('${id}')">保存</button>
                    <button class="note-btn" onclick="window._superplugin.cancelEdit()">取消</button>
                </div>
            </div>
        `;

        const input = noteSection.querySelector('.history-item-note-edit');
        if (input) {
            input.focus();
            input.select();
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window._superplugin.saveNote(id);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    window._superplugin.cancelEdit();
                }
            });
        }
    };

    // 保存历史记录注释
    window._superplugin.saveNote = async (id) => {
        const item = document.querySelector(`.history-item[data-id="${id}"]`);
        if (!item) return;

        const input = item.querySelector('.history-item-note-edit');
        const note = input ? input.value.trim() : '';

        const result = await sp.history.updateNote(id, note);
        if (result.success) {
            await loadHistory();
            setFooter(note ? '注释已保存' : '注释已清空');
        } else {
            setFooter('保存注释失败');
        }
    };

    // 取消编辑注释
    window._superplugin.cancelEdit = () => {
        loadHistory();
    };

    // 删除历史记录
    window._superplugin.deleteHistory = async (id) => {
        await sp.history.delete(id);
        await loadHistory();
        setFooter('已删除记录');
    };

    async function clearAllHistory() {
        if (!confirm('确定要清空所有历史记录吗？此操作不可撤销。')) return;
        await sp.history.clear();
        await loadHistory();
        setFooter('已清空所有历史记录');
    }

    // ===== 工具函数 =====
    function setFooter(text) {
        els.footerText.textContent = text;
    }

    function formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return minutes + ' 分钟前';
        if (hours < 24) return hours + ' 小时前';
        if (days < 7) return days + ' 天前';

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d} ${h}:${min}`;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // ===== 设置 =====
    async function loadSettings() {
        try {
            const autoLaunch = await sp.app.getAutoLaunch();
            els.autoLaunchToggle.checked = autoLaunch;
        } catch (err) {}

        const minimize = localStorage.getItem('minimizeToTray');
        if (minimize !== null) {
            els.minimizeToggle.checked = minimize === 'true';
        }
    }

    async function setAutoLaunch(enabled) {
        try {
            await sp.app.setAutoLaunch(enabled);
            setFooter(enabled ? '已开启开机自启' : '已关闭开机自启');
        } catch (err) {
            setFooter('设置失败: ' + err.message);
        }
    }

    async function loadAppInfo() {
        try {
            const info = await sp.app.getInfo();
            els.appVersion.textContent = 'v' + info.version;
            els.aboutVersion.textContent = info.version;
        } catch (err) {}
    }

    // ===== 依赖信息 =====
    async function loadDependencies() {
        // 显示加载状态
        els.depRuntime.innerHTML = '<div class="dep-loading">加载中...</div>';
        els.depPandoc.innerHTML = '<div class="dep-loading">加载中...</div>';
        els.depSystem.innerHTML = '<div class="dep-loading">加载中...</div>';
        els.depNpm.innerHTML = '<div class="dep-loading">加载中...</div>';

        try {
            const data = await sp.app.getDependencies();

            // 运行环境
            const r = data.runtime;
            els.depRuntime.innerHTML = `
                <div class="dep-row dep-row-head"><span class="dep-name">组件</span><span class="dep-version">版本</span><span class="dep-status">状态</span></div>
                <div class="dep-row"><span class="dep-name">Electron</span><span class="dep-version">${r.version}</span><span class="dep-status"><span class="dep-badge ok">运行中</span></span></div>
                <div class="dep-row"><span class="dep-name">Node.js</span><span class="dep-version">${r.node}</span><span class="dep-status"><span class="dep-badge ok">运行中</span></span></div>
                <div class="dep-row"><span class="dep-name">Chromium</span><span class="dep-version">${r.chromium}</span><span class="dep-status"><span class="dep-badge ok">运行中</span></span></div>
                <div class="dep-row"><span class="dep-name">架构</span><span class="dep-version">${r.arch}</span><span class="dep-status"></span></div>
                <div class="dep-row"><span class="dep-name">平台</span><span class="dep-version">${r.platform}</span><span class="dep-status"></span></div>
            `;

            // Pandoc
            const p = data.pandoc;
            const pStatus = p.version === '未安装' || p.version === '检测失败' ? 'miss' : 'ok';
            const pLabel = pStatus === 'ok' ? '已安装' : '缺失';
            els.depPandoc.innerHTML = `
                <div class="dep-row dep-row-head"><span class="dep-name">项目</span><span class="dep-version">值</span><span class="dep-status">状态</span></div>
                <div class="dep-row"><span class="dep-name">版本</span><span class="dep-version">${p.version}</span><span class="dep-status"><span class="dep-badge ${pStatus}">${pLabel}</span></span></div>
                <div class="dep-row"><span class="dep-name">路径</span><span class="dep-version" style="width:auto;flex:1;text-align:left;word-break:break-all;font-size:11px;">${escapeHtml(p.path)}</span><span class="dep-status"></span></div>
            `;

            // 系统信息
            const s = data.system;
            els.depSystem.innerHTML = `
                <div class="dep-row dep-row-head"><span class="dep-name">项目</span><span class="dep-version">值</span><span class="dep-status"></span></div>
                <div class="dep-row"><span class="dep-name">操作系统版本</span><span class="dep-version" style="width:auto;flex:1;text-align:left;">${s.os}</span><span class="dep-status"></span></div>
                <div class="dep-row"><span class="dep-name">总内存</span><span class="dep-version" style="width:auto;flex:1;text-align:left;">${s.totalMemory}</span><span class="dep-status"></span></div>
            `;

            // NPM 包
            if (data.npm.length === 0) {
                els.depNpm.innerHTML = '<div class="dep-loading">无依赖包</div>';
            } else {
                const rows = data.npm.map(item => {
                    const isInstalled = item.installed !== '-';
                    const isDev = item.type === 'devDependency';
                    let badge;
                    if (!isInstalled) {
                        badge = '<span class="dep-badge miss">未安装</span>';
                    } else if (isDev) {
                        badge = '<span class="dep-badge dev">dev</span>';
                    } else {
                        badge = '<span class="dep-badge ok">已安装</span>';
                    }
                    return `
                        <div class="dep-row">
                            <span class="dep-name">${escapeHtml(item.name)}</span>
                            <span class="dep-version">${item.required} → ${item.installed}</span>
                            <span class="dep-status">${badge}</span>
                        </div>
                    `;
                }).join('');

                els.depNpm.innerHTML = `
                    <div class="dep-row dep-row-head"><span class="dep-name">包名</span><span class="dep-version">要求 → 已安装</span><span class="dep-status">状态</span></div>
                    ${rows}
                `;
            }

            setFooter('依赖信息已加载');
        } catch (err) {
            const errHtml = '<div class="dep-loading">加载失败: ' + escapeHtml(err.message) + '</div>';
            els.depRuntime.innerHTML = errHtml;
            els.depPandoc.innerHTML = errHtml;
            els.depSystem.innerHTML = errHtml;
            els.depNpm.innerHTML = errHtml;
            setFooter('加载依赖信息失败');
        }
    }

    // ===== 字体设置 =====
    async function loadFontSettings() {
        try {
            const settings = await sp.font.getSettings();
            cachedFontSettings = settings;
            applyFontSettingsToUI(settings);
        } catch (err) {
            setFooter('加载字体设置失败');
        }
    }

    function applyFontSettingsToUI(settings) {
        els.fontEnabledToggle.checked = settings.enabled;
        els.fontSettingsBody.classList.toggle('disabled', !settings.enabled);
        els.fontFamilySelect.value = settings.fontFamily || '宋体';
        els.fontFamilyEnSelect.value = settings.fontFamilyEn || 'Times New Roman';
        els.bodySizeInput.value = settings.bodySize || 12;
        els.h1SizeInput.value = settings.h1Size || 22;
        els.h2SizeInput.value = settings.h2Size || 16;
        els.h3SizeInput.value = settings.h3Size || 14;
        els.h4SizeInput.value = settings.h4Size || 13;
        els.h5SizeInput.value = settings.h5Size || 12;
        els.h6SizeInput.value = settings.h6Size || 12;
    }

    function collectFontSettings() {
        return {
            enabled: els.fontEnabledToggle.checked,
            fontFamily: els.fontFamilySelect.value,
            fontFamilyEn: els.fontFamilyEnSelect.value,
            bodySize: parseInt(els.bodySizeInput.value) || 12,
            h1Size: parseInt(els.h1SizeInput.value) || 22,
            h2Size: parseInt(els.h2SizeInput.value) || 16,
            h3Size: parseInt(els.h3SizeInput.value) || 14,
            h4Size: parseInt(els.h4SizeInput.value) || 13,
            h5Size: parseInt(els.h5SizeInput.value) || 12,
            h6Size: parseInt(els.h6SizeInput.value) || 12,
        };
    }

    async function saveFontSettings() {
        const settings = collectFontSettings();
        const result = await sp.font.saveSettings(settings);
        if (result.success) {
            cachedFontSettings = settings;
            setFooter('字体设置已保存');
        } else {
            setFooter('保存失败: ' + (result.error || '未知错误'));
        }
    }

    async function resetFontSettings() {
        if (!confirm('确定恢复默认字体设置吗？')) return;
        const result = await sp.font.resetSettings();
        if (result.success) {
            cachedFontSettings = result.settings;
            applyFontSettingsToUI(result.settings);
            setFooter('已恢复默认字体设置');
        } else {
            setFooter('重置失败: ' + (result.error || '未知错误'));
        }
    }

    function getFontSettingsForConversion() {
        return cachedFontSettings;
    }

    // ===== 事件绑定 =====
    function bindEvents() {
        // 侧边栏导航
        els.navItems.forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });

        // 文件上传
        els.uploadZone.addEventListener('click', openFilePicker);
        els.fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            loadFileContent(text, file.name);
        });

        // 拖拽
        setupDragDrop();

        // 转换
        els.btnConvert.addEventListener('click', convertToWord);
        els.btnClear.addEventListener('click', clearInput);
        els.optionsToggle.addEventListener('click', toggleOptions);
        els.markdownInput.addEventListener('input', updateCharCount);

        // 快捷键 Ctrl+Enter
        els.markdownInput.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                convertToWord();
            }
        });

        // 历史
        els.btnClearHistory.addEventListener('click', clearAllHistory);

        // Pandoc
        els.btnCheckPandoc.addEventListener('click', checkPandoc);
        els.btnInstallPandoc.addEventListener('click', () => {
            sp.shell.openExternal('https://pandoc.org/installing.html');
        });

        // 设置
        els.autoLaunchToggle.addEventListener('change', (e) => setAutoLaunch(e.target.checked));
        els.minimizeToggle.addEventListener('change', (e) => {
            localStorage.setItem('minimizeToTray', e.target.checked);
        });
        els.btnRefreshDeps.addEventListener('click', loadDependencies);

        // 字体设置
        els.fontEnabledToggle.addEventListener('change', (e) => {
            els.fontSettingsBody.classList.toggle('disabled', !e.target.checked);
        });
        els.btnSaveFontSettings.addEventListener('click', saveFontSettings);
        els.btnResetFontSettings.addEventListener('click', resetFontSettings);
    }

    // ===== 初始化 =====
    async function init() {
        bindEvents();
        await loadSettings();
        await loadAppInfo();
        await loadFontSettings();
        await checkPandoc();
        setFooter('就绪');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
