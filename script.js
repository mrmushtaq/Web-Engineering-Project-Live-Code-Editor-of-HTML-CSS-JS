// ===== DEFAULT CODE TEMPLATES =====
const defaultHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Code Play Editor</title>
</head>
<body>
    <div class="container">
        <h1>Welcome to CodePlay!</h1>
        <p>Edit this code and see the changes in real-time.</p>
        <p><strong>This project is created by Mushtaque Ali, Ibrar Ali and Saqib Hussain</strong></p>
        <div id="output"></div>
    </div>
</body>
</html>`;

const defaultCSS = `body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    margin: 0;
    padding: 20px;
    min-height: 100vh;
    color: white;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    padding: 40px 20px;
}

h1 {
    font-size: 2.5rem;
    margin-bottom: 20px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

p {
    font-size: 1.2rem;
    margin-bottom: 20px;
    opacity: 0.9;
}

strong {
    color: #ffd700;
    font-weight: 700;
}

#output {
    margin-top: 30px;
    padding: 20px;
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
    backdrop-filter: blur(10px);
}`;

const defaultJS = `// Write your JavaScript code here
document.addEventListener('DOMContentLoaded', function() {
    const output = document.getElementById('output');
    if (output) {
        output.innerHTML = '<h3>✨ Start coding to see the magic happen!</h3><p>Try editing the HTML, CSS, or JavaScript files.</p>';
    }
});`;

// ===== GLOBAL VARIABLES =====
let htmlEditor, cssEditor, jsEditor;
let currentTheme = 'monokai';
let currentFontSize = '14';
let autoSaveTimer;
let errorCount = 0;
let warningCount = 0;
let hasUnsavedChanges = false;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeEditors();
    loadFromURL();
    setupEventListeners();
});

// ===== EDITOR INITIALIZATION =====
function initializeEditors() {
    htmlEditor = CodeMirror.fromTextArea(document.getElementById('htmlEditor'), {
        mode: 'xml',
        theme: currentTheme,
        lineNumbers: true,
        autoCloseTags: true,
        matchTags: true,
        lineWrapping: true,
        extraKeys: { 
            "Ctrl-S": saveCode, 
            "Cmd-S": saveCode, 
            "Ctrl-Enter": runCode, 
            "Cmd-Enter": runCode 
        }
    });

    cssEditor = CodeMirror.fromTextArea(document.getElementById('cssEditor'), {
        mode: 'css', theme: currentTheme, lineNumbers: true, autoCloseBrackets: true, matchBrackets: true, lineWrapping: true
    });

    jsEditor = CodeMirror.fromTextArea(document.getElementById('jsEditor'), {
        mode: 'javascript', theme: currentTheme, lineNumbers: true, autoCloseBrackets: true, matchBrackets: true, lineWrapping: true
    });

    htmlEditor.setValue(defaultHTML);
    cssEditor.setValue(defaultCSS);
    jsEditor.setValue(defaultJS);

    showEditor('html');
    setTimeout(runCode, 100);

    [htmlEditor, cssEditor, jsEditor].forEach(editor => {
        editor.on('change', () => {
            hasUnsavedChanges = true;
            updateSaveStatus();
            debounceRun();
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(autoSave, 500);
        });

        editor.on('cursorActivity', () => updateCursorPosition(editor));
    });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {

    document.querySelectorAll('.tab').forEach(tab => 
        tab.addEventListener('click', () => showEditor(tab.dataset.tab))
    );

    document.getElementById('runBtn').addEventListener('click', runCode);
    document.getElementById('saveBtn').addEventListener('click', saveCode);
    document.getElementById('resetBtn').addEventListener('click', resetCode);

    document.getElementById('themeSelector').addEventListener('change', function() {
        currentTheme = this.value;
        [htmlEditor, cssEditor, jsEditor].forEach(editor => editor.setOption('theme', currentTheme));
    });

    document.getElementById('fontSizeSelector').addEventListener('change', function() {
        currentFontSize = this.value;
        updateEditorFontSize();
    });

    document.getElementById('clearConsoleBtn').addEventListener('click', hardRefresh);

    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes.';
        }
    });

    window.updateConsole = updateConsole;


    // SHARE
    document.getElementById('shareBtn').addEventListener('click', shareCode);
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('shareModal').classList.remove('active')
    });
    document.getElementById('copyUrlBtn').addEventListener('click', copyShareUrl);

    document.querySelectorAll('.share-btn').forEach(btn => 
        btn.addEventListener('click', shareToPlatform)
    );
}

// ===== SHOW EDITOR =====
function showEditor(language) {
    htmlEditor.getWrapperElement().style.display = 'none';
    cssEditor.getWrapperElement().style.display = 'none';
    jsEditor.getWrapperElement().style.display = 'none';

    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

    let editor;
    if (language === 'html') {
        editor = htmlEditor;
    } else if (language === 'css') {
        editor = cssEditor;
    } else {
        editor = jsEditor;
    }

    editor.getWrapperElement().style.display = 'block';
    document.querySelector(`[data-tab="${language}"]`).classList.add('active');

    setTimeout(() => {
        editor.refresh();
        updateCursorPosition(editor);
    }, 10);
}

// ===== UPDATE FONT SIZE =====
function updateEditorFontSize() {
    [htmlEditor, cssEditor, jsEditor].forEach(editor => {
        editor.getWrapperElement().style.fontSize = currentFontSize + 'px';
        editor.refresh();
    });
}

// ===== UPDATE CURSOR =====
function updateCursorPosition(editor) {
    const cursor = editor.getCursor();
    document.getElementById('lineCount').textContent = `Line ${cursor.line + 1}, Column ${cursor.ch + 1}`;
}

// ===== RUN CODE =====
function runCode() {
    const html = htmlEditor.getValue();
    const css = cssEditor.getValue();
    const js = jsEditor.getValue();
    
    const previewFrame = document.getElementById('previewFrame');
    const consoleContent = document.getElementById('consoleContent');

    errorCount = 0;
    warningCount = 0;
    updateConsoleCounts();
    consoleContent.innerHTML = '';

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Preview</title>
    <style>${css}</style>
</head>
<body>
    ${html}
    <script>
        (function() {
            const consoleMethods = ['log', 'error', 'warn', 'info'];
            const originalConsole = {};
            
            consoleMethods.forEach(method => {
                originalConsole[method] = console[method];
                console[method] = function(...args) {
                    originalConsole[method].apply(console, args);
                    const message = args.map(arg => JSON.stringify(arg) || String(arg)).join(' ');
                    if (window.parent.updateConsole) {
                        window.parent.updateConsole(method, message);
                    }
                };
            });

            window.addEventListener('error', e => {
                if (window.parent.updateConsole) window.parent.updateConsole('error', e.message);
            });

            window.addEventListener('unhandledrejection', e => {
                if (window.parent.updateConsole) window.parent.updateConsole('error', 'Promise Rejection: ' + e.reason);
            });
        })();
    <\/script>
    <script>
        try { ${js} }
        catch (error) {
            console.error('Runtime Error:', error.toString());
            console.error('Stack:', error.stack);
        }
    <\/script>
</body>
</html>`;

    try {
        const previewDoc = previewFrame.contentDocument;
        previewDoc.open();
        previewDoc.write(fullHTML);
        previewDoc.close();
        updateStatus('Code executed successfully');
    } catch (e) {
        updateConsole('error', 'Failed to render: ' + e.toString());
    }
}

