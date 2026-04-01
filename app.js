// --- Constants & State ---
const BUDGET_LIMIT = 200000;
const CAFETERIA_PRICE = 7770;

let state = {
    userId: localStorage.getItem('meal_tracker_userid') || '',
    userName: localStorage.getItem('meal_tracker_username') || '',
    currentDate: new Date(),
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    mealData: {},
    history: { cards: [], places: [] }
};

// --- DOM Elements ---
const loginOverlay = document.getElementById('login-overlay');
const mainApp = document.getElementById('main-app');
const userIdInput = document.getElementById('user-id-input');
const loginBtn = document.getElementById('login-btn');
const welcomeMsg = document.getElementById('welcome-msg');
const todayDisplayEl = document.getElementById('today-display');

const calendarGrid = document.querySelector('.calendar-grid');
const monthDisplay = document.getElementById('current-month-display');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

const logoutBtn = document.getElementById('logout-btn');
const resetMonthBtn = document.getElementById('reset-month-btn');
const showStatsBtn = document.getElementById('show-stats-btn');

const actionModal = document.getElementById('action-modal');
const modalDateDisplay = document.getElementById('modal-date-display');
const actionGridMain = document.getElementById('action-grid-main');
const outingInputSection = document.getElementById('outing-input-section');
const priceInput = document.getElementById('price-input');
const placeInput = document.getElementById('place-input');
const cardInput = document.getElementById('card-input');
const timeBtns = document.querySelectorAll('.time-btn');
const modalSaveOutingBtn = document.getElementById('modal-save-outing');
const modalCloseBtn = document.getElementById('modal-close');
const modalDeleteBtn = document.getElementById('modal-delete');

const placeDropdown = document.getElementById('place-dropdown');
const cardDropdown = document.getElementById('card-dropdown');
const manageHistoryBtn = document.getElementById('manage-history-btn');

