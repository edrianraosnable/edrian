// ========== VARIABLES ==========
let tasks = [];
let currentUser = null;
const STORAGE_KEY = 'todotasks';
const USERS_KEY = 'todousers';
const NOTIFICATION_DURATION = 5000; // ms
const CHECK_INTERVAL = 5000; // Check every 5 seconds
const WARNING_TIME_BEFORE = 5 * 60 * 1000; // 5 minutes before
let currentFilter = 'all';
let alreadyNotified = new Set(); // Track which tasks already sent notifications

// ========== DOM ELEMENTS ==========
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authTabBtns = document.querySelectorAll('.auth-tab-btn');
const authTabContents = document.querySelectorAll('.auth-tab-content');
const taskInput = document.getElementById('taskInput');
const taskDateTime = document.getElementById('taskDateTime');
const addBtn = document.getElementById('addBtn');
const tasksList = document.getElementById('tasksList');
const dateDisplay = document.getElementById('dateDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const emptyState = document.getElementById('emptyState');
const filterBtns = document.querySelectorAll('.filter-btn');
const totalTasksEl = document.getElementById('totalTasks');
const completedTasksEl = document.getElementById('completedTasks');
const overdueTasksEl = document.getElementById('overdueTasks');
const notificationSound = document.getElementById('notificationSound');
const darkModeToggle = document.getElementById('darkModeToggle');
const downloadBtn = document.getElementById('downloadBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const themeTransitionCircle = document.getElementById('themeTransitionCircle');
const soundSettingsBtn = document.getElementById('soundSettingsBtn');
const soundSettingsModal = document.getElementById('soundSettingsModal');
const closeSoundSettings = document.getElementById('closeSoundSettings');
const uploadSoundBtn = document.getElementById('uploadSoundBtn');
const soundFileInput = document.getElementById('soundFileInput');
const fileName = document.getElementById('fileName');
const saveSoundSettings = document.getElementById('saveSoundSettings');
const previewBtns = document.querySelectorAll('.preview-btn');

// Social login buttons
const googleLoginBtn = document.getElementById('googleLoginBtn');
const facebookLoginBtn = document.getElementById('facebookLoginBtn');
const googleSignupBtn = document.getElementById('googleSignupBtn');
const facebookSignupBtn = document.getElementById('facebookSignupBtn');

// Sound settings storage
let soundSettings = {
    warningSound: 'beep',
    dueSound: 'ding',
    vibrationMode: 'sound-and-vibration'
};
let customSoundData = null;
let alarmLoopInterval = null;
let isAlarmPlaying = false;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Check dark mode preference
    loadDarkModePreference();

    // Load user from session
    loadUserSession();

    // Create warning sound (beep sound using Web Audio API)
    createWarningSound();

    // Load tasks from localStorage
    loadTasks();

    // Render initial tasks
    renderTasks();

    // Update date/time display
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Check for due tasks periodically
    setInterval(checkForDueTasks, CHECK_INTERVAL);

    // Event listeners
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && taskInput.value.trim()) {
            addTask();
        }
    });

    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            filterBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Dark mode toggle
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Download button
    downloadBtn.addEventListener('click', downloadTasks);

    // Logout button
    logoutBtn.addEventListener('click', logout);

    // Auth tab switching
    authTabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            authTabBtns.forEach((b) => b.classList.remove('active'));
            authTabContents.forEach((c) => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tabName}Tab`).classList.add('active');
        });
    });

    // Auth forms
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);

    // Set default datetime to current time + 1 hour
    setDefaultDateTime();

    // Sound settings
    loadSoundSettings();
    soundSettingsBtn.addEventListener('click', () => soundSettingsModal.classList.add('show'));
    closeSoundSettings.addEventListener('click', () => soundSettingsModal.classList.remove('show'));
    uploadSoundBtn.addEventListener('click', () => soundFileInput.click());
    soundFileInput.addEventListener('change', handleSoundFileUpload);
    saveSoundSettings.addEventListener('click', saveSoundSettingsPreferences);
    previewBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const sound = btn.dataset.sound;
            const type = btn.dataset.type;
            previewSound(sound, type);
        });
    });

    // Close modal when clicking outside
    soundSettingsModal.addEventListener('click', (e) => {
        if (e.target === soundSettingsModal) {
            soundSettingsModal.classList.remove('show');
        }
    });

    // Social login buttons
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
    facebookLoginBtn.addEventListener('click', handleFacebookLogin);
    googleSignupBtn.addEventListener('click', handleGoogleSignup);
    facebookSignupBtn.addEventListener('click', handleFacebookSignup);
});

// ========== SOCIAL LOGIN HANDLERS ==========
function handleGoogleLogin() {
    // Simulate Google login with demo data
    const demoGoogleUser = {
        email: `google_${Date.now()}@gmail.com`,
        name: `Google User ${Math.floor(Math.random() * 1000)}`
    };
    loginWithSocial(demoGoogleUser);
}

function handleFacebookLogin() {
    if (typeof FB === 'undefined') {
        showBrowserNotification('⚠️', 'Facebook SDK not loaded. Please check your connection.', 'warning');
        return;
    }

    FB.login(function(response) {
        if (response.authResponse) {
            FB.api('/me', { fields: 'id,name,picture' }, function(userInfo) {
                const facebookUser = {
                    email: `facebook_${userInfo.id}@facebook.com`,
                    name: userInfo.name,
                    facebookId: userInfo.id,
                    picture: userInfo.picture?.data?.url
                };
                loginWithSocial(facebookUser);
            });
        } else {
            showBrowserNotification('⚠️', 'Facebook login cancelled', 'warning');
        }
    }, { scope: 'public_profile' });
}

function handleGoogleSignup() {
    // Simulate Google signup with demo data
    const demoGoogleUser = {
        email: `google_${Date.now()}@gmail.com`,
        name: `Google User ${Math.floor(Math.random() * 1000)}`
    };
    signupWithSocial(demoGoogleUser);
}

function handleFacebookSignup() {
    if (typeof FB === 'undefined') {
        showBrowserNotification('⚠️', 'Facebook SDK not loaded. Please check your connection.', 'warning');
        return;
    }

    FB.login(function(response) {
        if (response.authResponse) {
            FB.api('/me', { fields: 'id,name,picture' }, function(userInfo) {
                const facebookUser = {
                    email: `facebook_${userInfo.id}@facebook.com`,
                    name: userInfo.name,
                    facebookId: userInfo.id,
                    picture: userInfo.picture?.data?.url
                };
                signupWithSocial(facebookUser);
            });
        } else {
            showBrowserNotification('⚠️', 'Facebook signup cancelled', 'warning');
        }
    }, { scope: 'public_profile' });
}

function loginWithSocial(user) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    
    if (!users[user.email]) {
        // Auto-register if not exists
        users[user.email] = { 
            email: user.email, 
            name: user.name, 
            password: 'social_login_' + user.email,
            isSocialLogin: true 
        };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    currentUser = { email: user.email, name: user.name };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    authModal.classList.add('hidden');
    updateUserDisplay();
    loadTasks();
    renderTasks();
    showBrowserNotification('✅', `Welcome, ${user.name}!`, 'success');
}

function signupWithSocial(user) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');

    if (users[user.email]) {
        showBrowserNotification('⚠️', 'Account already exists. Please login instead.', 'warning');
        return;
    }

    users[user.email] = { 
        email: user.email, 
        name: user.name, 
        password: 'social_login_' + user.email,
        isSocialLogin: true 
    };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    currentUser = { email: user.email, name: user.name };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    authModal.classList.add('hidden');
    updateUserDisplay();
    renderTasks();
    showBrowserNotification('✅', `Account created! Welcome, ${user.name}!`, 'success');
}
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    const user = users[email];

    if (user && user.password === password) {
        currentUser = { email: user.email, name: user.name };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        authModal.classList.add('hidden');
        updateUserDisplay();
        loadTasks(); // Load tasks for this user
        renderTasks();
        showBrowserNotification('✅', `Welcome back, ${user.name}!`, 'success');
        loginForm.reset();
    } else {
        errorEl.textContent = 'Invalid email or password';
        errorEl.classList.add('show');
        setTimeout(() => errorEl.classList.remove('show'), 3000);
    }
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirm').value;
    const errorEl = document.getElementById('signupError');

    if (password !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.classList.add('show');
        return;
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');

    if (users[email]) {
        errorEl.textContent = 'Email already registered';
        errorEl.classList.add('show');
        return;
    }

    users[email] = { email, name, password };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    currentUser = { email, name };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    authModal.classList.add('hidden');
    updateUserDisplay();
    renderTasks();
    showBrowserNotification('✅', `Welcome, ${name}! Account created successfully.`, 'success');
    signupForm.reset();
}

function loadUserSession() {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
        currentUser = JSON.parse(stored);
        authModal.classList.add('hidden');
        updateUserDisplay();
    } else {
        authModal.classList.remove('hidden');
    }
}

function updateUserDisplay() {
    if (currentUser) {
        userInfo.textContent = `👤 ${currentUser.name}`;
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        tasks = [];
        authModal.classList.remove('hidden');
        showBrowserNotification('👋', 'You have been logged out', 'info');

        // Reset form
        const loginTab = document.querySelector('[data-tab="login"]');
        loginTab.click();
        loginForm.reset();
    }
}

// ========== DARK MODE ==========
function toggleDarkMode() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Get the button position relative to viewport
    const rect = darkModeToggle.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // Position the circle at the button
    themeTransitionCircle.style.left = x + 'px';
    themeTransitionCircle.style.top = y + 'px';
    
    // Add active class to trigger animation
    themeTransitionCircle.classList.add('active');
    
    // After animation starts, toggle the theme
    setTimeout(() => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', !isDarkMode);
        updateDarkModeIcon();
    }, 250);
    
    // Remove active class after animation completes
    setTimeout(() => {
        themeTransitionCircle.classList.remove('active');
    }, 1200);
}

function loadDarkModePreference() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    darkModeToggle.querySelector('.theme-icon').textContent = isDarkMode ? '☀️' : '🌙';
}

// ========== DOWNLOAD FUNCTIONALITY ==========
function downloadTasks() {
    if (tasks.length === 0) {
        showBrowserNotification('⚠️', 'No tasks to download', 'warning');
        return;
    }

    // Create CSV content
    let csv = 'Task,Due Date,Status\n';
    tasks.forEach((task) => {
        const status = task.completed ? 'Completed' : 'Pending';
        const dueDate = task.dueDate.toLocaleString('en-US');
        csv += `"${task.text}","${dueDate}","${status}"\n`;
    });

    // Create Blob and download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showBrowserNotification('✅', 'Tasks downloaded successfully', 'success');
}

// ========== SOUND SETTINGS ==========
function loadSoundSettings() {
    const saved = localStorage.getItem(`soundSettings_${currentUser?.email || 'guest'}`);
    if (saved) {
        soundSettings = JSON.parse(saved);
        updateSoundSettingsUI();
    }

    const customSound = localStorage.getItem(`customSound_${currentUser?.email || 'guest'}`);
    if (customSound) {
        customSoundData = customSound;
        fileName.textContent = '✅ Custom sound loaded';
        fileName.classList.add('active');
        document.getElementById('previewWarningCustom').disabled = false;
        document.getElementById('previewDueCustom').disabled = false;
    }
}

function updateSoundSettingsUI() {
    document.querySelector(`input[name="warningSound"][value="${soundSettings.warningSound}"]`).checked = true;
    document.querySelector(`input[name="dueSound"][value="${soundSettings.dueSound}"]`).checked = true;
    document.querySelector(`input[name="vibrationMode"][value="${soundSettings.vibrationMode}"]`).checked = true;
}

function handleSoundFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showBrowserNotification('⚠️', 'File is too large (max 2MB)', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        customSoundData = event.target.result;
        fileName.textContent = `✅ ${file.name}`;
        fileName.classList.add('active');
        document.getElementById('previewWarningCustom').disabled = false;
        document.getElementById('previewDueCustom').disabled = false;
    };
    reader.readAsDataURL(file);
}

function saveSoundSettingsPreferences() {
    soundSettings.warningSound = document.querySelector('input[name="warningSound"]:checked').value;
    soundSettings.dueSound = document.querySelector('input[name="dueSound"]:checked').value;
    soundSettings.vibrationMode = document.querySelector('input[name="vibrationMode"]:checked').value;

    localStorage.setItem(`soundSettings_${currentUser?.email || 'guest'}`, JSON.stringify(soundSettings));

    if (customSoundData) {
        localStorage.setItem(`customSound_${currentUser?.email || 'guest'}`, customSoundData);
    }

    showBrowserNotification('✅', 'Sound settings saved!', 'success');
    soundSettingsModal.classList.remove('show');
}

function previewSound(sound, type) {
    if (sound === 'custom') {
        if (customSoundData) {
            playCustomSound(customSoundData);
        } else {
            showBrowserNotification('⚠️', 'No custom sound loaded', 'warning');
        }
    } else {
        playPresetSound(sound);
    }
}

function playPresetSound(soundType) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const soundPatterns = {
            beep: { freqs: [800, 600], durations: [0.15, 0.15], gaps: [0.1] },
            alarm: { freqs: [1000, 800, 1000, 800], durations: [0.2, 0.2, 0.2, 0.2], gaps: [0.1, 0.1, 0.1] },
            chime: { freqs: [1200, 1000, 800], durations: [0.1, 0.1, 0.15], gaps: [0.05, 0.05] },
            bell: { freqs: [1500, 1200], durations: [0.3, 0.2], gaps: [0.1] },
            ding: { freqs: [1000], durations: [0.3], gaps: [] },
            ring: { freqs: [800, 1000], durations: [0.2, 0.2], gaps: [0.1, 0.1, 0.1] },
            pop: { freqs: [600], durations: [0.1], gaps: [] }
        };

        const pattern = soundPatterns[soundType] || soundPatterns.beep;
        let currentTime = audioContext.currentTime;

        pattern.freqs.forEach((freq, index) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();

            osc.connect(gain);
            gain.connect(audioContext.destination);

            osc.frequency.value = freq;
            osc.type = 'sine';

            const duration = pattern.durations[index];
            gain.gain.setValueAtTime(0.3, currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);

            osc.start(currentTime);
            osc.stop(currentTime + duration);

            currentTime += duration + (pattern.gaps[index] || 0.05);
        });
    } catch (e) {
        console.log('Could not play sound:', e);
    }
}

function playLoopingAlarmSound(soundType, duration = 30000) {
    stopAlarmSound(); // Stop any existing alarm first
    
    isAlarmPlaying = true;
    const startTime = Date.now();

    const playSound = () => {
        if (!isAlarmPlaying || Date.now() - startTime > duration) {
            stopAlarmSound();
            return;
        }
        playPresetSound(soundType);
    };

    // Play immediately
    playSound();

    // Loop the sound every 1 second
    alarmLoopInterval = setInterval(playSound, 1000);

    // Auto-stop after specified duration
    setTimeout(() => {
        stopAlarmSound();
    }, duration);
}

function playLoopingCustomSound(soundDataUrl, duration = 30000) {
    stopAlarmSound();

    isAlarmPlaying = true;
    const startTime = Date.now();

    const playSound = () => {
        if (!isAlarmPlaying || Date.now() - startTime > duration) {
            stopAlarmSound();
            return;
        }
        playCustomSound(soundDataUrl);
    };

    // Play immediately
    playSound();

    // Loop every 1.5 seconds to allow audio to finish
    alarmLoopInterval = setInterval(playSound, 1500);

    // Auto-stop after specified duration
    setTimeout(() => {
        stopAlarmSound();
    }, duration);
}

function stopAlarmSound() {
    isAlarmPlaying = false;
    if (alarmLoopInterval) {
        clearInterval(alarmLoopInterval);
        alarmLoopInterval = null;
    }
    // Stop vibration
    if (navigator.vibrate) {
        navigator.vibrate(0);
    }
}

function playCustomSound(soundDataUrl) {
    try {
        const audio = new Audio(soundDataUrl);
        audio.play().catch((e) => {
            console.log('Could not play custom sound:', e);
            showBrowserNotification('⚠️', 'Could not play custom sound', 'warning');
        });
    } catch (e) {
        console.log('Error playing custom sound:', e);
    }
}

function playNotificationSound() {
    const sound = soundSettings.dueSound;
    if (sound === 'custom' && customSoundData) {
        playLoopingCustomSound(customSoundData, 30000); // Loop for 30 seconds
    } else {
        playLoopingAlarmSound(sound, 30000); // Loop for 30 seconds
    }
    triggerAlarmVibration();
}

function playWarningNotificationSound() {
    const sound = soundSettings.warningSound;
    if (sound === 'custom' && customSoundData) {
        playLoopingCustomSound(customSoundData, 15000); // Loop for 15 seconds
    } else {
        playLoopingAlarmSound(sound, 15000); // Loop for 15 seconds
    }
    triggerVibration('warning');
}

// ========== VIBRATION FUNCTIONS ==========
function triggerVibration(type) {
    if (!navigator.vibrate) return; // Device doesn't support vibration

    const mode = soundSettings.vibrationMode;

    // Skip vibration if mode is sound-only
    if (mode === 'sound-only') return;

    let vibrationPattern;

    if (type === 'warning') {
        // Warning vibration: medium pattern [on, off, on]
        vibrationPattern = [100, 100, 100];
    } else if (type === 'due') {
        // Due alarm vibration: stronger repeated pattern
        vibrationPattern = [200, 150, 200, 150, 200, 150, 200];
    }

    navigator.vibrate(vibrationPattern);
}

function triggerAlarmVibration() {
    if (!navigator.vibrate) return;

    const mode = soundSettings.vibrationMode;

    // Skip vibration if mode is sound-only
    if (mode === 'sound-only') return;

    // Intense vibration pattern for alarm
    const vibrationPattern = [150, 100, 150, 100, 150, 100, 150, 100, 150, 100];
    navigator.vibrate(vibrationPattern);
}
function updateDateTime() {
    const now = new Date();

    // Update date display
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = now.toLocaleDateString('en-US', options);

    // Update time display
    timeDisplay.textContent = now.toLocaleTimeString('en-US', { hour12: false });
}

function setDefaultDateTime() {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    taskDateTime.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ========== TASK MANAGEMENT ==========
function addTask() {
    const taskText = taskInput.value.trim();
    const taskDate = taskDateTime.value;

    if (!taskText) {
        showBrowserNotification('⚠️', 'Please enter a task!', 'warning');
        return;
    }

    if (!taskDate) {
        showBrowserNotification('⚠️', 'Please select a date and time!', 'warning');
        return;
    }

    const task = {
        id: Date.now(),
        text: taskText,
        dueDate: new Date(taskDate),
        completed: false,
        createdAt: new Date(),
    };

    tasks.push(task);
    saveTasks();
    renderTasks();

    // Clear inputs
    taskInput.value = '';
    taskDateTime.value = '';
    setDefaultDateTime();

    // Animate button
    addBtn.style.animation = 'none';
    setTimeout(() => {
        addBtn.style.animation = 'pulse 0.3s ease';
    }, 10);

    showBrowserNotification('✅', `Task "${taskText}" added!`, 'success');
}

function deleteTask(id) {
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);
    if (taskElement) {
        taskElement.classList.add('removing');
        setTimeout(() => {
            tasks = tasks.filter((task) => task.id !== id);
            saveTasks();
            renderTasks();
            alreadyNotified.delete(id);
        }, 300);
    }
}

function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();

        if (task.completed) {
            stopAlarmSound(); // Stop alarm when task is completed
            showBrowserNotification('🎉', `Task "${task.text}" completed!`, 'success');
        }
    }
}

// ========== RENDERING ==========
function renderTasks() {
    tasksList.innerHTML = '';

    let filteredTasks = tasks;

    if (currentFilter === 'completed') {
        filteredTasks = tasks.filter((t) => t.completed);
    } else if (currentFilter === 'pending') {
        filteredTasks = tasks.filter((t) => !t.completed);
    } else if (currentFilter === 'overdue') {
        const now = new Date();
        filteredTasks = tasks.filter((t) => !t.completed && t.dueDate < now);
    }

    if (filteredTasks.length === 0) {
        emptyState.classList.add('show');
    } else {
        emptyState.classList.remove('show');
    }

    filteredTasks.forEach((task) => {
        const taskElement = createTaskElement(task);
        tasksList.appendChild(taskElement);
    });

    updateStatistics();
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.setAttribute('data-task-id', task.id);
    li.classList.add('task-item');

    if (task.completed) {
        li.classList.add('completed');
    }

    const now = new Date();
    const timeUntilDue = task.dueDate - now;
    const isOverdue = !task.completed && timeUntilDue < 0;
    const isWarning = !task.completed && timeUntilDue > 0 && timeUntilDue < WARNING_TIME_BEFORE;

    if (isOverdue) {
        li.classList.add('overdue');
    } else if (isWarning) {
        li.classList.add('warning');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('checkbox');
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => toggleTask(task.id));

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('task-content');

    const taskText = document.createElement('div');
    taskText.classList.add('task-text');
    taskText.textContent = task.text;

    const metaDiv = document.createElement('div');
    metaDiv.classList.add('task-meta');

    const timeEl = document.createElement('span');
    timeEl.classList.add('task-time');
    timeEl.innerHTML = `⏰ ${task.dueDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })}`;

    let statusEl = null;
    if (isOverdue) {
        statusEl = document.createElement('span');
        statusEl.classList.add('task-status', 'status-overdue');
        statusEl.textContent = '🔴 Overdue';
    } else if (isWarning) {
        statusEl = document.createElement('span');
        statusEl.classList.add('task-status', 'status-warning');
        statusEl.textContent = '⚠️ Due Soon';
    } else if (!task.completed) {
        statusEl = document.createElement('span');
        statusEl.classList.add('task-status', 'status-pending');
        statusEl.textContent = '⏳ Pending';
    }

    metaDiv.appendChild(timeEl);
    if (statusEl) {
        metaDiv.appendChild(statusEl);
    }

    contentDiv.appendChild(taskText);
    contentDiv.appendChild(metaDiv);

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = '🗑️ Delete';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(contentDiv);
    li.appendChild(deleteBtn);

    return li;
}

// ========== STATISTICS ==========
function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const now = new Date();
    const overdue = tasks.filter((t) => !t.completed && t.dueDate < now).length;

    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;
    overdueTasksEl.textContent = overdue;

    // Add animation if there are overdue tasks
    if (overdue > 0) {
        overdueTasksEl.style.animation = 'pulse 1s ease infinite';
    } else {
        overdueTasksEl.style.animation = 'none';
    }
}

// ========== NOTIFICATION SYSTEM ==========
function checkForDueTasks() {
    const now = new Date();

    tasks.forEach((task) => {
        if (task.completed) return;

        const timeUntilDue = task.dueDate - now;
        const hasWarningTimeArrived =
            timeUntilDue <= WARNING_TIME_BEFORE && timeUntilDue > 0;
        const isDueNow = timeUntilDue <= 0 && timeUntilDue > -60000; // Within 1 minute

        // Warning notification (5 minutes before)
        if (hasWarningTimeArrived && !alreadyNotified.has(`warning-${task.id}`)) {
            alreadyNotified.add(`warning-${task.id}`);
            playWarningNotificationSound();
            showBrowserNotification(
                '⚠️ WARNING',
                `Task "${task.text}" is due in 5 minutes!`,
                'warning'
            );
            renderTasks(); // Update UI to show warning status
        }

        // Due notification (at the scheduled time)
        if (isDueNow && !alreadyNotified.has(`due-${task.id}`)) {
            alreadyNotified.add(`due-${task.id}`);
            playWarningNotificationSound();
            playNotificationSound();
            showBrowserNotification(
                '🔔 TIME\'S UP!',
                `Task "${task.text}" is due now!`,
                'danger'
            );
            renderTasks(); // Update UI to show overdue status
        }
    });
}

function showBrowserNotification(title, message, type = 'info') {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: message,
            icon: getNotificationIcon(type),
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">✓</text></svg>',
            tag: 'todo-notification',
            requireInteraction: type === 'danger',
        });

        // Auto close notification after duration
        if (type !== 'danger') {
            setTimeout(() => notification.close(), NOTIFICATION_DURATION);
        }
    }

    // Also show in-app notification
    showInAppNotification(title, message, type);
}

function showInAppNotification(title, message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 16px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
        max-width: 350px;
        border-left: 4px solid ${
            type === 'success'
                ? '#10b981'
                : type === 'danger'
                  ? '#ef4444'
                  : type === 'warning'
                    ? '#f59e0b'
                    : '#6366f1'
        };
    `;

    const isDanger = type === 'danger';
    let html = `
        <div style="font-weight: 700; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 14px; color: #6b7280; margin-bottom: ${isDanger ? '10px' : '0'};">${message}</div>
    `;

    if (isDanger) {
        html += `
            <button id="dismissAlarm" style="
                width: 100%;
                padding: 8px 12px;
                background: #ef4444;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 12px;
                margin-top: 8px;
            ">🔕 Stop Alarm</button>
        `;
    }

    notification.innerHTML = html;
    document.body.appendChild(notification);

    if (isDanger) {
        notification.querySelector('#dismissAlarm').addEventListener('click', () => {
            stopAlarmSound();
            notification.style.animation = 'slideOutTask 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        });
    }

    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutTask 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, NOTIFICATION_DURATION);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        danger: '🔴',
        warning: '⚠️',
        info: 'ℹ️',
    };
    return icons[type] || icons.info;
}