// ===== CONSOLE FUNCTIONS =====

// ===== HARD REFRESH =====
function hardRefresh() {
    const previewFrame = document.getElementById('previewFrame');
    const previewDocument = previewFrame.contentDocument || previewFrame.contentWindow.document;
    previewDocument.open(); previewDocument.write("<html><body></body></html>"); previewDocument.close();
    updateStatus('Editor completely refreshed');
}


function updateConsole(type, message) {
    const el = document.getElementById('consoleContent');
    const div = document.createElement('div');
    div.className = `console-line console-${type}`;
    div.textContent = `[${type.toUpperCase()}] ${message}`;
    el.appendChild(div);

    if (type === 'error') errorCount++;
    if (type === 'warn') warningCount++;
    updateConsoleCounts();

    el.scrollTop = el.scrollHeight;
}

function updateConsoleCounts() {
    const e = document.getElementById('consoleErrorCount');
    const w = document.getElementById('consoleWarningCount');

    e.textContent = errorCount ? `${errorCount} errors` : '';
    w.textContent = warningCount ? `${warningCount} warnings` : '';

    e.style.display = errorCount ? 'inline-block' : 'none';
    w.style.display = warningCount ? 'inline-block' : 'none';
}


// ===== SAVE / LOAD =====
function saveCode() {
    const zip = new JSZip();
    zip.file("index.html", htmlEditor.getValue());
    zip.file("style.css", cssEditor.getValue());
    zip.file("script.js", jsEditor.getValue());
    zip.generateAsync({type:"blob"}).then(content=>{
        const a=document.createElement("a");
        const url=URL.createObjectURL(content);
        a.href=url;
        a.download="codeplay-project.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        hasUnsavedChanges=false;
        updateSaveStatus();
        updateStatus("Saved as ZIP");
    });
}

