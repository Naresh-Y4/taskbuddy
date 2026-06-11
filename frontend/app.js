
const API = 'http://127.0.0.1:3001/api';


let state = {
  user: null,
  accessToken: null,
  refreshToken: null,
  tasks: [],
  stats: {},
  currentFilter: 'all',
  currentSort: 'created_at',
  currentView: 'all',
  searchQuery: '',
  editingTaskId: null,
  deletingTaskId: null,
  currentEmoji: '📝',
  currentTags: [],
  searchTimer: null,
};

// ═══ EMOJIS ═══
const EMOJIS = ['📝','✅','🎯','🔥','⚡','💡','🚀','🎉','📌','🏆','💪','🎨',
  '📊','🔧','🎵','🌟','💎','🎮','📚','🌈','🍕','☕','🎁','🔑'];

// ═══ INIT ═══
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('loadingScreen').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('loadingScreen').style.display = 'none';
      const saved = loadSession();
      if (saved) {
        initApp();
      } else {
        showPage('authPage');
      }
    }, 500);
  }, 1400);

  const regPw = document.getElementById('regPassword');
  if (regPw) regPw.addEventListener('input', checkPasswordStrength);

  buildEmojiPicker();

  document.addEventListener('click', (e) => {
    const picker = document.getElementById('emojiPicker');
    const btn = document.getElementById('modalEmoji');
    if (picker && !picker.contains(e.target) && e.target !== btn) {
      picker.classList.add('hidden');
    }
  });
});

// ═══ SESSION ═══
function saveSession(user, accessToken, refreshToken) {
  state.user = user;
  state.accessToken = accessToken;
  state.refreshToken = refreshToken;
  localStorage.setItem('tb_user', JSON.stringify(user));
  localStorage.setItem('tb_access', accessToken);
  localStorage.setItem('tb_refresh', refreshToken);
}

function loadSession() {
  const user = localStorage.getItem('tb_user');
  const access = localStorage.getItem('tb_access');
  const refresh = localStorage.getItem('tb_refresh');
  if (user && access && refresh) {
    state.user = JSON.parse(user);
    state.accessToken = access;
    state.refreshToken = refresh;
    return true;
  }
  return false;
}

function clearSession() {
  state.user = null;
  state.accessToken = null;
  state.refreshToken = null;
  localStorage.removeItem('tb_user');
  localStorage.removeItem('tb_access');
  localStorage.removeItem('tb_refresh');
}

