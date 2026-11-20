/* ===================================================
   Personal Dashboard — app.js
   Features: Clock/Greeting, Focus Timer, To-Do List,
             Quick Links, Dark Mode, Custom Name,
             Prevent Duplicate Tasks
   =================================================== */

// ── Storage helpers ──────────────────────────────────
const storage = {
  get: (key, fallback) => {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// ── State ────────────────────────────────────────────
let tasks   = storage.get('tasks', []);
let links   = storage.get('links', [
  { name: 'Google',   url: 'https://google.com' },
  { name: 'Gmail',    url: 'https://mail.google.com' },
  { name: 'Calendar', url: 'https://calendar.google.com' }
]);
let theme       = storage.get('theme', 'light');
let userName    = storage.get('userName', '');
let timerDuration = storage.get('timerDuration', 25); // minutes

// Timer state
let timerInterval = null;
let timerTotal    = timerDuration * 60;
let timerRemaining = timerTotal;
let timerRunning  = false;

// ── DOM refs ─────────────────────────────────────────
const clockEl        = document.getElementById('clock');
const dateEl         = document.getElementById('date');
const greetingEl     = document.getElementById('greeting');
const themeToggleBtn = document.getElementById('themeToggle');
const nameBtn        = document.getElementById('nameBtn');

const timerDisplayEl  = document.getElementById('timerDisplay');
const timerProgressBar= document.getElementById('timerProgressBar');
const startBtn        = document.getElementById('startBtn');
const stopBtn         = document.getElementById('stopBtn');
const resetBtn        = document.getElementById('resetBtn');
const durationInput   = document.getElementById('durationInput');

const taskInput   = document.getElementById('taskInput');
const addTaskBtn  = document.getElementById('addTaskBtn');
const taskListEl  = document.getElementById('taskList');

const linkNameInput = document.getElementById('linkName');
const linkUrlInput  = document.getElementById('linkUrl');
const addLinkBtn    = document.getElementById('addLinkBtn');
const linksGridEl   = document.getElementById('linksGrid');

const nameModal      = document.getElementById('nameModal');
const nameInputModal = document.getElementById('nameInputModal');
const saveNameBtn    = document.getElementById('saveNameBtn');
const cancelNameBtn  = document.getElementById('cancelNameBtn');

const toastEl = document.getElementById('toast');

// ═══════════════════════════════════════════════════
//  CLOCK & GREETING
// ═══════════════════════════════════════════════════
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function pad(n) { return String(n).padStart(2, '0'); }

function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
}

function updateClock() {
  const now    = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const day    = DAYS[now.getDay()];
  const month  = MONTHS[now.getMonth()];
  const date   = now.getDate();
  const year   = now.getFullYear();

  clockEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  dateEl.textContent  = `${day}, ${month} ${date}, ${year}`;

  const base    = getGreeting(h);
  const name    = userName ? `, ${userName}` : '';
  greetingEl.textContent = `${base}${name} 👋`;
}

setInterval(updateClock, 1000);
updateClock();

// ═══════════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════════
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  themeToggleBtn.textContent = t === 'dark' ? '☀️' : '🌙';
  themeToggleBtn.title = t === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
}

themeToggleBtn.addEventListener('click', () => {
  theme = theme === 'light' ? 'dark' : 'light';
  storage.set('theme', theme);
  applyTheme(theme);
});

applyTheme(theme);

// ═══════════════════════════════════════════════════
//  CUSTOM NAME MODAL
// ═══════════════════════════════════════════════════
function openNameModal() {
  nameInputModal.value = userName;
  nameModal.classList.add('active');
  nameInputModal.focus();
}

function closeNameModal() {
  nameModal.classList.remove('active');
}

nameBtn.addEventListener('click', openNameModal);
cancelNameBtn.addEventListener('click', closeNameModal);

nameModal.addEventListener('click', (e) => {
  if (e.target === nameModal) closeNameModal();
});

saveNameBtn.addEventListener('click', () => {
  const val = nameInputModal.value.trim();
  userName = val;
  storage.set('userName', userName);
  updateClock();
  closeNameModal();
  showToast(val ? `Hi, ${val}! 👋` : 'Name cleared');
});

nameInputModal.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveNameBtn.click();
  if (e.key === 'Escape') closeNameModal();
});

