// --- Constants & State ---
const BUDGET_LIMIT = 200000;
const CAFETERIA_PRICE = 7770;

let state = {
    userId: localStorage.getItem('meal_tracker_userid') || '',
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
const exportJsonBtn = document.getElementById('export-json-btn');
const importJsonBtn = document.getElementById('import-json-btn');
const importFileInput = document.getElementById('import-file-input');

const statsModal = document.getElementById('stats-modal');
const statsModalClose = document.getElementById('stats-modal-close');
const statsListBody = document.getElementById('stats-list-body');

const totalSpentEl = document.getElementById('total-spent');
const totalRemainingEl = document.getElementById('total-remaining');
const totalReimbursementEl = document.getElementById('total-reimbursement');
const usagePercentEl = document.getElementById('usage-percent');
const budgetProgress = document.getElementById('budget-progress');

let activeDateKey = null;

// --- Initialization ---
async function init() {
    if (state.userId) {
        showApp();
    }
}

async function showApp() {
    loginOverlay.classList.add('hidden');
    mainApp.classList.remove('hidden');
    welcomeMsg.textContent = `${state.userId}님, 환영합니다!`;
    await loadUserData();
}

// --- Event Listeners ---
loginBtn.addEventListener('click', async () => {
    const id = userIdInput.value.trim();
    if (id) {
        state.userId = id;
        localStorage.setItem('meal_tracker_userid', id);
        await showApp();
    } else {
        alert('아이디를 입력해주세요!');
    }
});

logoutBtn.addEventListener('click', () => {
    state.userId = '';
    state.mealData = {};
    state.history = { cards: [], places: [] };
    localStorage.removeItem('meal_tracker_userid');
    window.location.reload();
});

prevMonthBtn.addEventListener('click', () => changeMonth(-1));
nextMonthBtn.addEventListener('click', () => changeMonth(1));

function changeMonth(delta) {
    let newDate = new Date(state.selectedYear, state.selectedMonth + delta, 1);
    state.selectedMonth = newDate.getMonth();
    state.selectedYear = newDate.getFullYear();
    renderCalendar();
    updateDashboard();
}

resetMonthBtn.addEventListener('click', () => {
    if (confirm('이번 달 기록을 초기화하겠습니까?')) {
        initializeMonthData();
        renderCalendar();
        updateDashboard();
    }
});

// Statistics
if (showStatsBtn) {
    showStatsBtn.addEventListener('click', () => {
        renderGlobalStats();
        statsModal.style.display = 'flex';
    });
}
if (statsModalClose) statsModalClose.addEventListener('click', () => statsModal.style.display = 'none');

// Modal Close
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
function closeModal() {
    actionModal.style.display = 'none';
    activeDateKey = null;
}

// History Modal
manageHistoryBtn.addEventListener('click', () => {
    renderHistoryManagement();
    historyModal.style.display = 'flex';
});
if (historyModalClose) historyModalClose.addEventListener('click', () => historyModal.style.display = 'none');

// Outing Toggle Button Logic
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        if (type === 'toggle-outing') {
            actionGridMain.classList.add('hidden');
            outingInputSection.classList.remove('hidden');
            modalSaveOutingBtn.classList.remove('hidden');
            priceInput.focus();
        } else if (type) {
            const price = (type === 'cafeteria') ? CAFETERIA_PRICE : 0;
            saveMeal(activeDateKey, type, price);
            closeModal();
        }
    });
});

// Time Buttons
timeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        timeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Save Outing
modalSaveOutingBtn.addEventListener('click', () => {
    const price = parseInt(priceInput.value);
    const place = placeInput.value.trim();
    const card = cardInput.value.trim();
    const activeTimeBtn = document.querySelector('.time-btn.active');
    const time = activeTimeBtn ? activeTimeBtn.getAttribute('data-time') : 'lunch';

    if (!isNaN(price)) {
        saveMeal(activeDateKey, 'outing', price, place, card, time);
        if (place) {
            state.history.places = state.history.places.filter(p => p !== place);
            state.history.places.push(place);
        }
        if (card) {
            state.history.cards = state.history.cards.filter(c => c !== card);
            state.history.cards.push(card);
        }
        closeModal();
    }
});