function resetCode() {
    if (!confirm('Reset code to default?')) return;
    htmlEditor.setValue(defaultHTML);
    cssEditor.setValue(defaultCSS);
    jsEditor.setValue(defaultJS);
    runCode();
}

function autoSave() {
    const data = {
        html: htmlEditor.getValue(),
        css: cssEditor.getValue(),
        js: jsEditor.getValue()
    };
    localStorage.setItem('codeplay-autosave', JSON.stringify(data));
    updateSaveStatus('Auto-saved');
}

function loadAutoSave() {
    const saved = localStorage.getItem('codeplay-autosave');
    if (saved) {
        const data = JSON.parse(saved);
        htmlEditor.setValue(data.html);
        cssEditor.setValue(data.css);
        jsEditor.setValue(data.js);
        runCode();
    }
}

// ===== SHARE FUNCTIONALITY =====
document.getElementById('shareBtn').addEventListener('click', shareCode);

document.querySelectorAll(".share-btn").forEach(btn => {
    btn.addEventListener("click", shareToPlatform);
});

// ==== Copy Button =====
document.getElementById("copyUrlBtn").addEventListener("click", copyShareUrl);

// ==== Close Button ====
document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("shareModal").classList.remove("active");
});


function shareCode() {
    const codeData = {html: htmlEditor.getValue(), css: cssEditor.getValue(), js: jsEditor.getValue(), version:'2.0'};
    try {
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(codeData))));

        const url = `${window.location.origin}${window.location.pathname}?code=${encoded}`;
        const shareModal = document.getElementById('shareModal');
        const shareUrlInput = document.getElementById('shareUrl');
        shareUrlInput.value = url;
        shareModal.classList.add('active');
        updateStatus('Share your code with others!');
    } catch(e){ updateStatus('Error generating share URL'); }
}

function copyShareUrl() {
    const shareUrl = document.getElementById('shareUrl');
    navigator.clipboard.writeText(shareUrl.value)
        .then(() => { updateStatus('URL copied to clipboard!'); document.getElementById('shareModal').classList.remove('active'); })
        .catch(() => { updateStatus('Failed to copy URL.'); });
}

function shareToPlatform(e) {
    const platform = e.currentTarget.dataset.platform;
    const url = document.getElementById('shareUrl').value;
    const shareUrl = getShareUrl(platform,url);

    if(platform==='email') window.location.href=shareUrl;
    else if(platform==='github') navigator.clipboard.writeText(url).then(()=>updateStatus('URL copied for GitHub!'));
    else window.open(shareUrl,'_blank','width=600,height=400');

    setTimeout(()=>document.getElementById('shareModal').classList.remove('active'),500);
}

function getShareUrl(platform,url,title='Check out this code I created with CodePlay!') {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const platforms = {
        twitter:`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        linkedin:`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        email:`mailto:?subject=${encodedTitle}&body=Check out this code: ${encodedUrl}`,
        github:`https://www.github.com/`
    };
    return platforms[platform] || url;
}

// ===== Update Status =====
function updateStatus(message) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    setTimeout(()=>{ statusEl.textContent='Ready - CodePlay Live Editor v2.0'; },1000);
}

function updateSaveStatus(message='') {
    const saveStatusEl = document.getElementById('saveStatus');
    if(message){ saveStatusEl.textContent=message; setTimeout(()=>updateSaveStatus(),500); }
    else saveStatusEl.textContent = hasUnsavedChanges?'Unsaved changes':'All changes saved';
}

// ===== DEBOUNCE =====
let debounceTimer;
function debounceRun() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runCode, 500);
}

// ===== URL LOADER =====
function loadFromURL() {
    const p = new URLSearchParams(location.search);
    const code = p.get("code");
    if (code) {
        try {
            const data = JSON.parse(atob(code));
            htmlEditor.setValue(data.html || defaultHTML);
            cssEditor.setValue(data.css || defaultCSS);
            jsEditor.setValue(data.js || defaultJS);
            runCode();
            updateStatus("Loaded from URL");
        } catch {
            updateStatus("Invalid shared code");
        }
    }
}