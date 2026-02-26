(() => {
  "use strict";

  const STORAGE_KEYS = {
    lists: "lists",
    loggedIn: "loggedIn",
    pomodoroStats: "pomodoroStats",
    pomodoroDisplay: "pomodoroTime",
  };

  function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function initTodo() {
    const listsContainer = document.getElementById("listsContainer");
    const addListBtn = document.getElementById("addListBtn");
    const listNameInput = document.getElementById("listName");

    if (!listsContainer || !addListBtn || !listNameInput) return;

    function saveData() {
      localStorage.setItem(STORAGE_KEYS.lists, listsContainer.innerHTML);
    }

    function updateDailyProgress() {
      const tasks = document.querySelectorAll(".task");
      const doneTasks = document.querySelectorAll(".task.done");
      const percent = tasks.length === 0 ? 0 : Math.round((doneTasks.length / tasks.length) * 100);

      const percentEl = document.getElementById("progressPercent");
      const fillEl = document.getElementById("progressFill");

      if (percentEl) percentEl.textContent = `${percent}%`;
      if (fillEl) fillEl.style.width = `${percent}%`;
    }

    function sortTasks(tasks) {
      if (!tasks) return;
      const items = [...tasks.children];
      items.sort(
        (a, b) => Number(a.classList.contains("done")) - Number(b.classList.contains("done")),
      );
      items.forEach((item) => tasks.appendChild(item));
    }

    function loadData() {
      const data = localStorage.getItem(STORAGE_KEYS.lists);
      if (data) listsContainer.innerHTML = data;
      updateDailyProgress();
    }

    loadData();

    addListBtn.addEventListener("click", () => {
      const name = listNameInput.value.trim();
      if (!name) return;

      const list = document.createElement("div");
      list.className = "list";
      list.innerHTML = `
        <div class="list-header">
          <h3>${escapeHTML(name)}</h3>
          <div>
            <button class="add-task" type="button">Add</button>
            <button class="delete-list" type="button">Delete</button>
          </div>
        </div>
        <input type="text" class="task-input" placeholder="Task name...">
        <ul class="tasks"></ul>
      `;

      listsContainer.appendChild(list);
      listNameInput.value = "";
      saveData();
      updateDailyProgress();
    });

    document.addEventListener("click", (e) => {
      if (!(e.target instanceof Element)) return;
      const target = e.target;

      if (target.classList.contains("add-task")) {
        const list = target.closest(".list");
        const input = list?.querySelector(".task-input");
        const tasks = list?.querySelector(".tasks");
        if (!input || !tasks) return;

        const value = input.value.trim();
        if (!value) return;

        const task = document.createElement("li");
        task.className = "task";
        task.draggable = true;
        task.innerHTML = `
          <span class="task-text">${escapeHTML(value)}</span>
          <div class="task-actions">
            <button class="done-btn" type="button">✔</button>
            <button class="edit" type="button">✏</button>
            <button class="remove" type="button">✖</button>
          </div>
        `;

        tasks.appendChild(task);
        input.value = "";
        saveData();
        updateDailyProgress();
      }

      if (target.classList.contains("done-btn")) {
        const task = target.closest(".task");
        if (!task) return;
        task.classList.toggle("done");
        sortTasks(task.closest(".tasks"));
        saveData();
        updateDailyProgress();
      }

      if (target.classList.contains("remove")) {
        target.closest(".task")?.remove();
        saveData();
        updateDailyProgress();
      }

      if (target.classList.contains("edit")) {
        const text = target.closest(".task")?.querySelector(".task-text");
        if (!text) return;
        const newText = prompt("عدل المهمة", text.textContent || "");
        if (newText !== null && newText.trim()) {
          text.textContent = newText.trim();
          saveData();
          updateDailyProgress();
        }
      }

      if (target.classList.contains("delete-list")) {
        target.closest(".list")?.remove();
        saveData();
        updateDailyProgress();
      }
    });

    let draggedTask = null;

    document.addEventListener("dragstart", (e) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.classList.contains("task")) draggedTask = e.target;
    });

    document.addEventListener("dragover", (e) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest(".tasks")) e.preventDefault();
    });

    document.addEventListener("drop", (e) => {
      if (!(e.target instanceof Element) || !draggedTask) return;

      const targetTask = e.target.closest(".task");
      const targetList = e.target.closest(".tasks");
      if (!targetList) return;
      e.preventDefault();

      if (targetTask) {
        targetTask.parentNode?.insertBefore(draggedTask, targetTask.nextSibling);
      } else {
        targetList.appendChild(draggedTask);
      }

      draggedTask = null;
      saveData();
      updateDailyProgress();
    });
  }

  function initAuth() {
    const PASSWORD = "moh15m";
    const loginOverlay = document.getElementById("loginOverlay");
    const passwordInput = document.getElementById("passwordInput");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (!loginOverlay || !logoutBtn || !loginBtn || !passwordInput) return;

    if (localStorage.getItem(STORAGE_KEYS.loggedIn) === "true") {
      loginOverlay.style.display = "none";
      logoutBtn.style.display = "block";
    }

    loginBtn.addEventListener("click", () => {
      if (passwordInput.value === PASSWORD) {
        localStorage.setItem(STORAGE_KEYS.loggedIn, "true");
        loginOverlay.style.display = "none";
        logoutBtn.style.display = "block";
      } else {
        alert("كلمة السر غير صحيحة");
      }
    });

    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEYS.loggedIn);
      location.reload();
    });
  }

  function initPomodoro() {
    if (!document.getElementById("pomodoroDisplay")) return;

    let pomodoroInterval;
    let isWorking = true;
    let pomodoroTime = 0;
    let totalCycles = 0;
    let currentCycle = 0;
    let chartInstance = null;

    function getPositiveInt(id, fallback) {
      const value = Number(document.getElementById(id)?.value);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
    }

    function saveDailyCycle() {
      const key = todayKey();
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.pomodoroStats) || "{}");
      data[key] = (data[key] || 0) + 1;
      localStorage.setItem(STORAGE_KEYS.pomodoroStats, JSON.stringify(data));
    }

    function calculateStreak(data) {
      let streak = 0;
      const date = new Date();
      while (true) {
        const key = date.toISOString().slice(0, 10);
        if (!data[key]) break;
        streak++;
        date.setDate(date.getDate() - 1);
      }
      return streak;
    }

    function updateStats() {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.pomodoroStats) || "{}");
      const key = todayKey();
      const todayCount = data[key] || 0;
      const streak = calculateStreak(data);
      const statsBox = document.getElementById("statsBox");
      if (!statsBox) return;
      statsBox.innerHTML = `
        <h3>📊 إحصائيات</h3>
        <p>اليوم: ${todayCount} دورة</p>
        <p>🔥 Streak: ${streak} أيام متتالية</p>
      `;
    }

    function calculatePoints() {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.pomodoroStats) || "{}");
      return Object.values(data).reduce((total, v) => total + Number(v), 0) * 10;
    }

    function updateRewards() {
      const points = calculatePoints();
      let level = "مبتدئ";
      if (points >= 500) level = "محترف";
      else if (points >= 200) level = "متقدم";

      const rewardBox = document.getElementById("rewardBox");
      if (!rewardBox) return;
      rewardBox.innerHTML = `<p>النقاط: ${points}</p><p>المستوى: ${level}</p>`;
    }

    function getLast7Days() {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }
      return days;
    }

    function drawChart() {
      const canvas = document.getElementById("weekChart");
      if (!canvas || typeof Chart === "undefined") return;

      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.pomodoroStats) || "{}");
      const days = getLast7Days();
      const counts = days.map((day) => data[day] || 0);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (chartInstance) chartInstance.destroy();
      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: days.map((d) => d.slice(5)),
          datasets: [{ label: "عدد الدورات", data: counts }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        },
      });
    }

    function updatePomodoro() {
      const m = Math.floor(pomodoroTime / 60);
      const s = pomodoroTime % 60;
      const display = document.getElementById("pomodoroDisplay");
      if (!display) return;

      display.textContent = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      localStorage.setItem(STORAGE_KEYS.pomodoroDisplay, display.textContent);
    }

    function updateCycleInfo() {
      const cycleInfo = document.getElementById("cycleInfo");
      if (cycleInfo) cycleInfo.textContent = `الدورة ${currentCycle} من ${totalCycles}`;
    }

    function stopPomodoro() {
      clearInterval(pomodoroInterval);
    }

    function runTimer(work, rest) {
      pomodoroInterval = setInterval(() => {
        pomodoroTime--;
        updatePomodoro();

        if (pomodoroTime <= 0) {
          document.getElementById("bellSound")?.play();

          if (isWorking) {
            currentCycle++;
            saveDailyCycle();
            updateStats();
            updateRewards();
            drawChart();
          }

          if (currentCycle >= totalCycles && isWorking) {
            stopPomodoro();
            return;
          }

          isWorking = !isWorking;
          pomodoroTime = isWorking ? work : rest;
          updateCycleInfo();
        }
      }, 1000);
    }

    function startPomodoro() {
      clearInterval(pomodoroInterval);

      const work = getPositiveInt("workInput", 25) * 60;
      const rest = getPositiveInt("restInput", 5) * 60;
      totalCycles = getPositiveInt("cycleCount", 1);
      if (currentCycle >= totalCycles) currentCycle = 0;

      pomodoroTime = work;
      isWorking = true;
      updatePomodoro();
      updateCycleInfo();
      runTimer(work, rest);
    }

    function toggleFocusMode() {
      document.body.classList.toggle("focus-mode");
    }

    const savedDisplay = localStorage.getItem(STORAGE_KEYS.pomodoroDisplay);
    if (savedDisplay) {
      const display = document.getElementById("pomodoroDisplay");
      if (display) display.textContent = savedDisplay;
    }

    window.startPomodoro = startPomodoro;
    window.stopPomodoro = stopPomodoro;

    document.getElementById("startPomodoro")?.addEventListener("click", startPomodoro);
    document.getElementById("stopPomodoro")?.addEventListener("click", stopPomodoro);
    document.getElementById("focusModeBtn")?.addEventListener("click", toggleFocusMode);

    updateStats();
    updateRewards();
    drawChart();
  }

  initTodo();
  initAuth();
  initPomodoro();
})();