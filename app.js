// --- Constants & State ---
const BUDGET_LIMIT = 200000;
const CAFETERIA_PRICE = 7770;

let state = {
    userId: localStorage.getItem('meal_tracker_userid') || '',
    currentDate: new Date(),
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    mealData: {}, // { "YYYY-MM-DD": { type: 'cafeteria' | 'outing' | 'holiday', price: 0 } }
    history: {
        cards: [],
        places: []
    }
};

// --- DOM Elements ---
const loginOverlay = document.getElementById('login-overlay');
const mainApp = document.getElementById('main-app');
const userIdInput = document.getElementById('user-id-input');
const loginBtn = document.getElementById('login-btn');
const welcomeMsg = document.getElementById('welcome-msg');

const calendarGrid = document.querySelector('.calendar-grid');
const monthDisplay = document.getElementById('current-month-display');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

const logoutBtn = document.getElementById('logout-btn');
const resetMonthBtn = document.getElementById('reset-month-btn');
const actionModal = document.getElementById('action-modal');
const priceInput = document.getElementById('price-input');
const placeInput = document.getElementById('place-input');
const cardInput = document.getElementById('card-input');

const timeBtns = document.querySelectorAll('.time-btn');
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

const modalSaveOutingBtn = document.getElementById('modal-save-outing');
const modalCloseBtn = document.getElementById('modal-close');
const modalDeleteBtn = document.getElementById('modal-delete');
const outingInputSection = document.getElementById('outing-input-section');

const totalSpentEl = document.getElementById('total-spent');
const totalRemainingEl = document.getElementById('total-remaining');
const totalReimbursementEl = document.getElementById('total-reimbursement');
const usagePercentEl = document.getElementById('usage-percent');
const budgetProgress = document.getElementById('budget-progress');

const showStatsBtn = document.getElementById('show-stats-btn');
const statsModal = document.getElementById('stats-modal');
const statsModalClose = document.getElementById('stats-modal-close');
const statsListBody = document.getElementById('stats-list-body');

const todayDisplayEl = document.getElementById('today-display');

let activeDateKey = null;

// --- Initialization ---
async function init() {
    if (state.userId) {
        showApp();
    }
}

async function showApp() {
    console.log('Showing app for user:', state.userId);
    loginOverlay.classList.add('hidden');
    mainApp.classList.remove('hidden');
    welcomeMsg.textContent = `${state.userId}님, 환영합니다!`;

    // Clear previous data before loading
    state.mealData = {};

    await loadUserData();
}

// --- Event Listeners ---
timeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        timeBtns.forEach(b => {
            b.classList.remove('active');
            b.style.background = 'rgba(255,255,255,0.05)';
            b.style.borderColor = 'var(--glass-border)';
            b.style.color = 'var(--text-muted)';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(255, 126, 95, 0.2)';
        btn.style.borderColor = 'var(--primary)';
        btn.style.color = 'white';
    });
});

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

    mainApp.classList.add('hidden');
    loginOverlay.classList.remove('hidden');
    userIdInput.value = '';
});

manageHistoryBtn.addEventListener('click', () => {
    renderHistoryManagement();
    historyModal.style.display = 'flex';
});

historyModalClose.addEventListener('click', () => {
    historyModal.style.display = 'none';
});

// JSON Export/Import Listeners
exportJsonBtn.addEventListener('click', () => {
    const data = {
        userId: state.userId,
        mealData: state.mealData,
        history: state.history,
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meal_tracker_${state.userId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON 파일로 내보냈습니다!');
});

importJsonBtn.addEventListener('click', () => {
    importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.mealData) {
                state.mealData = data.mealData;
                state.history = data.history || { places: [], cards: [] };
                saveUserData();
                renderCalendar();
                updateDashboard();
                updateSuggestions();
                showToast('파일에서 데이터를 불러왔습니다!');
            } else {
                alert('올바른 JSON 형식이 아닙니다.');
            }
        } catch (err) {
            alert('파일을 읽는 중 오류가 발생했습니다.');
        }
    };
    reader.readAsText(file);
});

resetMonthBtn.addEventListener('click', () => {
    if (confirm('이번 달의 모든 기록을 기본값(평일=구내식당, 주말=휴일)으로 초기화하시겠습니까?')) {
        initializeMonthData();
        renderCalendar();
        updateDashboard();
        showToast('이번 달 기록이 초기화되었습니다.');
    }
});

prevMonthBtn.addEventListener('click', () => changeMonth(-1));
nextMonthBtn.addEventListener('click', () => changeMonth(1));