const historyModal = document.getElementById('history-modal');
const historyModalClose = document.getElementById('history-modal-close');
const cardHistoryList = document.getElementById('card-history-list');
const placeHistoryList = document.getElementById('place-history-list');
const receiptNameInput = document.getElementById('receipt-name-input');
const saveReceiptNameBtn = document.getElementById('save-receipt-name-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const importJsonBtn = document.getElementById('import-json-btn');
const importFileInput = document.getElementById('import-file-input');

const statsModal = document.getElementById('stats-modal');
const statsModalClose = document.getElementById('stats-modal-close');
const statsListBody = document.getElementById('stats-list-body');

const totalSpentEl = document.getElementById('total-spent');
const totalRemainingEl = document.getElementById('total-remaining');

const showReimbursementBtn = document.getElementById('show-reimbursement-btn');
const reimbursementModal = document.getElementById('reimbursement-modal');
const reimbursementModalClose = document.getElementById('reimbursement-modal-close');
const reimbursementListBody = document.getElementById('reimbursement-list-body');
const reimbursementTotalEl = document.getElementById('reimbursement-total');
const reimbursementTitleEl = document.getElementById('reimbursement-title');
const emailReimbursementBtn = document.getElementById('email-reimbursement-btn');

const totalReimbursementEl = document.getElementById('total-reimbursement');
const usagePercentEl = document.getElementById('usage-percent');
const budgetProgress = document.getElementById('budget-progress');

let activeDateKey = null;

// --- Initialization ---
async function init() { if (state.userId) showApp(); }

async function showApp() {
    loginOverlay.classList.add('hidden');
    mainApp.classList.remove('hidden');
    welcomeMsg.textContent = `${state.userId}님, 환영합니다!`;
    await loadUserData();
}

// --- Event Listeners ---
loginBtn.addEventListener('click', async () => {
    const id = userIdInput.value.trim();
    if (id) { state.userId = id; localStorage.setItem('meal_tracker_userid', id); await showApp(); }
    else alert('아이디를 입력해주세요!');
});

logoutBtn.addEventListener('click', () => {
    state.userId = ''; state.mealData = {}; state.history = { cards: [], places: [] };
    localStorage.removeItem('meal_tracker_userid'); window.location.reload();
});

prevMonthBtn.addEventListener('click', () => changeMonth(-1));
nextMonthBtn.addEventListener('click', () => changeMonth(1));

if (showReimbursementBtn) {
    showReimbursementBtn.addEventListener('click', () => {
        if (receiptNameInput) receiptNameInput.value = state.userName;
        renderReimbursementList();
        reimbursementModal.style.display = 'flex';
    });
}
if (reimbursementModalClose) reimbursementModalClose.addEventListener('click', () => reimbursementModal.style.display = 'none');
if (emailReimbursementBtn) emailReimbursementBtn.addEventListener('click', sendReimbursementEmail);

function changeMonth(delta) {
    let d = new Date(state.selectedYear, state.selectedMonth + delta, 1);
    state.selectedMonth = d.getMonth(); state.selectedYear = d.getFullYear();
    renderCalendar(); updateDashboard();
}

resetMonthBtn.addEventListener('click', () => {
    if (confirm('이번 달 기록을 초기화하겠습니까?')) { initializeMonthData(); renderCalendar(); updateDashboard(); }
});

if (showStatsBtn) showStatsBtn.addEventListener('click', () => { renderGlobalStats(); statsModal.style.display = 'flex'; });
if (statsModalClose) statsModalClose.addEventListener('click', () => statsModal.style.display = 'none');
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

function closeModal() { actionModal.style.display = 'none'; activeDateKey = null; }

manageHistoryBtn.addEventListener('click', () => { 
    if (receiptNameInput) receiptNameInput.value = state.userName;
    renderHistoryManagement(); 
    historyModal.style.display = 'flex'; 
});
if (historyModalClose) historyModalClose.addEventListener('click', () => historyModal.style.display = 'none');

if (saveReceiptNameBtn) {
    saveReceiptNameBtn.addEventListener('click', () => {
        const name = receiptNameInput.value.trim();
        if (name) {
            state.userName = name;
            localStorage.setItem('meal_tracker_username', name);
            alert('영수증 파일명이 저장되었습니다.');
        } else {
            alert('이름을 입력해주세요.');
        }
    });
}

document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        if (type === 'toggle-outing') {
            actionGridMain.classList.add('hidden');
            outingInputSection.classList.remove('hidden');
            modalSaveOutingBtn.classList.remove('hidden');
            priceInput.focus();
        } else if (type) {
            saveMeal(activeDateKey, type, type === 'cafeteria' ? CAFETERIA_PRICE : 0);
            closeModal();
        }
    });
});

timeBtns.forEach(btn => btn.addEventListener('click', () => {
    timeBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active');
}));

modalSaveOutingBtn.addEventListener('click', () => {
    const price = parseInt(priceInput.value);
    const place = placeInput.value.trim();
    const card = cardInput.value.trim();
    const time = document.querySelector('.time-btn.active')?.getAttribute('data-time') || 'lunch';
    if (!isNaN(price)) {
        saveMeal(activeDateKey, 'outing', price, place, card, time);
        if (place) { state.history.places = state.history.places.filter(p => p !== place); state.history.places.push(place); }
        if (card) { state.history.cards = state.history.cards.filter(c => c !== card); state.history.cards.push(card); }
        closeModal();
    }
});

modalDeleteBtn.addEventListener('click', () => {
    if (activeDateKey) {
        const [y, m, d] = activeDateKey.split('-').map(Number);
        const dow = new Date(y, m - 1, d).getDay();
        const type = (dow === 0 || dow === 6) ? 'holiday' : 'cafeteria';
        saveMeal(activeDateKey, type, type === 'cafeteria' ? CAFETERIA_PRICE : 0);
        closeModal();
    }
});

