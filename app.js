const STORAGE_KEY = 'focus-forge-state';
const TIMER_DURATIONS = { focus: 25 * 60, break: 5 * 60 };
const MAX_HISTORY = 6;

function createInitialState() {
  return {
    tasks: [],
    timer: {
      mode: 'focus',
      duration: TIMER_DURATIONS.focus,
      remaining: TIMER_DURATIONS.focus,
      running: false,
      endAt: null,
      completedSessions: 0
    },
    streak: 0,
    history: []
  };
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createInitialState();

    const saved = JSON.parse(stored);
    const initial = createInitialState();
    const tasks = Array.isArray(saved.tasks)
      ? saved.tasks
          .filter((task) => task && typeof task.name === 'string')
          .map((task) => ({
            id: typeof task.id === 'string' ? task.id : crypto.randomUUID(),
            name: task.name.slice(0, 80),
            done: Boolean(task.done)
          }))
      : initial.tasks;
    const mode = saved.timer?.mode === 'break' ? 'break' : 'focus';
    const duration = TIMER_DURATIONS[mode];
    const remaining = Number.isFinite(saved.timer?.remaining)
      ? Math.max(0, Math.min(duration, Math.floor(saved.timer.remaining)))
      : duration;

    return {
      tasks,
      timer: {
        ...initial.timer,
        mode,
        duration,
        remaining,
        running: Boolean(saved.timer?.running),
        endAt: Number.isFinite(saved.timer?.endAt) ? saved.timer.endAt : null,
        completedSessions: Math.max(0, Math.floor(Number(saved.timer?.completedSessions) || 0))
      },
      streak: Math.max(0, Math.floor(Number(saved.streak) || 0)),
      history: Array.isArray(saved.history)
        ? saved.history
            .filter((entry) => entry && (entry.mode === 'focus' || entry.mode === 'break'))
            .slice(0, MAX_HISTORY)
            .map((entry) => ({
              mode: entry.mode,
              time: typeof entry.time === 'string' ? entry.time.slice(0, 40) : ''
            }))
        : []
    };
  } catch (error) {
    console.warn('Unable to load saved Focus Forge data.', error);
    return createInitialState();
  }
}

const state = loadState();
let timerInterval = null;
let statusTimeout = null;
let deferredPrompt = null;

const refs = {
  timerDisplay: document.getElementById('timer-display'),
  timerMode: document.getElementById('timer-mode'),
  todayDate: document.getElementById('today-date'),
  progressFill: document.getElementById('progress-fill'),
  progressBar: document.querySelector('.progress-bar'),
  progressLabel: document.getElementById('progress-label'),
  completedCount: document.getElementById('completed-count'),
  sessionCount: document.getElementById('session-count'),
  streakCount: document.getElementById('streak-count'),
  taskForm: document.getElementById('task-form'),
  taskInput: document.getElementById('task-input'),
  taskList: document.getElementById('task-list'),
  quoteText: document.getElementById('quote-text'),
  resetDayButton: document.getElementById('reset-day'),
  sessionLog: document.getElementById('session-log'),
  clearLogButton: document.getElementById('clear-log'),
  greeting: document.getElementById('greeting'),
  shareButton: document.getElementById('share-app'),
  installButton: document.getElementById('install-app'),
  status: document.getElementById('app-status')
};

const quotes = [
  'Small steps repeated with intention create real momentum.',
  'Consistency compounds faster than intensity ever does.',
  'Your next session is the one that changes the trajectory.',
  'Focus is built by reducing distractions, not by forcing more output.'
];

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('Unable to save Focus Forge data.', error);
    showStatus('Could not save changes on this device. Check available browser storage.');
    return false;
  }
}