// Statistics Listeners
showStatsBtn.addEventListener('click', () => {
    renderGlobalStats();
    statsModal.style.display = 'flex';
});

statsModalClose.addEventListener('click', () => {
    statsModal.style.display = 'none';
});

function changeMonth(delta) {
    let newDate = new Date(state.selectedYear, state.selectedMonth + delta, 1);
    state.selectedMonth = newDate.getMonth();
    state.selectedYear = newDate.getFullYear();

    renderCalendar();
    updateDashboard();
}

function ensureMonthInitialized() {
    const monthPrefix = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`;
    const keys = Object.keys(state.mealData);
    const hasDataThisMonth = keys.some(key => key.startsWith(monthPrefix));

    if (!hasDataThisMonth) {
        console.log(`Auto-initializing: ${monthPrefix}`);
        initializeMonthData();
    }
}

// --- Calendar Logic ---
function renderCalendar() {
    ensureMonthInitialized();

    // Clear existing days but keep headers
    const headers = Array.from(calendarGrid.querySelectorAll('.day-header'));
    calendarGrid.innerHTML = '';
    headers.forEach(h => calendarGrid.appendChild(h));

    monthDisplay.textContent = `${state.selectedYear}년 ${state.selectedMonth + 1}월`;

    const firstDay = new Date(state.selectedYear, state.selectedMonth, 1).getDay();
    const daysInMonth = new Date(state.selectedYear, state.selectedMonth + 1, 0).getDate();

    // Empty slots for prev month
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day empty';
        calendarGrid.appendChild(empty);
    }

    // Days of current month
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
            priceEl.textContent = dayData.price > 0 ? `${dayData.price.toLocaleString()}원` : '';
            dayEl.appendChild(priceEl);
        }

        // Highlight today
        const today = new Date();
        if (today.getFullYear() === state.selectedYear && today.getMonth() === state.selectedMonth && today.getDate() === d) {
            dayEl.classList.add('today');
        }

        dayEl.addEventListener('click', () => handleDayClick(dateKey));
        calendarGrid.appendChild(dayEl);
    }
}

function handleDayClick(dateKey) {
    activeDateKey = dateKey;
    const current = state.mealData[dateKey];
    const [y, m, d] = dateKey.split('-').map(Number);
    document.getElementById('modal-date-display').textContent = `${m}월 ${d}일 식사 선택`;

    // UI Reset
    outingInputSection.classList.add('hidden');
    modalSaveOutingBtn.classList.add('hidden');
    document.querySelector('.action-grid').classList.remove('hidden');

    // Pre-fill if current is outing
    if (current && current.type === 'outing') {
        priceInput.value = current.price || 10000;
        placeInput.value = current.place || '';
        cardInput.value = current.card || '';

        // Time selection pre-fill
        const targetTime = current.time || 'lunch';
        timeBtns.forEach(b => {
            if (b.getAttribute('data-time') === targetTime) b.click();
        });

        // Show details immediately if it's already an outing
        document.querySelector('.action-grid').classList.add('hidden');
        outingInputSection.classList.remove('hidden');
        modalSaveOutingBtn.classList.remove('hidden');
    } else {
        priceInput.value = 10000;
        placeInput.value = '';
        const lastCard = state.history.cards.length > 0 ? state.history.cards[state.history.cards.length - 1] : '';
        cardInput.value = lastCard;
        timeBtns[0].click();
    }

    actionModal.style.display = 'flex';
}

// Quick Menu Buttons
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        if (type === 'toggle-outing') {
            outingInputSection.classList.toggle('hidden');
            modalSaveOutingBtn.classList.toggle('hidden');
            if (!outingInputSection.classList.contains('hidden')) {
                priceInput.focus();
            }
        } else if (type) {
            const price = (type === 'cafeteria') ? CAFETERIA_PRICE : 0;
            saveMeal(activeDateKey, type, price);
            closeModal();
        }
    });
});

// Custom Dropdown Logic
function setupDropdown(input, dropdown, type) {
    // Show on focus or click
    input.addEventListener('focus', () => showDropdown(input, dropdown, type, input.value));
    input.addEventListener('click', (e) => {
        e.stopPropagation();
        showDropdown(input, dropdown, type, input.value);
    });

    // Real-time filtering as you type
    input.addEventListener('input', () => {
        showDropdown(input, dropdown, type, input.value);
    });
}

function showDropdown(input, dropdown, type, filterText = '') {
    const list = state.history[type] || [];
    const filtered = list.filter(item =>
        item.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }

    dropdown.innerHTML = '';
    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.textContent = item;
        div.onmousedown = (e) => { // Use mousedown to trigger before blur
            e.preventDefault();
            input.value = item;
            dropdown.classList.add('hidden');
        };
        dropdown.appendChild(div);
    });
    dropdown.classList.remove('hidden');
}

// Global click to close dropdowns
document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.input-group')) {
        placeDropdown.classList.add('hidden');
        cardDropdown.classList.add('hidden');
    }
});

setupDropdown(placeInput, placeDropdown, 'places');
setupDropdown(cardInput, cardDropdown, 'cards');

modalSaveOutingBtn.addEventListener('click', () => {
    const price = parseInt(priceInput.value);
    const place = placeInput.value.trim();
    const card = cardInput.value.trim();
    const time = document.querySelector('.time-btn.active').getAttribute('data-time');

    if (!isNaN(price)) {
        saveMeal(activeDateKey, 'outing', price, place, card, time);

        // Update history (Move to end to mark as 'most recent')
        if (place) {
            state.history.places = state.history.places.filter(p => p !== place);
            state.history.places.push(place);
        }
        if (card) {
            state.history.cards = state.history.cards.filter(c => c !== card);
            state.history.cards.push(card);
        }

        updateSuggestions();
        closeModal();
    }
});

// Event Listeners for Modal controls
modalCloseBtn.addEventListener('click', closeModal);

modalDeleteBtn.addEventListener('click', () => {
    if (activeDateKey) {
        const [y, m, d] = activeDateKey.split('-').map(Number);
        const dayOfWeek = new Date(y, m - 1, d).getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            // Weekend -> Reset to Holiday
            state.mealData[activeDateKey] = { type: 'holiday', price: 0 };
        } else {
            // Workday -> Reset to Default Cafeteria
            state.mealData[activeDateKey] = { type: 'cafeteria', price: CAFETERIA_PRICE };
        }

        saveUserData();
        renderCalendar();
        updateDashboard();
        closeModal();
    }
});

function closeModal() {
    actionModal.style.display = 'none';
    activeDateKey = null;
}

// --- Data Management ---
async function saveMeal(dateKey, type, price, place = '', card = '', time = 'lunch') {
    state.mealData[dateKey] = { type, price, place, card, time };
    saveUserData();
    renderCalendar();
    updateDashboard();
}

function updateSuggestions() {
    // Just refresh the dropdowns if they are open
    if (!placeDropdown.classList.contains('hidden')) showDropdown(placeInput, placeDropdown, 'places');
    if (!cardDropdown.classList.contains('hidden')) showDropdown(cardInput, cardDropdown, 'cards');
}

function renderHistoryManagement() {
    cardHistoryList.innerHTML = '';
    state.history.cards.forEach((card, idx) => {
        const item = createHistoryItem(card, 'cards', idx);
        cardHistoryList.appendChild(item);
    });

    placeHistoryList.innerHTML = '';
    state.history.places.forEach((place, idx) => {
        const item = createHistoryItem(place, 'places', idx);
        placeHistoryList.appendChild(item);
    });
}

function createHistoryItem(text, type, index) {
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 5px; font-size: 0.85rem;';
    div.innerHTML = `
        <span>${text}</span>
        <button style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 0.8rem;">삭제</button>
    `;
    div.querySelector('button').onclick = () => {
        state.history[type].splice(index, 1);
        saveUserData();
        renderHistoryManagement();
        updateSuggestions();
    };
    return div;
}

async function saveUserData() {
    // 1. Local Cache
    const storageKey = `meal_data_${state.userId}`;
    const dataToSave = {
        mealData: state.mealData,
        history: state.history
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));

    // 2. Cloud Sync (Skip if running from local file protocol)
    if (window.location.protocol === 'file:') {
        console.log('Local file protocol detected. Skipping cloud sync.');
        return;
    }

    try {
        const response = await fetch(`/api/data?userId=${encodeURIComponent(state.userId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave)
        });
        if (response.ok) {
            showToast('데이터가 동기화되었습니다!');
        }
    } catch (e) {
        console.warn('Sync failed');
        showToast('로컬에 저장됨 (오프라인)');
    }
}

