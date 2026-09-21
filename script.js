// API key TIDAK lagi ditaruh di sini. Semua request AI dikirim ke
// proxy (Cloudflare Worker) yang menyimpan key secara aman di server.
// Ganti URL di bawah dengan URL Worker milikmu setelah deploy.
const PROXY_URL = "https://magalismifta.kkontyaht.workers.dev";

// Elements
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const userDisplayName = document.getElementById('userDisplayName');
const logoutBtn = document.getElementById('logoutBtn');
const themeSelect = document.getElementById('themeSelect');

const openBgSettingsBtn = document.getElementById('openBgSettingsBtn');
const closeBgSettingsBtn = document.getElementById('closeBgSettingsBtn');
const bgSettingsPanel = document.getElementById('bgSettingsPanel');
const animTypeSelect = document.getElementById('animTypeSelect');
const animSpeed = document.getElementById('animSpeed');
const animCount = document.getElementById('animCount');
const speedVal = document.getElementById('speedVal');
const countVal = document.getElementById('countVal');
const bgImageInput = document.getElementById('bgImageInput');
const removeCustomBg = document.getElementById('removeCustomBg');
const presetControls = document.getElementById('presetControls');
const customBgControls = document.getElementById('customBgControls');

const carImageInput = document.getElementById('carImageInput');
const fileLabel = document.getElementById('fileLabel');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const carImagePreview = document.getElementById('carImagePreview');
const removeImage = document.getElementById('removeImage');

const form = document.getElementById('diagForm');
const loading = document.getElementById('loading');
const result = document.getElementById('result');
const aiOutput = document.getElementById('aiOutput');
const saveResultBtn = document.getElementById('saveResultBtn');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

let currentImageData = null;
let lastAnalysisResult = '';

// --- ANIMATION ENGINE (INTERACTIVE GRID) ---
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
const customBgImage = document.getElementById('customBgImage');

let mouse = { x: null, y: null, radius: 120 };
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

let animConfig = JSON.parse(localStorage.getItem('autodiag_anim_config')) || {
    type: 'grid',
    speed: 1,
    count: 50,
    customImage: null
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let items = [];

function initAnimation() {
    items = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (animConfig.type === 'custom' && animConfig.customImage) {
        canvas.style.display = 'none';
        customBgImage.style.display = 'block';
        customBgImage.style.backgroundImage = `url(${animConfig.customImage})`;
        return;
    }

    canvas.style.display = 'block';
    customBgImage.style.display = 'none';

    for (let i = 0; i < animConfig.count; i++) {
        items.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * animConfig.speed,
            vy: (Math.random() - 0.5) * animConfig.speed,
            size: Math.random() * 2 + 1
        });
    }
}

let gridOffset = 0;
function renderAnimation() {
    if (animConfig.type !== 'custom') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (animConfig.type === 'grid') {
            gridOffset += 0.5 * animConfig.speed;
            if (gridOffset > 40) gridOffset = 0;

            const gridSize = 40;
            ctx.strokeStyle = 'rgba(0, 255, 204, 0.05)';
            ctx.lineWidth = 1;

            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = gridOffset; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Glow on mouse hover
            if (mouse.x && mouse.y) {
                let gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, mouse.radius);
                gradient.addColorStop(0, 'rgba(0, 255, 204, 0.15)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        } else if (animConfig.type === 'particles') {
            for (let p of items) {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
                ctx.fill();
            }
        } else if (animConfig.type === 'stars') {
            for (let p of items) {
                p.y -= p.vy * 0.5;
                if (p.y < 0) p.y = canvas.height;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fill();
            }
        }
    }
    requestAnimationFrame(renderAnimation);
}

// Control Event Listeners
openBgSettingsBtn.addEventListener('click', () => bgSettingsPanel.classList.toggle('hidden'));
closeBgSettingsBtn.addEventListener('click', () => bgSettingsPanel.classList.add('hidden'));

animTypeSelect.addEventListener('change', (e) => {
    animConfig.type = e.target.value;
    updateUIControls();
    saveAnimConfig();
});

animSpeed.addEventListener('input', (e) => {
    animConfig.speed = parseFloat(e.target.value);
    speedVal.textContent = animConfig.speed;
    initAnimation();
    saveAnimConfig();
});

animCount.addEventListener('input', (e) => {
    animConfig.count = parseInt(e.target.value);
    countVal.textContent = animConfig.count;
    initAnimation();
    saveAnimConfig();
});

bgImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            animConfig.customImage = event.target.result;
            animConfig.type = 'custom';
            animTypeSelect.value = 'custom';
            updateUIControls();
            saveAnimConfig();
        };
        reader.readAsDataURL(file);
    }
});

removeCustomBg.addEventListener('click', () => {
    animConfig.customImage = null;
    animConfig.type = 'grid';
    animTypeSelect.value = 'grid';
    updateUIControls();
    saveAnimConfig();
});