// ═══ API HELPER ═══
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (state.accessToken) headers['Authorization'] = `Bearer ${state.accessToken}`;

  let res = await fetch(`${API}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    const data = await res.json();
    if (data.code === 'TOKEN_EXPIRED' && state.refreshToken) {
      const refreshRes = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: state.refreshToken }),
      });
      if (refreshRes.ok) {
        const tokens = await refreshRes.json();
        state.accessToken = tokens.accessToken;
        state.refreshToken = tokens.refreshToken;
        localStorage.setItem('tb_access', tokens.accessToken);
        localStorage.setItem('tb_refresh', tokens.refreshToken);
        headers['Authorization'] = `Bearer ${state.accessToken}`;
        res = await fetch(`${API}${endpoint}`, { ...options, headers });
      } else {
        clearSession();
        showPage('authPage');
        return null;
      }
    }
  }
  return res;
}

// ═══ AUTH ═══
function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabs = document.querySelectorAll('.auth-tab');
  const slider = document.querySelector('.auth-tab-slider');
  const error = document.getElementById('authError');

  error.classList.add('hidden');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabs[0].classList.add('active');
    tabs[1].classList.remove('active');
    slider.classList.remove('right');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabs[0].classList.remove('active');
    tabs[1].classList.add('active');
    slider.classList.add('right');
  }
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return showAuthError('Please fill in all fields!');

  const btn = document.querySelector('#loginForm .btn-primary');
  btn.innerHTML = '⏳ Logging in...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    saveSession(data.user, data.accessToken, data.refreshToken);
    initApp();
  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.innerHTML = "Let's Go! 🚀";
    btn.disabled = false;
  }
}

async function handleRegister() {
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!username || !email || !password) return showAuthError('Please fill in all fields!');
  if (password.length < 6) return showAuthError('Password must be at least 6 characters!');
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return showAuthError('Username: only letters, numbers, underscore!');

  const btn = document.querySelector('#registerForm .btn-primary');
  btn.innerHTML = '⏳ Creating...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    saveSession(data.user, data.accessToken, data.refreshToken);
    showToast('Welcome to TaskBuddy! 🎉', 'success');
    initApp();
  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.innerHTML = 'Create Account 🎉';
    btn.disabled = false;
  }
}

async function handleLogout() {
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: state.refreshToken }),
    });
  } catch (e) {}
  clearSession();
  state.tasks = [];
  showPage('authPage');
  showToast('See you later! 👋', 'info');
}

function fillDemo() {
  document.getElementById('loginEmail').value = 'demo@taskbuddy.com';
  document.getElementById('loginPassword').value = 'demo123';
  showToast('Demo credentials filled! 🎮', 'info');
}

function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function checkPasswordStrength() {
  const pw = document.getElementById('regPassword').value;
  const fill = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  let strength = 0;
  if (pw.length >= 6) strength++;
  if (pw.length >= 10) strength++;
  if (/[A-Z]/.test(pw)) strength++;
  if (/[0-9]/.test(pw)) strength++;
  if (/[^A-Za-z0-9]/.test(pw)) strength++;

  const levels = [
    { w: '0%',   c: '#ef4444', t: 'Too short' },
    { w: '25%',  c: '#ef4444', t: 'Weak 😟' },
    { w: '50%',  c: '#f59e0b', t: 'Okay 😐' },
    { w: '75%',  c: '#3b82f6', t: 'Good 👍' },
    { w: '100%', c: '#10b981', t: 'Strong 💪' },
  ];
  const l = levels[Math.min(strength, 4)];
  fill.style.width = l.w;
  fill.style.background = l.c;
  label.textContent = l.t;
  label.style.color = l.c;
}

function initApp() {
  showPage('appPage');
  const u = state.user;
  document.getElementById('sidebarUsername').textContent = u.username;
  document.getElementById('sidebarEmail').textContent = u.email;
  const av = document.getElementById('sidebarAvatar');
  av.textContent = u.username.slice(0, 2).toUpperCase();
  av.style.background = u.avatarColor || '#6366f1';
  loadTasks();
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
}

async function loadTasks() {
  try {
    const params = new URLSearchParams();

    if (
      state.currentFilter &&
      state.currentFilter !== 'all' &&
      state.currentFilter !== 'overdue'
    ) {
      params.append('status', state.currentFilter);
    }

    if (state.searchQuery) {
      params.append('search', state.searchQuery);
    }

    params.append('sort', state.currentSort);

    const res = await apiFetch(`/tasks?${params}`);

    if (!res) return;

    const data = await res.json();

    let tasks = data.tasks || [];

    // View Filters
    if (state.currentView === 'today') {
      const today = new Date().toISOString().split('T')[0];

      tasks = tasks.filter(
        task =>
          task.due_date &&
          task.due_date.split('T')[0] === today
      );
    }
    else if (state.currentView === 'urgent') {
      tasks = tasks.filter(
        task => task.priority === 'urgent'
      );
    }
    else if (state.currentFilter === 'overdue') {
      const today = new Date().toISOString().split('T')[0];

      tasks = tasks.filter(
        task =>
          task.due_date &&
          task.due_date.split('T')[0] < today &&
          task.status !== 'done'
      );
    }

    // Store tasks
    state.tasks = tasks;

    // Debug Logs
    console.log("========== TASK DEBUG ==========");
    console.log("API Response:", data);
    console.log("Tasks:", tasks);
    console.log("Task Count:", tasks.length);
    console.log("================================");

    // Update Statistics
    if (data.stats) {
      updateStats(data.stats);
    }

    // Render Tasks
    renderTasks();

    const empty = document.getElementById('emptyState');

    if (empty) {
      if (tasks.length > 0) {
        empty.style.display = 'none';
      } else {
        empty.style.display = 'flex';
      }
    }

  } catch (err) {
    console.error("Load Tasks Error:", err);
    showToast('Failed to load tasks 😢', 'error');
  }
}
function updateStats(stats) {
  state.stats = stats;
  document.getElementById('statTodo').textContent = stats.todo || 0;
  document.getElementById('statProgress').textContent = stats.in_progress || 0;
  document.getElementById('statDone').textContent = stats.done || 0;
  document.getElementById('statOverdue').textContent = stats.overdue || 0;
}
function renderTasks() {
  const grid = document.getElementById('tasksGrid');
  const empty = document.getElementById('emptyState');

  console.log("Rendering Tasks:", state.tasks.length);

  if (state.tasks.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
  } else {
    empty.style.display = 'none';

    grid.innerHTML = state.tasks
      .map((task, i) => renderTaskCard(task, i))
      .join('');
  }
}
function renderTaskCard(task, index) {
  const due = task.due_date ? task.due_date.split('T')[0] : null;
  const today = new Date().toISOString().split('T')[0];
  let dueClass = '', dueLabel = '';
  if (due) {
    if (due < today && task.status !== 'done') {
      dueClass = 'overdue'; dueLabel = `🔥 ${formatDate(due)}`;
    } else if (due === today) {
      dueClass = 'today'; dueLabel = `📅 Today`;
    } else {
      dueLabel = `📅 ${formatDate(due)}`;
    }
  }

  const tags = (task.tags || []).map(tag =>
    `<span class="tag" style="background:${tag.color}">${tag.name}</span>`
  ).join('');

  const statusLabels = {
    todo: '📋 Todo',
    in_progress: '⚡ In Progress',
    done: '✅ Done'
  };

  return `
  <div class="task-card priority-${task.priority} status-${task.status}"
       style="animation-delay:${index * 0.06}s"
       onclick="openEditModal(${task.id})">
    <div class="card-top">
      <div class="card-emoji">${task.emoji || '📝'}</div>
      <div class="card-info">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
      </div>
    </div>
    <div class="card-meta">
      <span class="badge badge-status-${task.status}">${statusLabels[task.status]}</span>
      <span class="badge badge-priority-${task.priority}">${task.priority}</span>
      ${due ? `<span class="due-date ${dueClass}">${dueLabel}</span>` : ''}
    </div>
    ${tags ? `<div class="card-tags">${tags}</div>` : ''}
    <div class="card-actions" onclick="event.stopPropagation()">
      ${task.status !== 'done'
        ? `<button class="action-btn" onclick="quickDone(${task.id})">✅ Done</button>`
        : `<button class="action-btn" onclick="quickStatus(${task.id},'todo')">↩️ Reopen</button>`
      }
      <button class="action-btn" onclick="openEditModal(${task.id})">✏️ Edit</button>
      <button class="action-btn delete" onclick="openDeleteModal(${task.id})">🗑️ Delete</button>
    </div>
  </div>`;
}

async function quickDone(id) {
  try {
    const res = await apiFetch(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'done' }),
    });
    if (!res || !res.ok) throw new Error();
    showToast('Task completed! 🎉', 'success');
    launchConfetti();
    loadTasks();
  } catch {
    showToast('Failed to update 😢', 'error');
  }
}

async function quickStatus(id, status) {
  try {
    const res = await apiFetch(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res || !res.ok) throw new Error();
    showToast('Status updated! ✨', 'success');
    loadTasks();
  } catch {
    showToast('Failed to update 😢', 'error');
  }
}

// ═══ FILTERS & SORT ═══
function setFilter(filter) {
  state.currentFilter = filter;
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === filter);
  });
  loadTasks();
}

function setView(view) {
  state.currentView = view;
  state.currentFilter = 'all';
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-filter="all"]').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navId = `nav${view.charAt(0).toUpperCase() + view.slice(1)}`;
  const navEl = document.getElementById(navId);
  if (navEl) navEl.classList.add('active');
  const titles = { all: 'All Tasks 🌈', today: 'Due Today 📅', urgent: 'Urgent Tasks 🚨' };
  document.getElementById('viewTitle').textContent = titles[view] || 'Tasks';
  loadTasks();
}

function handleSort(sort) {
  state.currentSort = sort;
  loadTasks();
}

function debounceSearch(val) {
  clearTimeout(state.searchTimer);
  const clearBtn = document.getElementById('searchClear');
  clearBtn.classList.toggle('hidden', !val);
  state.searchTimer = setTimeout(() => {
    state.searchQuery = val;
    loadTasks();
  }, 400);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').classList.add('hidden');
  state.searchQuery = '';
  loadTasks();
}

// ═══ TASK MODAL ═══
function openTaskModal() {
  state.editingTaskId = null;
  state.currentTags = [];
  state.currentEmoji = '📝';
  document.getElementById('modalTitle').textContent = 'New Task ✨';
  document.getElementById('saveTaskLabel').textContent = 'Create Task 🚀';
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDescription').value = '';
  document.getElementById('taskStatus').value = 'todo';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskDueDate').value = '';
  document.getElementById('modalEmoji').textContent = '📝';
  document.getElementById('tagsList').innerHTML = '';
  document.getElementById('titleCount').textContent = '0/200';
  document.getElementById('taskModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function openEditModal(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  state.editingTaskId = id;
  state.currentEmoji = task.emoji || '📝';
  state.currentTags = (task.tags || []).map(t => t.name);

  document.getElementById('modalTitle').textContent = 'Edit Task ✏️';
  document.getElementById('saveTaskLabel').textContent = 'Save Changes ✅';
  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskDescription').value = task.description || '';
  document.getElementById('taskStatus').value = task.status;
  document.getElementById('taskPriority').value = task.priority;
  document.getElementById('taskDueDate').value = task.due_date ? task.due_date.split('T')[0] : '';
  document.getElementById('modalEmoji').textContent = task.emoji || '📝';
  document.getElementById('titleCount').textContent = `${task.title.length}/200`;

  renderTagChips();
  document.getElementById('taskModal').classList.remove('hidden');
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.add('hidden');
  document.getElementById('emojiPicker').classList.add('hidden');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('taskModal')) closeTaskModal();
}

async function saveTask() {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) {
    document.getElementById('taskTitle').style.borderColor = '#f72585';
    document.getElementById('taskTitle').focus();
    setTimeout(() => document.getElementById('taskTitle').style.borderColor = '', 2000);
    return showToast('Title is required! 📝', 'error');
  }

  const payload = {
    title,
    description: document.getElementById('taskDescription').value.trim(),
    status: document.getElementById('taskStatus').value,
    priority: document.getElementById('taskPriority').value,
    due_date: document.getElementById('taskDueDate').value || null,
    emoji: state.currentEmoji,
    tags: state.currentTags,
  };

  const btn = document.getElementById('saveTaskLabel');
  btn.textContent = '⏳ Saving...';

  try {
    let res;
    if (state.editingTaskId) {
      res = await apiFetch(`/tasks/${state.editingTaskId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      res = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    if (!res) return;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save');

    closeTaskModal();
    showToast(state.editingTaskId ? 'Task updated! ✅' : 'Task created! 🎉', 'success');
    if (!state.editingTaskId && payload.status === 'done') launchConfetti();
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = state.editingTaskId ? 'Save Changes ✅' : 'Create Task 🚀';
  }
}