// --- Calendar ---
function renderCalendar() {
    ensureMonthInitialized();
    const headers = Array.from(calendarGrid.querySelectorAll('.day-header'));
    calendarGrid.innerHTML = '';
    headers.forEach(h => calendarGrid.appendChild(h));
    monthDisplay.textContent = `${state.selectedYear}년 ${state.selectedMonth + 1}월`;
    const firstDay = new Date(state.selectedYear, state.selectedMonth, 1).getDay();
    const daysInMonth = new Date(state.selectedYear, state.selectedMonth + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) { const e = document.createElement('div'); e.className = 'day empty'; calendarGrid.appendChild(e); }
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day glass-card';
        const dateKey = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayData = state.mealData[dateKey];
        const dayNum = document.createElement('span'); dayNum.textContent = d; dayEl.appendChild(dayNum);
        if (dayData) {
            dayEl.classList.add(dayData.type);
            const priceEl = document.createElement('span');
            priceEl.className = 'price';
            priceEl.textContent = (dayData.price && dayData.price > 0) ? `${dayData.price.toLocaleString()}원` : '';
            dayEl.appendChild(priceEl);
        }
        if (today.getFullYear() === state.selectedYear && today.getMonth() === state.selectedMonth && today.getDate() === d) dayEl.classList.add('today');
        dayEl.onclick = () => handleDayClick(dateKey);
        calendarGrid.appendChild(dayEl);
    }
}

function handleDayClick(dateKey) {
    activeDateKey = dateKey;
    const current = state.mealData[dateKey];
    const [y, m, d] = dateKey.split('-').map(Number);
    modalDateDisplay.textContent = `${m}월 ${d}일 식사 선택`;
    actionGridMain.classList.remove('hidden');
    outingInputSection.classList.add('hidden');
    modalSaveOutingBtn.classList.add('hidden');
    if (current && current.type === 'outing') {
        priceInput.value = current.price || 10000;
        placeInput.value = current.place || '';
        cardInput.value = current.card || '';
        timeBtns.forEach(b => b.getAttribute('data-time') === (current.time || 'lunch') ? b.classList.add('active') : b.classList.remove('active'));
        actionGridMain.classList.add('hidden');
        outingInputSection.classList.remove('hidden');
        modalSaveOutingBtn.classList.remove('hidden');
    } else {
        priceInput.value = 10000; placeInput.value = '';
        cardInput.value = state.history.cards.length > 0 ? state.history.cards[state.history.cards.length - 1] : '';
        timeBtns.forEach(b => b.classList.remove('active'));
        if (timeBtns[0]) timeBtns[0].classList.add('active');
    }
    actionModal.style.display = 'flex';
}

// --- Dropdown / History ---
function setupDropdown(input, dropdown, type) {
    if (!input || !dropdown) return;
    input.onfocus = () => showDropdown(input, dropdown, type, input.value);
    input.onclick = (e) => { e.stopPropagation(); showDropdown(input, dropdown, type, input.value); };
    input.oninput = () => showDropdown(input, dropdown, type, input.value);
}

function showDropdown(input, dropdown, type, filterText = '') {
    const list = state.history[type] || [];
    const filtered = list.filter(item => item.toLowerCase().includes(filterText.toLowerCase()));
    if (!filtered.length) { dropdown.classList.add('hidden'); return; }
    dropdown.innerHTML = '';
    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-item'; div.textContent = item;
        div.onmousedown = (e) => { e.preventDefault(); input.value = item; dropdown.classList.add('hidden'); };
        dropdown.appendChild(div);
    });
    dropdown.classList.remove('hidden');
}

function renderHistoryManagement() {
    cardHistoryList.innerHTML = '';
    state.history.cards.forEach((c, i) => cardHistoryList.appendChild(createHistoryItem(c, 'cards', i)));
    placeHistoryList.innerHTML = '';
    state.history.places.forEach((p, i) => placeHistoryList.appendChild(createHistoryItem(p, 'places', i)));
}

function createHistoryItem(text, type, index) {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:5px;font-size:0.85rem;';
    div.innerHTML = `<span>${text}</span><button style="background:none;border:none;color:#FF4B2B;cursor:pointer;font-size:0.8rem;">삭제</button>`;
    div.querySelector('button').onclick = () => { state.history[type].splice(index, 1); saveUserData(); renderHistoryManagement(); };
    return div;
}