async function loadUserData() {
    console.log('Loading user data...');

    // 1. Try Loading from Cloud (Skip if file://)
    if (window.location.protocol !== 'file:') {
        try {
            const response = await fetch(`/api/data?userId=${encodeURIComponent(state.userId)}`);
            if (response.ok) {
                const data = await response.json();
                // Check if it's the new structured format or old format
                if (data.mealData) {
                    state.mealData = data.mealData;
                    state.history = data.history || { cards: [], places: [] };
                } else if (Object.keys(data).length > 0) {
                    // Backward compatibility
                    state.mealData = data;
                }
            }
        } catch (e) {
            console.warn('Cloud load failed');
        }
    } else {
        console.log('Skipping cloud load (file protocol)');
    }

    // 2. Fallback to LocalStorage
    const storageKey = `meal_data_${state.userId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved && Object.keys(state.mealData).length === 0) {
        const data = JSON.parse(saved);
        if (data.mealData) {
            state.mealData = data.mealData;
            state.history = data.history || { cards: [], places: [] };
        } else {
            state.mealData = data;
        }
    }

    // 3. Extract history from existing mealData if history is missing items (MIGRATION)
    const hasNoPlaces = !state.history.places || state.history.places.length === 0;
    const hasNoCards = !state.history.cards || state.history.cards.length === 0;

    if (hasNoPlaces || hasNoCards) {
        const places = new Set(state.history.places || []);
        const cards = new Set(state.history.cards || []);

        Object.values(state.mealData).forEach(m => {
            if (m.place) places.add(m.place);
            if (m.card) cards.add(m.card);
        });

        state.history.places = Array.from(places);
        state.history.cards = Array.from(cards);

        console.log('Migration active: Extracted history', state.history);

        if (state.history.places.length > 0 || state.history.cards.length > 0) {
            saveUserData();
        }
    }

    ensureMonthInitialized();
    updateSuggestions();

    renderCalendar();
    updateDashboard();
}

function initializeMonthData() {
    const daysInMonth = new Date(state.selectedYear, state.selectedMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = new Date(state.selectedYear, state.selectedMonth, d).getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            // SUN or SAT -> Holiday
            state.mealData[dateKey] = { type: 'holiday', price: 0 };
        } else {
            // Weekday -> Default Cafeteria
            state.mealData[dateKey] = { type: 'cafeteria', price: CAFETERIA_PRICE };
        }
    }
    saveUserData();
}

// --- Dashboard & Calculations ---
function updateDashboard() {
    let totalSpent = 0;
    let totalReimbursement = 0;

    // Calculate for current selected month
    Object.keys(state.mealData).forEach(key => {
        const [y, m, d] = key.split('-').map(Number);
        if (y === state.selectedYear && m === (state.selectedMonth + 1)) {
            const data = state.mealData[key];
            totalSpent += data.price;

            // Only 'outing' type goes into reimbursement claim
            if (data.type === 'outing') {
                totalReimbursement += data.price;
            }
        }
    });

    const remaining = BUDGET_LIMIT - totalSpent;
    const usagePercent = Math.min(100, Math.floor((totalSpent / BUDGET_LIMIT) * 100));

    totalSpentEl.textContent = `${totalSpent.toLocaleString()}원`;
    totalRemainingEl.textContent = `${remaining.toLocaleString()}원`;
    totalReimbursementEl.textContent = `${totalReimbursement.toLocaleString()}원`;
    usagePercentEl.textContent = `${usagePercent}%`;
    budgetProgress.style.width = `${usagePercent}%`;

    // Update Today Display
    if (todayDisplayEl) {
        const today = new Date();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        todayDisplayEl.textContent = `오늘은 ${today.getMonth() + 1}월 ${today.getDate()}일(${days[today.getDay()]})`;
    }
}

function renderGlobalStats() {
    const counts = {};
    Object.values(state.mealData).forEach(m => {
        if (m.type === 'outing' && m.place) {
            counts[m.place] = (counts[m.place] || 0) + 1;
        }
    });

    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1]);

    statsListBody.innerHTML = '';
    sorted.forEach(([place, count], idx) => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        row.innerHTML = `
            <td style="padding: 12px 10px; color: var(--accent); font-weight: bold;">${idx + 1}위</td>
            <td style="padding: 12px 10px;">${place}</td>
            <td style="padding: 12px 10px; text-align: right; color: var(--secondary);">${count}회</td>
        `;
        statsListBody.appendChild(row);
    });

    if (sorted.length === 0) {
        statsListBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 2rem; color: var(--text-muted);">아직 외식 기록이 없습니다.</td></tr>';
    }
}

function showToast(msg) {
    const toast = document.getElementById('save-toast');
    toast.textContent = msg || '저장되었습니다!';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
}

// Init
init();