modalDeleteBtn.addEventListener('click', () => {
    if (activeDateKey) {
        const [y, m, d] = activeDateKey.split('-').map(Number);
        const dayOfWeek = new Date(y, m - 1, d).getDay();
        const type = (dayOfWeek === 0 || dayOfWeek === 6) ? 'holiday' : 'cafeteria';
        const price = (type === 'cafeteria') ? CAFETERIA_PRICE : 0;
        saveMeal(activeDateKey, type, price);
        closeModal();
    }
});

// --- Calendar Logic ---
function renderCalendar() {
    ensureMonthInitialized();
    const headers = Array.from(calendarGrid.querySelectorAll('.day-header'));
    calendarGrid.innerHTML = '';
    headers.forEach(h => calendarGrid.appendChild(h));

    monthDisplay.textContent = `${state.selectedYear}년 ${state.selectedMonth + 1}월`;
    const firstDay = new Date(state.selectedYear, state.selectedMonth, 1).getDay();
    const daysInMonth = new Date(state.selectedYear, state.selectedMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day empty';
        calendarGrid.appendChild(empty);
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day glass-card';
        const dateKey = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayData = state.mealData[dateKey];

        const dayNum = document.createElement('span');
        dayNum.textContent = d;
        dayEl.appendChild(dayNum);

        if (dayData) {
            dayEl.classList.add(dayData.type);
            const priceEl = document.createElement('span');
            priceEl.className = 'price';
            priceEl.textContent = (dayData.price && dayData.price > 0) ? `${dayData.price.toLocaleString()}원` : '';
            dayEl.appendChild(priceEl);
        }
        if (today.getFullYear() === state.selectedYear && today.getMonth() === state.selectedMonth && today.getDate() === d) {
            dayEl.classList.add('today');
        }
        dayEl.onclick = () => handleDayClick(dateKey);
        calendarGrid.appendChild(dayEl);
    }
}

function handleDayClick(dateKey) {
    activeDateKey = dateKey;
    const current = state.mealData[dateKey];
    const [y, m, d] = dateKey.split('-').map(Number);
    modalDateDisplay.textContent = `${m}월 ${d}일 식사 선택`;

    // Reset UI for selection
    actionGridMain.classList.remove('hidden');
    outingInputSection.classList.add('hidden');
    modalSaveOutingBtn.classList.add('hidden');

    if (current && current.type === 'outing') {
        priceInput.value = current.price || 10000;
        placeInput.value = current.place || '';
        cardInput.value = current.card || '';
        const targetTime = current.time || 'lunch';
        timeBtns.forEach(b => {
            if (b.getAttribute('data-time') === targetTime) b.classList.add('active');
            else b.classList.remove('active');
        });
        // Direct to details
        actionGridMain.classList.add('hidden');
        outingInputSection.classList.remove('hidden');
        modalSaveOutingBtn.classList.remove('hidden');
    } else {
        priceInput.value = 10000;
        placeInput.value = '';
        cardInput.value = state.history.cards.length > 0 ? state.history.cards[state.history.cards.length - 1] : '';
        timeBtns.forEach(b => b.classList.remove('active'));
        if (timeBtns[0]) timeBtns[0].classList.add('active');
    }
    actionModal.style.display = 'flex';
}

// --- Suggestions & History Management ---
function setupDropdown(input, dropdown, type) {
    if (!input || !dropdown) return;
    input.onfocus = () => showDropdown(input, dropdown, type, input.value);
    input.onclick = (e) => { e.stopPropagation(); showDropdown(input, dropdown, type, input.value); };
    input.oninput = () => showDropdown(input, dropdown, type, input.value);
}

function showDropdown(input, dropdown, type, filterText = '') {
    const list = state.history[type] || [];
    const filtered = list.filter(item => item.toLowerCase().includes(filterText.toLowerCase()));
    if (filtered.length === 0) { dropdown.classList.add('hidden'); return; }
    dropdown.innerHTML = '';
    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.textContent = item;
        div.onmousedown = (e) => { e.preventDefault(); input.value = item; dropdown.classList.add('hidden'); };
        dropdown.appendChild(div);
    });
    dropdown.classList.remove('hidden');
}

function renderHistoryManagement() {
    cardHistoryList.innerHTML = '';
    state.history.cards.forEach((card, idx) => cardHistoryList.appendChild(createHistoryItem(card, 'cards', idx)));
    placeHistoryList.innerHTML = '';
    state.history.places.forEach((place, idx) => placeHistoryList.appendChild(createHistoryItem(place, 'places', idx)));
}