// ========== SOUND SYSTEM ==========
function createWarningSound() {
    // Create a warning beep sound using Web Audio API
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();

        // Generate beep pattern
        const frequencies = [800, 600, 800]; // Hz
        const duration = 0.15; // seconds
        const gap = 0.1; // seconds between beeps

        function playBeep(frequency) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                audioContext.currentTime + duration
            );

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        }

        // Store beep function globally
        window.playWarningBeep = function () {
            let time = audioContext.currentTime;
            frequencies.forEach((freq) => {
                oscillator = audioContext.createOscillator();
                gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = freq;
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.3, time);
                gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

                oscillator.start(time);
                oscillator.stop(time + duration);

                time += duration + gap;
            });
        };
    }
}

function playWarningSound() {
    // Try to play using Web Audio API first
    if (typeof window.playWarningBeep === 'function') {
        try {
            window.playWarningBeep();
        } catch (e) {
            console.log('Could not play warning sound:', e);
        }
    } else {
        // Fallback: Create a warning sound programmatically
        try {
            const audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                audioContext.currentTime + 0.15
            );

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);

            // Second beep
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();

                osc2.connect(gain2);
                gain2.connect(audioContext.destination);

                osc2.frequency.value = 600;
                osc2.type = 'sine';

                gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(
                    0.01,
                    audioContext.currentTime + 0.15
                );

                osc2.start(audioContext.currentTime);
                osc2.stop(audioContext.currentTime + 0.15);
            }, 250);
        } catch (e) {
            console.log('Audio not available:', e);
        }
    }
}

function playNotificationSound() {
    // Similar to warning but slightly different frequency
    try {
        const audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + 0.2
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio not available:', e);
    }
}

// ========== LOCAL STORAGE ==========
function getUserStorageKey() {
    return currentUser ? `tasks_${currentUser.email}` : STORAGE_KEY;
}

function saveTasks() {
    if (!currentUser) return;
    const tasksToSave = tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate.toISOString(),
        createdAt: task.createdAt.toISOString(),
    }));
    localStorage.setItem(getUserStorageKey(), JSON.stringify(tasksToSave));
}

function loadTasks() {
    if (!currentUser) {
        tasks = [];
        return;
    }
    const stored = localStorage.getItem(getUserStorageKey());
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            tasks = parsed.map((task) => ({
                ...task,
                dueDate: new Date(task.dueDate),
                createdAt: new Date(task.createdAt),
            }));
        } catch (e) {
            console.error('Error loading tasks:', e);
            tasks = [];
        }
    } else {
        tasks = [];
    }
}