// ═══════════════════════════════════════════════════
//  FOCUS TIMER
// ═══════════════════════════════════════════════════
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad(m)}:${pad(s)}`;
}

function updateTimerDisplay() {
  timerDisplayEl.textContent = formatTime(timerRemaining);
  const pct = timerTotal > 0 ? (timerRemaining / timerTotal) * 100 : 100;
  timerProgressBar.style.width = pct + '%';
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  startBtn.disabled = true;
  stopBtn.disabled  = false;

  timerInterval = setInterval(() => {
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      startBtn.disabled = false;
      stopBtn.disabled  = true;
      showToast('⏰ Focus session complete!');
      return;
    }
    timerRemaining--;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning  = false;
  startBtn.disabled = false;
  stopBtn.disabled  = true;
}

function resetTimer() {
  stopTimer();
  timerRemaining = timerTotal;
  updateTimerDisplay();
}

function applyDuration(mins) {
  const val = parseInt(mins, 10);
  if (isNaN(val) || val < 1 || val > 180) {
    showToast('Enter a time between 1 and 180 minutes', true);
    durationInput.value = timerDuration;
    return;
  }
  timerDuration  = val;
  timerTotal     = val * 60;
  storage.set('timerDuration', timerDuration);
  resetTimer();
  showToast(`Timer set to ${val} min`);
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click',  stopTimer);
resetBtn.addEventListener('click', resetTimer);

durationInput.value = timerDuration;
durationInput.addEventListener('change', () => applyDuration(durationInput.value));
durationInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') applyDuration(durationInput.value);
});

// Initial display
stopBtn.disabled = true;
updateTimerDisplay();

// ═══════════════════════════════════════════════════
//  TO-DO LIST
// ═══════════════════════════════════════════════════
function saveTasks() {
  storage.set('tasks', tasks);
}

function renderTasks() {
  taskListEl.innerHTML = '';

  if (tasks.length === 0) {
    taskListEl.innerHTML = '<li style="color:var(--text-muted);font-size:0.88rem;text-align:center;padding:16px 0;">No tasks yet — add one above!</li>';
    return;
  }

  tasks.forEach((task, idx) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');
    li.dataset.idx = idx;

    li.innerHTML = `
      <input type="checkbox" ${task.done ? 'checked' : ''} title="Mark done">
      <span class="task-label">${escapeHtml(task.text)}</span>
      <div class="task-actions">
        <button class="btn btn-secondary btn-sm edit-btn" title="Edit">✏️</button>
        <button class="btn btn-danger btn-sm delete-btn" title="Delete">Delete</button>
      </div>
    `;

    // Check/uncheck
    li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      tasks[idx].done = e.target.checked;
      saveTasks();
      renderTasks();
    });

    // Click label to toggle
    li.querySelector('.task-label').addEventListener('click', () => {
      tasks[idx].done = !tasks[idx].done;
      saveTasks();
      renderTasks();
    });

    // Edit
    li.querySelector('.edit-btn').addEventListener('click', () => editTask(li, idx));

    // Delete
    li.querySelector('.delete-btn').addEventListener('click', () => {
      tasks.splice(idx, 1);
      saveTasks();
      renderTasks();
    });

    taskListEl.appendChild(li);
  });
}

function editTask(li, idx) {
  const label = li.querySelector('.task-label');
  const actions = li.querySelector('.task-actions');
  const currentText = tasks[idx].text;

  const input = document.createElement('input');
  input.className = 'task-edit-input';
  input.value = currentText;

  label.replaceWith(input);
  input.focus();

  actions.innerHTML = `
    <button class="btn btn-primary btn-sm save-edit-btn">Save</button>
    <button class="btn btn-secondary btn-sm cancel-edit-btn">Cancel</button>
  `;

  const saveEdit = () => {
    const newText = input.value.trim();
    if (!newText) { showToast('Task cannot be empty', true); return; }

    // Prevent duplicate (excluding current item)
    const duplicate = tasks.some((t, i) => i !== idx && t.text.toLowerCase() === newText.toLowerCase());
    if (duplicate) {
      showToast('A task with that name already exists', true);
      return;
    }

    tasks[idx].text = newText;
    saveTasks();
    renderTasks();
  };

  actions.querySelector('.save-edit-btn').addEventListener('click', saveEdit);
  actions.querySelector('.cancel-edit-btn').addEventListener('click', renderTasks);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  saveEdit();
    if (e.key === 'Escape') renderTasks();
  });
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  // ── Challenge: Prevent Duplicate Tasks ──
  const duplicate = tasks.some(t => t.text.toLowerCase() === text.toLowerCase());
  if (duplicate) {
    showToast('That task already exists!', true);
    taskInput.select();
    return;
  }

  tasks.push({ text, done: false });
  saveTasks();
  renderTasks();
  taskInput.value = '';
  taskInput.focus();
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

renderTasks();

// ═══════════════════════════════════════════════════
//  QUICK LINKS
// ═══════════════════════════════════════════════════
function saveLinks() {
  storage.set('links', links);
}

function normalizeUrl(url) {
  url = url.trim();
  if (url && !url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }
  return url;
}

function renderLinks() {
  linksGridEl.innerHTML = '';

  if (links.length === 0) {
    linksGridEl.innerHTML = '<span style="color:var(--text-muted);font-size:0.88rem;">No links yet — add one above!</span>';
    return;
  }

  links.forEach((link, idx) => {
    const tag = document.createElement('a');
    tag.className = 'link-tag';
    tag.href      = link.url;
    tag.target    = '_blank';
    tag.rel       = 'noopener noreferrer';

    tag.innerHTML = `${escapeHtml(link.name)}<button class="link-remove" title="Remove link">×</button>`;

    tag.querySelector('.link-remove').addEventListener('click', (e) => {
      e.preventDefault();
      links.splice(idx, 1);
      saveLinks();
      renderLinks();
    });

    linksGridEl.appendChild(tag);
  });
}

function addLink() {
  const name = linkNameInput.value.trim();
  const url  = normalizeUrl(linkUrlInput.value);

  if (!name) { showToast('Enter a link name', true); linkNameInput.focus(); return; }
  if (!url)  { showToast('Enter a URL', true); linkUrlInput.focus(); return; }

  links.push({ name, url });
  saveLinks();
  renderLinks();
  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkNameInput.focus();
}

addLinkBtn.addEventListener('click', addLink);
linkUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addLink(); });
linkNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') linkUrlInput.focus(); });

renderLinks();

// ═══════════════════════════════════════════════════
//  TOAST NOTIFICATION
// ═══════════════════════════════════════════════════
let toastTimeout;

function showToast(message, isError = false) {
  clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.classList.toggle('error', isError);
  toastEl.classList.add('show');
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

// ═══════════════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════════════
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