document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.input-group')) {
        if (placeDropdown) placeDropdown.classList.add('hidden');
        if (cardDropdown) cardDropdown.classList.add('hidden');
    }
});

// --- Data ---
async function saveMeal(dateKey, type, price, place = '', card = '', time = 'lunch') {
    state.mealData[dateKey] = { type, price, place, card, time };
    await saveUserData(); renderCalendar(); updateDashboard();
}

async function saveUserData() {
    const key = `meal_data_${state.userId}`;
    const data = { mealData: state.mealData, history: state.history };
    localStorage.setItem(key, JSON.stringify(data));
    if (window.location.protocol === 'file:') return;
    try {
        await fetch(`/api/data?userId=${encodeURIComponent(state.userId)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
    } catch (e) { console.warn('Sync failed'); }
}

async function loadUserData() {
    if (window.location.protocol !== 'file:') {
        try {
            const r = await fetch(`/api/data?userId=${encodeURIComponent(state.userId)}`);
            if (r.ok) { const d = await r.json(); if (d.mealData) { state.mealData = d.mealData; state.history = d.history || { places: [], cards: [] }; } }
        } catch (e) { }
    }
    const saved = localStorage.getItem(`meal_data_${state.userId}`);
    if (saved) { const d = JSON.parse(saved); if (!Object.keys(state.mealData).length) { state.mealData = d.mealData || {}; state.history = d.history || { places: [], cards: [] }; } }
    if (!state.history.places || !state.history.places.length) {
        const p = new Set(), c = new Set();
        Object.values(state.mealData).forEach(m => { if (m.place) p.add(m.place); if (m.card) c.add(m.card); });
        state.history.places = Array.from(p); state.history.cards = Array.from(c);
        if (state.history.places.length) saveUserData();
    }
    renderCalendar(); updateDashboard();
    setupDropdown(placeInput, placeDropdown, 'places');
    setupDropdown(cardInput, cardDropdown, 'cards');
}

function initializeMonthData() {
    const cnt = new Date(state.selectedYear, state.selectedMonth + 1, 0).getDate();
    for (let d = 1; d <= cnt; d++) {
        const key = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dow = new Date(state.selectedYear, state.selectedMonth, d).getDay();
        state.mealData[key] = (dow === 0 || dow === 6) ? { type: 'holiday', price: 0 } : { type: 'cafeteria', price: CAFETERIA_PRICE };
    }
    saveUserData();
}

function ensureMonthInitialized() {
    const prefix = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`;
    if (!Object.keys(state.mealData).some(k => k.startsWith(prefix))) initializeMonthData();
}

function updateDashboard() {
    let spent = 0, reimb = 0;
    Object.keys(state.mealData).forEach(key => {
        const [y, m] = key.split('-').map(Number);
        if (y === state.selectedYear && m === state.selectedMonth + 1) { const d = state.mealData[key]; spent += d.price; if (d.type === 'outing') reimb += d.price; }
    });
    totalSpentEl.textContent = `${spent.toLocaleString()}원`;
    totalRemainingEl.textContent = `${(BUDGET_LIMIT - spent).toLocaleString()}원`;
    totalReimbursementEl.textContent = `${reimb.toLocaleString()}원`;
    const pct = Math.min(100, Math.floor(spent / BUDGET_LIMIT * 100));
    usagePercentEl.textContent = `${pct}%`; budgetProgress.style.width = `${pct}%`;
    const t = new Date();
    todayDisplayEl.textContent = `오늘은 ${t.getMonth() + 1}월 ${t.getDate()}일(${['일', '월', '화', '수', '목', '금', '토'][t.getDay()]})`;
}

function renderReimbursementList() {
    const list = [], year = state.selectedYear, month = state.selectedMonth + 1;
    let total = 0;
    if (reimbursementTitleEl) reimbursementTitleEl.textContent = `${month}월 비용 청구 내역`;
    Object.entries(state.mealData).forEach(([key, data]) => {
        const [y, m, d] = key.split('-').map(Number);
        if (y === year && m === month && data.type === 'outing') {
            list.push({ day: d, date: `${m}/${d}`, place: data.place || '-', card: data.card || '-', price: data.price || 0 });
            total += data.price || 0;
        }
    });
    list.sort((a, b) => a.day - b.day);
    if (reimbursementListBody) {
        reimbursementListBody.innerHTML = list.length ? list.map(item => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:10px;">${item.date}</td>
                <td style="padding:10px;">${item.place}</td>
                <td style="padding:10px;">${item.card}</td>
                <td style="padding:10px;text-align:right;">${item.price.toLocaleString()}원</td>
                <td style="padding:10px;text-align:center;">
                    <label class="btn" style="padding: 4px 8px; font-size: 0.7rem; background: rgba(254, 180, 123, 0.2); border: 1px solid var(--accent); color: white; cursor: pointer;">
                        첨부
                        <input type="file" style="display:none;" accept="image/*" onchange="window.handleReceiptUpload(event, ${year}, ${month}, ${item.day})">
                    </label>
                </td>
            </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#94a3b8;">청구할 내역이 없습니다.</td></tr>';
    }
    if (reimbursementTotalEl) reimbursementTotalEl.textContent = `${total.toLocaleString()}원`;
}

// --- Email: show preview modal first, copy button is fresh user gesture (Android safe) ---
function sendReimbursementEmail() {
    const year = state.selectedYear, month = state.selectedMonth + 1;
    const list = [];
    let outingTotal = 0;
    Object.entries(state.mealData).forEach(([key, data]) => {
        const [y, m, d] = key.split('-').map(Number);
        if (y === year && m === month && data.type === 'outing') {
            list.push({ day: d, place: data.place || '-', price: data.price || 0 });
            outingTotal += data.price || 0;
        }
    });
    list.sort((a, b) => a.day - b.day);

    const cafeteriaCount = Object.entries(state.mealData).filter(([key, data]) => {
        const [y, m] = key.split('-').map(Number);
        return y === year && m === month && data.type === 'cafeteria';
    }).length;

    const cafeteriaTotal = cafeteriaCount * CAFETERIA_PRICE;
    const grandTotal = cafeteriaTotal + outingTotal;
    const summaryLine = `구내: ${cafeteriaCount}회 (${cafeteriaTotal}), 외부: ${list.length}회 (${outingTotal}) 총 ${grandTotal}원 / 예산 ${BUDGET_LIMIT.toLocaleString()}원`;

    // 1. HTML Body for Rich Copy (iPhone/Desktop)
    const rowsHtml = list.map(i => {
        const dateStr = `${String(month).padStart(2, '0')}월 ${String(i.day).padStart(2, '0')}일`;
        return `<tr><td style="border:1px solid #ccc;padding:8px 14px;">${dateStr}</td><td style="border:1px solid #ccc;padding:8px 14px;">${i.place}</td><td style="border:1px solid #ccc;padding:8px 14px;text-align:right;">${i.price.toLocaleString()}원</td></tr>`;
    }).join('');
    const htmlBody = `<div style="background-color:white;color:black;padding:10px;"><p>안녕하세요 본부장님</p><p>${String(month).padStart(2, '0')}월 식대 영수증 보내드립니다.</p><p>감사합니다.</p><p>${summaryLine}</p><br><table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;color:black;"><thead><tr style="background:#f0f0f0;"><th style="border:1px solid #ccc;padding:8px 14px;">날짜</th><th style="border:1px solid #ccc;padding:8px 14px;">식당</th><th style="border:1px solid #ccc;padding:8px 14px;">금액</th></tr></thead><tbody>${rowsHtml}<tr style="background:#f5f5f5;font-weight:bold;"><td style="border:1px solid #ccc;padding:8px 14px;" colspan="2">합계</td><td style="border:1px solid #ccc;padding:8px 14px;text-align:right;">${outingTotal.toLocaleString()}원</td></tr></tbody></table></div>`;

    // 2. Plain Text Body for Fallback (Android/Mobile)
    const plainRows = list.map(i =>
        `${String(month).padStart(2, '0')}월 ${String(i.day).padStart(2, '0')}일\t${i.place}\t${i.price.toLocaleString()}원`
    ).join('\n');
    const plainBody = `안녕하세요 본부장님\n\n${String(month).padStart(2, '0')}월 식대 영수증 보내드립니다.\n\n감사합니다.\n\n${summaryLine}\n\n\n날짜\t식당\t금액\n${plainRows}\n합계\t\t${outingTotal.toLocaleString()}원`;

    const subject = encodeURIComponent(`${month}월 식대 청구`);
    const mailtoUrl = `mailto:ishan@wizvil.com?subject=${subject}`;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const btn = document.getElementById('email-reimbursement-btn');

    const showSuccessFeedback = () => {
        if (!btn) return;
        const orig = btn.textContent;
        btn.textContent = '✅ 복사 완료! 메일에 붙여넣기';
        btn.style.background = '#10b981';
        setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 3000);
    };

    // Unified Rich HTML Copy (Hidden Element method - most compatible for mobile)
    const copyRichHtml = (html, text) => {
        const hiddenDiv = document.createElement('div');
        // Force white background and black text to prevent inheriting dark theme styles during copy
        hiddenDiv.style.cssText = 'position:fixed;left:-9999px;top:0;white-space:pre-wrap;background-color:white;color:black;';
        hiddenDiv.innerHTML = html;
        document.body.appendChild(hiddenDiv);

        // Select the content
        const range = document.createRange();
        range.selectNode(hiddenDiv);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch (e) {
            console.warn('execCommand failed', e);
        }

        // Cleanup
        selection.removeAllRanges();
        document.body.removeChild(hiddenDiv);

        // Modern fallback if exec failed
        if (!ok && navigator.clipboard && navigator.clipboard.write) {
            const data = [new ClipboardItem({
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([text], { type: "text/plain" })
            })];
            navigator.clipboard.write(data);
            ok = true;
        }
        return ok;
    };

    copyRichHtml(htmlBody, plainBody);
    window.location.href = mailtoUrl;
    showSuccessFeedback();
}

function renderGlobalStats() {
    const c = {};
    Object.values(state.mealData).forEach(m => { if (m.type === 'outing' && m.place) c[m.place] = (c[m.place] || 0) + 1; });
    const s = Object.entries(c).sort((a, b) => b[1] - a[1]);
    statsListBody.innerHTML = s.length ? s.map(([p, n], i) => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:12px 10px;color:#FEB47B;font-weight:bold;">${i + 1}위</td>
            <td style="padding:12px 10px;">${p}</td>
            <td style="padding:12px 10px;text-align:right;color:#00B09B;">${n}회</td>
        </tr>`).join('') : '<tr><td colspan="3" style="text-align:center;padding:2rem;color:#94a3b8;">기록 없음</td></tr>';
}

exportJsonBtn.onclick = () => {
    const d = JSON.stringify({ mealData: state.mealData, history: state.history });
    const b = new Blob([d], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'meal_data.json'; a.click();
};
importJsonBtn.onclick = () => importFileInput.click();
importFileInput.onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = (ev) => {
        const d = JSON.parse(ev.target.result);
        state.mealData = d.mealData; state.history = d.history;
        saveUserData(); renderCalendar(); updateDashboard();
    }; r.readAsText(f);
};

init();

window.handleReceiptUpload = function(event, y, m, d) {
    const file = event.target.files[0];
    if (!file) return;

    if (!state.userName) {
        alert('이 목록 상단의 [영수증 자동 변환 다운로드] 설정에 이름을 먼저 입력하고 저장해주세요.');
        event.target.value = '';
        return;
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const yy = String(y);
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const fileName = `${state.userName}-${yy}${mm}${dd}.${ext}`;

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const label = event.target.parentElement;
    label.style.background = '#10b981';
    label.style.borderColor = '#10b981';
    label.innerHTML = `✔️ 완료<input type="file" style="display:none;" accept="image/*" onchange="window.handleReceiptUpload(event, ${y}, ${m}, ${d})">`;
};