function showStatus(message) {
  refs.status.textContent = message;
  window.clearTimeout(statusTimeout);
  statusTimeout = window.setTimeout(() => {
    refs.status.textContent = '';
  }, 5000);
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateTimerDisplay() {
  const { mode, duration, remaining } = state.timer;
  refs.timerDisplay.textContent = formatTime(remaining);
  refs.timerMode.textContent = mode === 'focus' ? 'Focus' : 'Break';

  document.querySelectorAll('.mode-button').forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  document.title = state.timer.running
    ? `${formatTime(remaining)} · Focus Forge`
    : 'Focus Forge';
}

function updateTaskProgress() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.done).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  refs.completedCount.textContent = String(completed);
  refs.progressFill.style.width = `${percentage}%`;
  refs.progressLabel.textContent = `${percentage}%`;
  refs.progressBar.setAttribute('aria-valuenow', String(percentage));
}

function updateStats() {
  refs.sessionCount.textContent = String(state.timer.completedSessions);
  refs.streakCount.textContent = String(state.streak);
}

function renderTasks() {
  refs.taskList.replaceChildren();

  if (state.tasks.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.className = 'empty-state';
    emptyMessage.textContent = 'No tasks yet. Add one small win to get started.';
    refs.taskList.appendChild(emptyMessage);
    return;
  }

  state.tasks.forEach((task) => {
    const item = document.createElement('li');
    item.className = `task-item${task.done ? ' done' : ''}`;

    const label = document.createElement('label');
    label.className = 'task-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', `Mark "${task.name}" ${task.done ? 'incomplete' : 'complete'}`);
    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked;
      saveState();
      renderTasks();
      updateTaskProgress();
    });

    const taskName = document.createElement('span');
    taskName.className = 'task-name';
    taskName.textContent = task.name;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-task';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete "${task.name}"`);
    deleteButton.addEventListener('click', () => {
      state.tasks = state.tasks.filter((itemToDelete) => itemToDelete.id !== task.id);
      saveState();
      renderTasks();
      updateTaskProgress();
      showStatus('Task deleted.');
    });

    label.append(checkbox, taskName);
    item.append(label, deleteButton);
    refs.taskList.appendChild(item);
  });
}

function renderHistory() {
  refs.sessionLog.replaceChildren();

  if (state.history.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-state';
    emptyItem.textContent = 'No sessions yet';
    refs.sessionLog.appendChild(emptyItem);
    return;
  }

  state.history.forEach((entry) => {
    const item = document.createElement('li');
    const modeLabel = document.createElement('span');
    modeLabel.className = 'label';
    modeLabel.textContent = entry.mode;

    const timeLabel = document.createElement('span');
    timeLabel.className = 'time';
    timeLabel.textContent = entry.time;

    item.append(modeLabel, timeLabel);
    refs.sessionLog.appendChild(item);
  });
}

function updateGreetingAndDate() {
  const now = new Date();
  refs.todayDate.textContent = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const hour = now.getHours();
  refs.greeting.textContent = hour < 12
    ? 'Morning focus is where your momentum starts.'
    : hour < 18
      ? 'Afternoon depth is what sharpens your next move.'
      : 'Evening reset is where calm execution begins.';
}

function render() {
  updateTimerDisplay();
  updateTaskProgress();
  updateStats();
  renderTasks();
  renderHistory();
  updateGreetingAndDate();
}