function createHistoryItem(text, type, index) {
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 5px; font-size: 0.85rem;';
    div.innerHTML = `<span>${text}</span><button style="background: none; border: none; color: #FF4B2B; cursor: pointer; font-size: 0.8rem;">삭제</button>`;
    div.querySelector('button').onclick = () => {
        state.history[type].splice(index, 1);
        saveUserData();
        renderHistoryManagement();
    };
    return div;
}

document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.input-group')) {
        if (placeDropdown) placeDropdown.classList.add('hidden');
        if (cardDropdown) cardDropdown.classList.add('hidden');
    }
});

// --- Data Management & Sync ---
async function saveMeal(dateKey, type, price, place = '', card = '', time = 'lunch') {
    state.mealData[dateKey] = { type, price, place, card, time };
    await saveUserData();
    renderCalendar();
    updateDashboard();
}

async function saveUserData() {
    const storageKey = `meal_data_${state.userId}`;
    const dataToSave = { mealData: state.mealData, history: state.history };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    if (window.location.protocol === 'file:') return;
    try {
        await fetch(`/api/data?userId=${encodeURIComponent(state.userId)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave)
        });
    } catch (e) { console.warn('Sync failed'); }
}

async function loadUserData() {
    if (window.location.protocol !== 'file:') {
        try {
            const response = await fetch(`/api/data?userId=${encodeURIComponent(state.userId)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.mealData) { state.mealData = data.mealData; state.history = data.history || { places: [], cards: [] }; }
            }
        } catch (e) { }
    }
    const saved = localStorage.getItem(`meal_data_${state.userId}`);
    if (saved) {
        const data = JSON.parse(saved);
        if (Object.keys(state.mealData).length === 0) {
            state.mealData = data.mealData || {};
            state.history = data.history || { places: [], cards: [] };
        }
    }
    // Migration
    if (!state.history.places || state.history.places.length === 0) {
        const p = new Set(), c = new Set();
        Object.values(state.mealData).forEach(m => { if (m.place) p.add(m.place); if (m.card) c.add(m.card); });
        state.history.places = Array.from(p); state.history.cards = Array.from(c);
        if (state.history.places.length > 0) saveUserData();
    }
    renderCalendar(); updateDashboard();
    setupDropdown(placeInput, placeDropdown, 'places');
    setupDropdown(cardInput, cardDropdown, 'cards');
}

function initializeMonthData() {
    const dCount = new Date(state.selectedYear, state.selectedMonth + 1, 0).getDate();
    for (let d = 1; d <= dCount; d++) {
        const key = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const day = new Date(state.selectedYear, state.selectedMonth, d).getDay();
        state.mealData[key] = (day === 0 || day === 6) ? { type: 'holiday', price: 0 } : { type: 'cafeteria', price: CAFETERIA_PRICE };
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
        if (y === state.selectedYear && m === (state.selectedMonth + 1)) {
            const d = state.mealData[key]; spent += d.price;
            if (d.type === 'outing') reimb += d.price;
        }
    });
    totalSpentEl.textContent = `${spent.toLocaleString()}원`;
    totalRemainingEl.textContent = `${(BUDGET_LIMIT - spent).toLocaleString()}원`;
    totalReimbursementEl.textContent = `${reimb.toLocaleString()}원`;
    const pct = Math.min(100, Math.floor((spent / BUDGET_LIMIT) * 100));
    usagePercentEl.textContent = `${pct}%`;
    budgetProgress.style.width = `${pct}%`;
    const today = new Date();
    todayDisplayEl.textContent = `오늘은 ${today.getMonth() + 1}월 ${today.getDate()}일(${['일', '월', '화', '수', '목', '금', '토'][today.getDay()]})`;
}

function renderGlobalStats() {
    const c = {};
    Object.values(state.mealData).forEach(m => { if (m.type === 'outing' && m.place) c[m.place] = (c[m.place] || 0) + 1; });
    const s = Object.entries(c).sort((a, b) => b[1] - a[1]);
    statsListBody.innerHTML = s.length ? s.map(([p, n], i) => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding:12px 10px; color:#FEB47B; font-weight:bold;">${i + 1}위</td>
            <td style="padding:12px 10px;">${p}</td>
            <td style="padding:12px 10px; text-align:right; color:#00B09B;">${n}회</td>
        </tr>`).join('') : '<tr><td colspan="3" style="text-align:center; padding:2rem; color:#94a3b8;">기록 없음</td></tr>';
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