// ═══ DELETE ═══
function openDeleteModal(id) {
  state.deletingTaskId = id;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
  state.deletingTaskId = null;
}

function closeDeleteOutside(e) {
  if (e.target === document.getElementById('deleteModal')) closeDeleteModal();
}

async function confirmDelete() {
  if (!state.deletingTaskId) return;
  try {
    const res = await apiFetch(`/tasks/${state.deletingTaskId}`, { method: 'DELETE' });
    if (!res || !res.ok) throw new Error();
    closeDeleteModal();
    showToast('Task yeeted into the void! 💨', 'success');
    loadTasks();
  } catch {
    showToast('Failed to delete 😢', 'error');
  }
}

// ═══ EMOJI PICKER ═══
function buildEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  if (!picker) return;
  picker.innerHTML = EMOJIS.map(e =>
    `<button class="emoji-option" onclick="selectEmoji('${e}')">${e}</button>`
  ).join('');
}

function openEmojiPicker() {
  document.getElementById('emojiPicker').classList.toggle('hidden');
}

function selectEmoji(emoji) {
  state.currentEmoji = emoji;
  document.getElementById('modalEmoji').textContent = emoji;
  document.getElementById('emojiPicker').classList.add('hidden');
}

// ═══ TAGS ═══
function handleTagInput(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(',', '');
    if (val && !state.currentTags.includes(val) && state.currentTags.length < 5) {
      state.currentTags.push(val);
      renderTagChips();
    }
    e.target.value = '';
  }
  if (e.key === 'Backspace' && !e.target.value && state.currentTags.length > 0) {
    state.currentTags.pop();
    renderTagChips();
  }
}