function updateUIControls() {
    animTypeSelect.value = animConfig.type;
    animSpeed.value = animConfig.speed;
    animCount.value = animConfig.count;
    speedVal.textContent = animConfig.speed;
    countVal.textContent = animConfig.count;

    if (animConfig.type === 'custom') {
        presetControls.classList.add('hidden');
        customBgControls.classList.remove('hidden');
    } else {
        presetControls.classList.remove('hidden');
        customBgControls.classList.add('hidden');
    }
    initAnimation();
}

function saveAnimConfig() {
    localStorage.setItem('autodiag_anim_config', JSON.stringify(animConfig));
}

updateUIControls();
renderAnimation();

// --- AUTHENTICATION ---
function checkAuth() {
    const user = localStorage.getItem('autodiag_user');
    if (!user) {
        loginModal.classList.remove('hidden');
    } else {
        loginModal.classList.add('hidden');
        userDisplayName.textContent = user;
    }
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = usernameInput.value.trim();
    if (user) {
        localStorage.setItem('autodiag_user', user);
        checkAuth();
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('autodiag_user');
    checkAuth();
});

// --- THEME SWITCHER ---
themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('autodiag_theme', theme);
});

const savedTheme = localStorage.getItem('autodiag_theme') || 'cyber';
themeSelect.value = savedTheme;
document.body.setAttribute('data-theme', savedTheme);

// --- IMAGE UPLOAD & PREVIEW ---
carImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            currentImageData = event.target.result;
            carImagePreview.src = currentImageData;
            imagePreviewContainer.classList.remove('hidden');
            fileLabel.textContent = file.name;
        };
        reader.readAsDataURL(file);
    }
});

removeImage.addEventListener('click', () => {
    currentImageData = null;
    carImageInput.value = '';
    carImagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
    fileLabel.textContent = '📷 Pilih foto mobil...';
});

// --- AI API CALL ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const carModel = document.getElementById('carModel').value;
    const symptoms = document.getElementById('symptoms').value;

    loading.classList.remove('hidden');
    result.classList.add('hidden');

    try {
        // Prompt sekarang dibangun di server (Worker), di sini kita
        // cukup kirim data mentahnya saja.
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ carModel, symptoms })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memanggil AI");

        lastAnalysisResult = data.result;
        aiOutput.innerText = lastAnalysisResult;
        result.classList.remove('hidden');
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        loading.classList.add('hidden');
    }
});

// --- RIWAYAT ---
saveResultBtn.addEventListener('click', () => {
    const carModel = document.getElementById('carModel').value;
    const symptoms = document.getElementById('symptoms').value;
    if (!lastAnalysisResult) return;

    const item = {
        id: Date.now(),
        carModel,
        symptoms,
        image: currentImageData,
        result: lastAnalysisResult,
        date: new Date().toLocaleDateString('id-ID')
    };

    let histories = JSON.parse(localStorage.getItem('autodiag_histories') || '[]');
    histories.unshift(item);
    localStorage.setItem('autodiag_histories', JSON.stringify(histories));
    
    loadHistories();
    alert('Riwayat berhasil disimpan.');
});

function loadHistories() {
    const histories = JSON.parse(localStorage.getItem('autodiag_histories') || '[]');
    if (histories.length === 0) {
        historyList.innerHTML = `<p class="empty-state">Belum ada riwayat tersimpan.</p>`;
        return;
    }

    historyList.innerHTML = '';
    histories.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-card';
        div.innerHTML = `
            <strong>${item.carModel}</strong> <small>(${item.date})</small>
            ${item.image ? `<img src="${item.image}">` : ''}
            <p style="margin-top:4px; color: var(--text-muted);">${item.symptoms}</p>
            <div class="history-card-actions">
                <button onclick="viewHistory(${item.id})" class="btn btn-primary" style="padding:4px 8px; font-size:0.75rem;">Buka</button>
                <button onclick="deleteHistory(${item.id})" class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem;">Hapus</button>
            </div>
        `;
        historyList.appendChild(div);
    });
}

window.viewHistory = function(id) {
    const histories = JSON.parse(localStorage.getItem('autodiag_histories') || '[]');
    const item = histories.find(h => h.id === id);
    if (item) {
        document.getElementById('carModel').value = item.carModel;
        document.getElementById('symptoms').value = item.symptoms;
        aiOutput.innerText = item.result;
        lastAnalysisResult = item.result;
        result.classList.remove('hidden');
        if (item.image) {
            currentImageData = item.image;
            carImagePreview.src = item.image;
            imagePreviewContainer.classList.remove('hidden');
            fileLabel.textContent = "Foto Tersimpan";
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.deleteHistory = function(id) {
    let histories = JSON.parse(localStorage.getItem('autodiag_histories') || '[]');
    histories = histories.filter(h => h.id !== id);
    localStorage.setItem('autodiag_histories', JSON.stringify(histories));
    loadHistories();
};

clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Hapus seluruh riwayat tersimpan?')) {
        localStorage.removeItem('autodiag_histories');
        loadHistories();
    }
});

// Init
checkAuth();
loadHistories();