function stopTicker() {
  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function completeSession() {
  stopTicker();
  state.timer.running = false;
  state.timer.endAt = null;
  state.timer.remaining = state.timer.duration;

  const mode = state.timer.mode;
  const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  state.history.unshift({ mode, time });
  state.history = state.history.slice(0, MAX_HISTORY);

  if (mode === 'focus') {
    state.timer.completedSessions += 1;
    state.streak += 1;
    refs.quoteText.textContent = 'A strong session completed. Take a breath, then keep moving.';
    showStatus('Focus session complete. Nice work.');
  } else {
    refs.quoteText.textContent = 'Break complete. Return with sharper attention.';
    showStatus('Break complete. Ready when you are.');
  }

  saveState();
  render();
}

function tickTimer() {
  if (!state.timer.endAt) {
    stopTimer();
    state.timer.running = false;
    saveState();
    updateTimerDisplay();
    return;
  }

  const remaining = Math.max(0, Math.ceil((state.timer.endAt - Date.now()) / 1000));
  if (remaining === 0) {
    completeSession();
    return;
  }

  if (remaining !== state.timer.remaining) {
    state.timer.remaining = remaining;
    updateTimerDisplay();
  }
}

function startTimer() {
  if (state.timer.running) return;
  state.timer.running = true;
  state.timer.endAt = Date.now() + state.timer.remaining * 1000;
  saveState();
  updateTimerDisplay();
  stopTicker();
  timerInterval = window.setInterval(tickTimer, 250);
}

function pauseTimer() {
  if (state.timer.running && state.timer.endAt) {
    state.timer.remaining = Math.max(0, Math.ceil((state.timer.endAt - Date.now()) / 1000));
  }

  if (state.timer.running && state.timer.remaining === 0) {
    completeSession();
    return;
  }

  stopTicker();
  state.timer.running = false;
  state.timer.endAt = null;
  saveState();
  updateTimerDisplay();
}

function resetTimer() {
  pauseTimer();
  state.timer.remaining = state.timer.duration;
  saveState();
  updateTimerDisplay();
}

function setMode(mode) {
  if (!Object.hasOwn(TIMER_DURATIONS, mode)) return;
  stopTicker();
  state.timer.mode = mode;
  state.timer.duration = TIMER_DURATIONS[mode];
  state.timer.remaining = state.timer.duration;
  state.timer.running = false;
  state.timer.endAt = null;
  saveState();
  updateTimerDisplay();
}

function addTask(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    refs.taskInput.focus();
    return;
  }

  state.tasks.unshift({
    id: crypto.randomUUID(),
    name: trimmed.slice(0, 80),
    done: false
  });

  saveState();
  renderTasks();
  updateTaskProgress();
  refs.taskInput.value = '';
  refs.taskInput.focus();
  showStatus('Task added.');
}

function resetDay() {
  pauseTimer();
  state.tasks = [];
  state.streak = 0;
  state.history = [];
  state.timer.completedSessions = 0;
  state.timer.remaining = state.timer.duration;
  refs.quoteText.textContent = 'Today is a blank page. Pick one meaningful move.';
  saveState();
  render();
  showStatus('Today’s tasks and stats have been reset.');
}

async function shareApp() {
  const shareData = {
    title: 'Focus Forge',
    text: 'Track deep work sessions, complete tasks, and keep your momentum going.',
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Unable to share Focus Forge.', error);
        showStatus('Sharing failed. You can copy the page address from your browser.');
      }
    }
    return;
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareData.url);
      showStatus('App link copied. Send it to anyone you want to share with.');
      return;
    } catch (error) {
      console.warn('Clipboard access was unavailable.', error);
    }
  }

  showStatus(`Copy this app link to share: ${shareData.url}`);
}

refs.taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addTask(refs.taskInput.value);
});

document.getElementById('start-timer').addEventListener('click', startTimer);
document.getElementById('pause-timer').addEventListener('click', pauseTimer);
document.getElementById('reset-timer').addEventListener('click', resetTimer);
refs.resetDayButton.addEventListener('click', resetDay);
refs.clearLogButton.addEventListener('click', () => {
  state.history = [];
  saveState();
  renderHistory();
  showStatus('Session log cleared.');
});
refs.shareButton.addEventListener('click', shareApp);

refs.installButton.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  refs.installButton.classList.add('hidden');
});

document.querySelectorAll('.mode-button').forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

  if (isTyping || event.altKey || event.ctrlKey || event.metaKey) return;

  if (event.code === 'Space' && !event.repeat) {
    event.preventDefault();
    if (state.timer.running) pauseTimer();
    else startTimer();
  } else if (event.key.toLowerCase() === 'n') {
    event.preventDefault();
    refs.taskInput.focus();
  }
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  refs.installButton.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  refs.installButton.classList.add('hidden');
  showStatus('Focus Forge was installed successfully.');
});

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.error('Service worker registration failed.', error);
    showStatus('Offline support could not be enabled in this browser.');
  });
}

if (state.timer.running && state.timer.endAt) {
  if (state.timer.endAt <= Date.now()) {
    completeSession();
  } else {
    timerInterval = window.setInterval(tickTimer, 250);
  }
} else {
  state.timer.running = false;
  state.timer.endAt = null;
}

render();