function renderTagChips() {
  const colors = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
  document.getElementById('tagsList').innerHTML = state.currentTags.map((tag, i) =>
    `<span class="tag-chip" style="background:${colors[i % colors.length]}">
      ${escapeHtml(tag)}
      <button class="tag-chip-remove" onclick="removeTag(${i})">×</button>
    </span>`
  ).join('');
}

function removeTag(index) {
  state.currentTags.splice(index, 1);
  renderTagChips();
}

// ═══ CHAR COUNT ═══
function updateCharCount() {
  const len = document.getElementById('taskTitle').value.length;
  document.getElementById('titleCount').textContent = `${len}/200`;
}

// ═══ SIDEBAR ═══
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

// ═══ TOAST ═══
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: '💡' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ═══ CONFETTI ═══
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: -10,
    w: Math.random() * 12 + 5,
    h: Math.random() * 7 + 4,
    color: ['#6366f1','#06d6a0','#f72585','#fbbf24','#60a5fa','#f97316','#10b981','#ec4899'][Math.floor(Math.random() * 8)],
    vx: (Math.random() - 0.5) * 5,
    vy: Math.random() * 5 + 2,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 8,
    opacity: 1,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
      if (frame > 80) p.opacity -= 0.018;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < 130) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

// ═══ HELPERS ═══
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}