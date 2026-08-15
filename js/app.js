/*
 * SoloFlow — Application Logic
 * ==============================================
 * Pure vanilla JavaScript, no external dependencies.
 * Data persisted via browser localStorage.
 */

// ===== Utility functions =====
function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");
}

function safeGetStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("[SoloFlow] Failed to parse localStorage key \"" + key + "\":", e);
    return fallback;
  }
}

// ===== Built-in templates =====
const defaultTemplates = [
  {
    id: "builtin-work",
    name: "通用工作项目",
    tasks: [
      { name: "梳理各系统待办清单", dependsOn: [] },
      { name: "标注待办优先级", dependsOn: ["梳理各系统待办清单"] },
      { name: "OA 提交报销单", dependsOn: ["标注待办优先级"] },
      { name: "等待报销审批通过", dependsOn: ["OA 提交报销单"] },
      { name: "CRM 更新客户跟进记录", dependsOn: ["标注待办优先级"] },
      { name: "等待客户提供需求确认函", dependsOn: ["CRM 更新客户跟进记录"] },
      { name: "工单系统处理客户工单", dependsOn: ["标注待办优先级"] },
      { name: "等待工单客户回访结果", dependsOn: ["工单系统处理客户工单"] },
      { name: "汇总本周进展周报", dependsOn: ["等待报销审批通过", "等待客户提供需求确认函", "等待工单客户回访结果"] },
      { name: "OA 提交周报归档", dependsOn: ["汇总本周进展周报"] }
    ]
  },
  {
    id: "builtin-learning",
    name: "技能学习",
    tasks: [
      { name: "确定学习目标与截止日期", dependsOn: [] },
      { name: "调研课程与书籍", dependsOn: ["确定学习目标与截止日期"] },
      { name: "评估自身基础水平", dependsOn: ["确定学习目标与截止日期"] },
      { name: "制定分阶段学习计划", dependsOn: ["调研课程与书籍", "评估自身基础水平"] },
      { name: "完成入门章节学习", dependsOn: ["制定分阶段学习计划"] },
      { name: "整理入门学习笔记", dependsOn: ["完成入门章节学习"] },
      { name: "完成课后练习与测验", dependsOn: ["完成入门章节学习"] },
      { name: "制作第一个练习作品", dependsOn: ["整理入门学习笔记", "完成课后练习与测验"] },
      { name: "复盘练习作品找差距", dependsOn: ["制作第一个练习作品"] },
      { name: "针对性补强薄弱点", dependsOn: ["复盘练习作品找差距"] },
      { name: "完成进阶章节学习", dependsOn: ["针对性补强薄弱点"] },
      { name: "制作毕业作品", dependsOn: ["完成进阶章节学习"] },
      { name: "发布作品并总结成果", dependsOn: ["制作毕业作品"] }
    ]
  },
  {
    id: "builtin-travel",
    name: "旅游计划",
    tasks: [
      { name: "确定目的地与日期", dependsOn: [] },
      { name: "景点与攻略调研", dependsOn: ["确定目的地与日期"] },
      { name: "签证办理", dependsOn: ["确定目的地与日期"] },
      { name: "行程规划", dependsOn: ["景点与攻略调研"] },
      { name: "机票预订", dependsOn: ["签证办理"] },
      { name: "酒店预订", dependsOn: ["行程规划"] },
      { name: "旅行保险购买", dependsOn: ["机票预订"] },
      { name: "行李打包", dependsOn: ["行程规划"] },
      { name: "出发前确认", dependsOn: ["机票预订", "酒店预订", "行李打包"] }
    ]
  }
];

let projects = safeGetStorage("projects", []);
let customTemplates = safeGetStorage("customTemplates", []);
let hiddenBuiltinTemplates = safeGetStorage("hiddenBuiltinTemplates", []);
let selectedProject = null;
let currentTheme = localStorage.getItem("theme") || "light";
let currentView = "cards";

// Get all templates (built-in + custom, excluding hidden built-in)
function getAllTemplates() {
  const visibleBuiltIn = defaultTemplates.filter(t => !hiddenBuiltinTemplates.includes(t.id));
  return [...visibleBuiltIn, ...customTemplates];
}

// Build fresh task list from a template
function buildTasksFromTemplate(tpl) {
  return JSON.parse(JSON.stringify(tpl.tasks)).map(t => ({
    name: t.name,
    dependsOn: t.dependsOn || [],
    completed: false,
    createdAt: new Date().toISOString()
  }));
}

// Create three sample projects (one per built-in template) on first load
function initSampleProjects() {
  if (projects.length > 0) return;
  const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
  const baseId = Date.now();

  // Learning sample: not started yet
  projects.push({
    id: baseId,
    name: "示例 — 技能学习",
    tasks: buildTasksFromTemplate(defaultTemplates.find(t => t.id === "builtin-learning")),
    stuckReason: ""
  });

  // Work sample: partially completed with a spread-out timeline
  const workTasks = buildTasksFromTemplate(defaultTemplates.find(t => t.id === "builtin-work"));
  const workProgress = {
    "梳理各系统待办清单": daysAgo(20),
    "标注待办优先级": daysAgo(16),
    "OA 提交报销单": daysAgo(12),
    "CRM 更新客户跟进记录": daysAgo(8),
    "工单系统处理客户工单": daysAgo(4)
  };
  workTasks.forEach(t => {
    if (workProgress[t.name]) {
      t.completed = true;
      t.completedAt = workProgress[t.name];
    }
  });
  projects.push({
    id: baseId + 1,
    name: "示例 — 通用工作项目",
    tasks: workTasks,
    stuckReason: ""
  });

  // Travel sample: stuck with a reason
  projects.push({
    id: baseId + 2,
    name: "示例 — 旅游计划",
    tasks: buildTasksFromTemplate(defaultTemplates.find(t => t.id === "builtin-travel")),
    stuckReason: "此处是一条停滞原因"
  });

  saveProjects();
}

// Init theme
document.body.setAttribute("data-theme", currentTheme);
updateThemeUI();

window.onload = function() {
  initSampleProjects();
  renderProjectList();
  initSidebarResize();
  restoreSidebarWidth();
};

// ===== Theme switching =====
function toggleThemeDropdown() {
  const dd = document.getElementById("themeDropdown");
  dd.classList.toggle("show");
}
function setTheme(theme) {
  currentTheme = theme;
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  document.getElementById("themeDropdown").classList.remove("show");
  updateThemeUI();
}
function updateThemeUI() {
  const icons = { light: "☀️", blue: "💧", green: "🌿", pink: "🌸", yellow: "🌻", dark: "🌙" };
  const names = { light: "浅色", blue: "蓝色", green: "绿色", pink: "粉色", yellow: "黄色", dark: "暗色" };
  document.querySelector(".theme-toggle").textContent = icons[currentTheme] || "🎨";
  document.querySelectorAll(".theme-option").forEach(btn => {
    btn.classList.toggle("active", btn.textContent.trim().includes(names[currentTheme]));
  });
}
// Close theme menu on outside click
document.addEventListener("click", function(e) {
  if (!e.target.closest(".theme-selector")) {
    document.getElementById("themeDropdown").classList.remove("show");
  }
});

// ===== Sidebar resize =====
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 500;
const SIDEBAR_DEFAULT = 280;

function restoreSidebarWidth() {
  const saved = localStorage.getItem("sidebarWidth");
  const w = saved ? Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, parseInt(saved, 10))) : SIDEBAR_DEFAULT;
  const sidebar = document.getElementById("sidebar");
  sidebar.style.width = w + "px";
  sidebar.style.minWidth = w + "px";
}

function initSidebarResize() {
  const sidebar = document.getElementById("sidebar");
  const handle = document.getElementById("resizeHandle");
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  handle.addEventListener("mousedown", function(e) {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    sidebar.style.transition = "none";
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", function(e) {
    if (!isResizing) return;
    const delta = e.clientX - startX;
    const newWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startWidth + delta));
    sidebar.style.width = newWidth + "px";
    sidebar.style.minWidth = newWidth + "px";
  });

  document.addEventListener("mouseup", function() {
    if (!isResizing) return;
    isResizing = false;
    sidebar.style.transition = "";
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    const finalWidth = sidebar.offsetWidth;
    localStorage.setItem("sidebarWidth", finalWidth);
  });
}

// ===== Render project list =====
function renderProjectList() {
  const list = document.getElementById("projectList");
  list.innerHTML = "";
  const incomplete = projects.filter(p => !isAllCompleted(p));
  const completed = projects.filter(p => isAllCompleted(p));
  [...incomplete, ...completed].forEach(project => {
    const card = document.createElement("div");
    card.className = "project-card";
    if (selectedProject && selectedProject.id === project.id) card.classList.add("active");
    if (project.stuckReason && project.stuckReason.trim()) card.classList.add("stuck");
    if (isAllCompleted(project)) card.classList.add("done");
    card.onclick = () => selectProject(project.id);

    const title = document.createElement("h4");
    title.textContent = project.name;
    card.appendChild(title);

    const status = document.createElement("div");
    status.className = "project-status";
    if (isAllCompleted(project)) status.textContent = "✅ 已全部完成";
    else if (project.stuckReason && project.stuckReason.trim()) status.textContent = `⚠️ 停滞：${project.stuckReason}`;
    else status.textContent = getProjectStatus(project);
    card.appendChild(status);

    // Progress bar
    const miniProgress = document.createElement("div");
    miniProgress.className = "mini-progress";
    const miniFill = document.createElement("div");
    miniFill.className = "mini-progress-fill";
    const pct = project.tasks.length > 0 ? Math.round(project.tasks.filter(t => t.completed).length / project.tasks.length * 100) : 0;
    miniFill.style.width = pct + "%";
    miniProgress.appendChild(miniFill);
    card.appendChild(miniProgress);

    // Delete button
    const actions = document.createElement("div");
    actions.className = "project-card-actions";
    const delBtn = document.createElement("button");
    delBtn.className = "delete-project-btn";
    delBtn.textContent = "删除";
    delBtn.onclick = (e) => { e.stopPropagation(); deleteProject(project.id); };
    actions.appendChild(delBtn);
    card.appendChild(actions);

    list.appendChild(card);
  });
  saveProjects();
}

function isAllCompleted(project) {
  return project.tasks.length > 0 && project.tasks.every(t => t.completed);
}

function getProjectStatus(project) {
  const done = project.tasks.filter(t => t.completed).length;
  const total = project.tasks.length;
  return `${done}/${total} 已完成`;
}

// ===== Select project =====
function selectProject(id) {
  selectedProject = projects.find(p => p.id === id);
  document.getElementById("projectTitle").textContent = selectedProject.name;
  document.getElementById("headerActions").style.display = "flex";
  document.getElementById("progressContainer").style.display = "block";
  document.getElementById("viewTabs").style.display = "flex";
  renderWorkflow();
  if (currentView === "gantt") renderGantt();
  updateLastUpdated();
  renderProjectList();
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("expanded");
}

// ===== Render workflow =====
function renderWorkflow() {
  const workflow = document.getElementById("workflow");
  workflow.innerHTML = "";
  document.getElementById("viewTabs").style.display = selectedProject ? "flex" : "none";
  const stuckNote = document.getElementById("stuckNote");
  const stuckBox = document.getElementById("stuckBox");

  if (!selectedProject) {
    workflow.innerHTML = '<div class="empty-state"><div class="icon">📂</div><p>请从左侧选择或新建一个项目</p></div>';
    return;
  }

  if (selectedProject.tasks.length === 0) {
    workflow.innerHTML = '<div class="empty-state"><div class="icon">📝</div><p>暂无事项，点击"添加事项"或"使用模板"开始</p></div>';
    stuckNote.style.display = "none";
    stuckBox.style.display = "none";
    updateProgress();
    return;
  }

  if (selectedProject.stuckReason && selectedProject.stuckReason.trim()) {
    stuckNote.style.display = "block";
    stuckNote.textContent = `⚠️ 停滞原因：${selectedProject.stuckReason}`;
    stuckBox.style.display = "flex";
  } else {
    stuckNote.style.display = "none";
    stuckBox.style.display = "flex";
  }

  selectedProject.tasks.forEach((task, index) => {
    const card = document.createElement("div");
    card.className = "task-card";
    const isLocked = checkLocked(task);

    if (task.completed) card.classList.add("completed");
    else if (isLocked) card.classList.add("locked");

    const delBtn = document.createElement("button");
    delBtn.className = "btn-delete-task";
    delBtn.textContent = "✕";
    delBtn.title = "删除事项";
    delBtn.onclick = (e) => { e.stopPropagation(); deleteTask(index); };
    card.appendChild(delBtn);

    const editBtn = document.createElement("button");
    editBtn.className = "btn-edit-deps";
    editBtn.textContent = "✎";
    editBtn.title = "编辑依赖";
    editBtn.onclick = (e) => { e.stopPropagation(); openEditDepsModal(index); };
    card.appendChild(editBtn);

    const title = document.createElement("h4");
    title.textContent = task.name;
    card.appendChild(title);

    const deps = document.createElement("div");
    deps.className = "task-deps";
    if (task.dependsOn && task.dependsOn.length > 0) {
      deps.textContent = "依赖: " + task.dependsOn.join(", ");
    } else {
      deps.textContent = "无依赖";
    }
    card.appendChild(deps);

    const btn = document.createElement("button");
    if (task.completed) {
      btn.className = "btn-undo";
      btn.textContent = "撤回完成";
    } else {
      btn.className = "btn-complete";
      btn.textContent = isLocked ? "🔒 未解锁" : "完成任务";
      btn.disabled = isLocked;
    }
    btn.onclick = () => toggleTask(task.name);
    card.appendChild(btn);

    workflow.appendChild(card);
  });

  updateProgress();
  saveProjects();
}

function checkLocked(task) {
  if (!task.dependsOn || task.dependsOn.length === 0) return false;
  return !task.dependsOn.every(dep => {
    const depTask = selectedProject.tasks.find(t => t.name === dep);
    return depTask ? depTask.completed : false;
  });
}

function updateProgress() {
  if (!selectedProject || selectedProject.tasks.length === 0) {
    document.getElementById("progressFill").style.width = "0%";
    return;
  }
  const done = selectedProject.tasks.filter(t => t.completed).length;
  const total = selectedProject.tasks.length;
  document.getElementById("progressFill").style.width = Math.round(done / total * 100) + "%";
}

// ===== Toggle task state =====
function toggleTask(taskName) {
  const task = selectedProject.tasks.find(t => t.name === taskName);
  if (task) {
    task.completed = !task.completed;
    if (task.completed) {
      task.completedAt = new Date().toISOString();
    } else {
      delete task.completedAt;
    }
    renderWorkflow();
    renderProjectList();
    updateLastUpdated();
    if (currentView === "gantt") renderGantt();
  }
}

// ===== Add task modal =====
function openAddTaskModal() {
  if (!selectedProject) { alert("请先选择一个项目"); return; }
  const taskNames = selectedProject.tasks.map(t => t.name);
  const container = document.getElementById("modalContainer");
  container.innerHTML = `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <h3>添加新事项</h3>
        <label>事项名称</label>
        <input type="text" id="modalTaskName" placeholder="输入事项名称...">
        <label>依赖事项（按住 Ctrl 多选）</label>
        <select id="modalDeps" multiple>
          ${taskNames.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
        </select>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px;">不选则表示无依赖</div>
        <div class="modal-actions">
          <button class="btn-cancel" onclick="closeModal()">取消</button>
          <button class="btn-confirm" onclick="confirmAddTask()">添加</button>
        </div>
      </div>
    </div>`;
  setTimeout(() => document.getElementById("modalTaskName").focus(), 100);
}

function confirmAddTask() {
  const name = document.getElementById("modalTaskName").value.trim();
  if (!name) { alert("请输入事项名称"); return; }
  if (selectedProject.tasks.find(t => t.name === name)) { alert("该事项已存在"); return; }
  const depSelect = document.getElementById("modalDeps");
  const deps = Array.from(depSelect.selectedOptions).map(o => o.value);
  selectedProject.tasks.push({ name, completed: false, dependsOn: deps, createdAt: new Date().toISOString() });
  closeModal();
  renderWorkflow();
  renderProjectList();
}

function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("modalContainer").innerHTML = "";
}

// ===== Delete task =====
function deleteTask(index) {
  const task = selectedProject.tasks[index];
  if (!confirm(`确定删除事项“${task.name}”？\n其他事项对该事项的依赖也将被清除。`)) return;
  selectedProject.tasks.splice(index, 1);
  selectedProject.tasks.forEach(t => {
    if (t.dependsOn) {
      t.dependsOn = t.dependsOn.filter(d => d !== task.name);
    }
  });
  renderWorkflow();
  renderProjectList();
}

// ===== Edit dependencies =====
function openEditDepsModal(taskIndex) {
  if (!selectedProject) return;
  const task = selectedProject.tasks[taskIndex];
  const otherTasks = selectedProject.tasks.filter((t, i) => i !== taskIndex);
  const currentDeps = task.dependsOn || [];
  const container = document.getElementById("modalContainer");
  container.innerHTML = `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <h3>编辑依赖 — ${escapeHtml(task.name)}</h3>
        <label>前置依赖事项（按住 Ctrl 多选）</label>
        <select id="modalEditDeps" multiple>
          ${otherTasks.map(t => `<option value="${escapeHtml(t.name)}"${currentDeps.includes(t.name) ? ' selected' : ''}>${escapeHtml(t.name)}</option>`).join("")}
        </select>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px;">不选则表示无依赖</div>
        <div class="modal-actions">
          <button class="btn-cancel" onclick="closeModal()">取消</button>
          <button class="btn-confirm" onclick="confirmEditDeps(${taskIndex})">保存</button>
        </div>
      </div>
    </div>`;
}

function wouldCreateCycle(taskIndex, newDeps) {
  const tasks = selectedProject.tasks;
  const taskName = tasks[taskIndex].name;
  // BFS: from each new dep, check if we can reach taskName via its dependsOn chain
  const visited = new Set();
  const queue = [...newDeps];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === taskName) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const depTask = tasks.find(t => t.name === current);
    if (depTask && depTask.dependsOn) {
      queue.push(...depTask.dependsOn);
    }
  }
  return false;
}

function confirmEditDeps(taskIndex) {
  const depSelect = document.getElementById("modalEditDeps");
  const newDeps = Array.from(depSelect.selectedOptions).map(o => o.value);
  if (wouldCreateCycle(taskIndex, newDeps)) {
    alert("无法保存：该依赖设置会产生循环依赖！");
    return;
  }
  selectedProject.tasks[taskIndex].dependsOn = newDeps;
  closeModal();
  renderWorkflow();
  renderProjectList();
  if (currentView === "gantt") renderGantt();
}

// ===== Save as template =====
function saveAsTemplate() {
  if (!selectedProject || selectedProject.tasks.length === 0) {
    alert("当前项目没有事项，无法保存为模板"); return;
  }
  const container = document.getElementById("modalContainer");
  container.innerHTML = `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <h3>💾 保存为模板</h3>
        <label>模板名称</label>
        <input type="text" id="templateNameInput" placeholder="输入模板名称...">
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:6px;">
          将保存当前项目的 ${selectedProject.tasks.length} 个事项及其依赖关系
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" onclick="closeModal()">取消</button>
          <button class="btn-confirm" onclick="confirmSaveTemplate()">保存</button>
        </div>
      </div>
    </div>`;
  setTimeout(() => document.getElementById("templateNameInput").focus(), 100);
}

function confirmSaveTemplate() {
  const name = document.getElementById("templateNameInput").value.trim();
  if (!name) { alert("请输入模板名称"); return; }
  const tpl = {
    id: Date.now(),
    name: name,
    tasks: JSON.parse(JSON.stringify(selectedProject.tasks.map(t => ({
      name: t.name, dependsOn: t.dependsOn || []
    }))))
  };
  customTemplates.push(tpl);
  localStorage.setItem("customTemplates", JSON.stringify(customTemplates));
  closeModal();
  alert(`模板"${name}"已保存`);
}

// ===== Use template modal =====
function openTemplateModal() {
  if (!selectedProject) { alert("请先选择一个项目"); return; }
  const container = document.getElementById("modalContainer");
  const allTemplates = getAllTemplates();
  let listHtml = '<div class="template-list">';

  // Built-in templates (with delete button to hide)
  defaultTemplates.forEach(tpl => {
    if (hiddenBuiltinTemplates.includes(tpl.id)) return;
    listHtml += `
      <div class="template-item" onclick="applyTemplate('${tpl.id}')">
        <div class="template-item-info">
          <div class="template-item-name">${escapeHtml(tpl.name)}</div>
          <div class="template-item-count">${tpl.tasks.length} 个事项 · 内置</div>
        </div>
        <button class="template-item-del" onclick="event.stopPropagation();hideBuiltinTemplate('${tpl.id}')">删除</button>
      </div>`;
  });

  // Custom templates (with delete button)
  if (customTemplates.length > 0) {
    customTemplates.forEach(tpl => {
      listHtml += `
        <div class="template-item" onclick="applyTemplate(${tpl.id})">
          <div class="template-item-info">
            <div class="template-item-name">${escapeHtml(tpl.name)}</div>
            <div class="template-item-count">${tpl.tasks.length} 个事项</div>
          </div>
          <button class="template-item-del" onclick="event.stopPropagation();deleteTemplate(${tpl.id})">删除</button>
        </div>`;
    });
  }

  listHtml += '</div>';
  container.innerHTML = `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <h3>📑 使用模板</h3>
        ${listHtml}
        <div class="modal-actions">
          <button class="btn-cancel" onclick="closeModal()">关闭</button>
        </div>
      </div>
    </div>`;
}

function applyTemplate(tplId) {
  const tpl = getAllTemplates().find(t => t.id === tplId);
  if (!tpl) return;
  if (selectedProject.tasks.length > 0) {
    if (!confirm(`将模板"${tpl.name}"追加到当前项目中？`)) return;
  }
  const newTasks = JSON.parse(JSON.stringify(tpl.tasks));
  const existingNames = new Set(selectedProject.tasks.map(t => t.name));
  newTasks.forEach(t => {
    while (existingNames.has(t.name)) t.name = t.name + " (副本)";
    existingNames.add(t.name);
  });
  const nameMap = {};
  tpl.tasks.forEach((orig, i) => { nameMap[orig.name] = newTasks[i].name; });
  newTasks.forEach(t => {
    t.dependsOn = (t.dependsOn || []).map(d => nameMap[d] || d);
    t.completed = false;
    t.createdAt = new Date().toISOString();
  });
  selectedProject.tasks.push(...newTasks);
  closeModal();
  renderWorkflow();
  renderProjectList();
}

function deleteTemplate(tplId) {
  const tpl = customTemplates.find(t => t.id === tplId);
  if (!tpl) return;
  if (!confirm(`确定删除模板"${tpl.name}"？`)) return;
  customTemplates = customTemplates.filter(t => t.id !== tplId);
  localStorage.setItem("customTemplates", JSON.stringify(customTemplates));
  openTemplateModal();
}

function hideBuiltinTemplate(tplId) {
  const tpl = defaultTemplates.find(t => t.id === tplId);
  if (!tpl) return;
  if (!confirm(`确定隐藏内置模板"${tpl.name}"？\n刷新页面后可恢复。`)) return;
  hiddenBuiltinTemplates.push(tplId);
  localStorage.setItem("hiddenBuiltinTemplates", JSON.stringify(hiddenBuiltinTemplates));
  openTemplateModal();
}

// ===== New project =====
function addNewProject() {
  const input = document.getElementById("newProjectName");
  const name = input.value.trim();
  if (!name) { alert("请输入项目名称"); return; }
  const proj = { id: Date.now(), name, tasks: [], stuckReason: "" };
  projects.push(proj);
  input.value = "";
  selectProject(proj.id);
  renderProjectList();
}

// ===== Delete project =====
function deleteProject(id) {
  const proj = projects.find(p => p.id === id);
  if (!confirm(`确定删除项目"${proj.name}"？`)) return;
  projects = projects.filter(p => p.id !== id);
  if (selectedProject && selectedProject.id === id) {
    selectedProject = null;
    document.getElementById("projectTitle").textContent = "选择项目以查看详情";
    document.getElementById("headerActions").style.display = "none";
    document.getElementById("progressContainer").style.display = "none";
    document.getElementById("viewTabs").style.display = "none";
    document.getElementById("workflow").innerHTML = "";
    document.getElementById("stuckNote").style.display = "none";
    document.getElementById("stuckBox").style.display = "none";
    document.getElementById("lastUpdated").style.display = "none";
  }
  renderProjectList();
}

// ===== Stuck reason =====
function setStuckReason() {
  if (!selectedProject) { alert("请先选择项目"); return; }
  const val = document.getElementById("stuckReasonInput").value.trim();
  selectedProject.stuckReason = val;
  document.getElementById("stuckReasonInput").value = "";
  renderProjectList();
  renderWorkflow();
}
function clearStuckReason() {
  if (!selectedProject) { alert("请先选择项目"); return; }
  selectedProject.stuckReason = "";
  renderProjectList();
  renderWorkflow();
}

// ===== Save =====
function saveProjects() {
  localStorage.setItem("projects", JSON.stringify(projects));
}

// ===== Sidebar interaction =====
document.getElementById("sidebar").addEventListener("click", function(e) {
  if (!e.target.closest(".new-project-form")
    && !e.target.closest(".sidebar-header")
    && e.target.tagName !== "BUTTON"
    && e.target.tagName !== "INPUT") {
    this.classList.add("expanded");
  }
});
document.getElementById("mainContent").addEventListener("click", function() {
  document.getElementById("sidebar").classList.remove("expanded");
});

// Enter key to add project
document.getElementById("newProjectName").addEventListener("keydown", function(e) {
  if (e.key === "Enter") addNewProject();
});

// ===== View switching =====
function switchView(view) {
  currentView = view;
  document.querySelectorAll(".view-tab").forEach(t => t.classList.remove("active"));
  document.querySelector(`.view-tab:${view === 'cards' ? 'first-child' : 'last-child'}`).classList.add("active");
  document.getElementById("cardsView").style.display = view === "cards" ? "block" : "none";
  document.getElementById("ganttView").style.display = view === "gantt" ? "block" : "none";
  if (view === "gantt") renderGantt();
}

// ===== Last updated time =====
function updateLastUpdated() {
  const el = document.getElementById("lastUpdated");
  if (!selectedProject) { el.style.display = "none"; return; }
  const times = selectedProject.tasks
    .filter(t => t.completedAt)
    .map(t => new Date(t.completedAt));
  if (times.length === 0) { el.style.display = "none"; return; }
  const latest = new Date(Math.max(...times.map(d => d.getTime())));
  el.style.display = "block";
  el.textContent = "最后更新：" + formatTime(latest);
}
function formatTime(d) {
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ===== Gantt chart (time-based) =====
function renderGantt() {
  const container = document.getElementById("ganttContainer");
  if (!selectedProject || selectedProject.tasks.length === 0) {
    container.innerHTML = '<div class="gantt-empty">暂无事项数据</div>';
    return;
  }
  const tasks = selectedProject.tasks;
  const completedTasks = tasks.filter(t => t.completed && t.completedAt);

  // If no completed tasks, show a message
  if (completedTasks.length === 0) {
    let html = '<div class="gantt-chart gantt-chart-wide">';
    html += '<div class="gantt-empty">暂无完成数据，完成事项后甘特图将自动展示时间轴</div>';
    html += '<div class="gantt-task-list">';
    tasks.forEach(task => {
      const isLocked = checkLocked(task);
      const statusClass = isLocked ? "locked" : "pending";
      const statusText = isLocked ? "🔒 未解锁" : "⏳ 待完成";
      const depsText = task.dependsOn && task.dependsOn.length > 0
        ? ' <span class="gantt-dep-hint">(依赖: ' + escapeHtml(task.dependsOn.join(", ")) + ')</span>' : '';
      html += `<div class="gantt-task-item ${statusClass}"><span class="gantt-task-name">${escapeHtml(task.name)}</span><span class="gantt-task-status">${statusText}${depsText}</span></div>`;
    });
    html += '</div></div>';
    container.innerHTML = html;
    return;
  }

  const completedTimes = completedTasks.map(t => new Date(t.completedAt).getTime());
  let minTime = Math.min(...completedTimes);
  let maxTime = Math.max(...completedTimes);
  if (minTime === maxTime) {
    minTime -= 86400000;
    maxTime += 86400000;
  } else {
    const padding = (maxTime - minTime) * 0.12;
    minTime -= padding;
    maxTime += padding;
  }
  const range = maxTime - minTime;

  // Calculate tick count and chart width
  const totalDays = Math.ceil(range / 86400000) + 1;
  let tickCount = Math.min(totalDays, 12);
  const trackMinWidth = Math.max(500, tickCount * 70);
  const chartWidth = 160 + 16 + trackMinWidth;

  // Build header with date ticks
  let html = `<div class="gantt-chart gantt-chart-wide" style="min-width:${chartWidth}px">`;
  html += '<div class="gantt-header">';
  html += '<div class="gantt-header-label">事项</div>';
  html += '<div class="gantt-header-ticks">';
  for (let i = 0; i <= tickCount; i++) {
    const d = new Date(minTime + (range * i / tickCount));
    const label = `${d.getMonth()+1}/${d.getDate()}`;
    html += `<div class="gantt-tick" style="left:${i / tickCount * 100}%">${label}</div>`;
  }
  html += '</div></div>';

  // Build rows
  tasks.forEach((task, idx) => {
    const isLocked = checkLocked(task);
    html += '<div class="gantt-row">';
    html += `<div class="gantt-label" title="${escapeHtml(task.name)}">${escapeHtml(task.name)}</div>`;
    html += '<div class="gantt-track">';

    // Vertical grid lines
    for (let i = 0; i <= tickCount; i++) {
      html += `<div class="gantt-gridline" style="left:${i / tickCount * 100}%"></div>`;
    }

    if (task.completed && task.completedAt) {
      const t = new Date(task.completedAt).getTime();
      const leftPct = ((t - minTime) / range) * 100;
      const timeLabel = formatTime(new Date(task.completedAt)).split(' ')[0].slice(5);
      html += `<div class="gantt-bar completed" style="left:calc(${leftPct}% - 10px);width:20px" title="${escapeHtml(task.name)} — ${escapeHtml(timeLabel)}">✓</div>`;
    } else {
      const statusIcon = isLocked ? "🔒" : "○";
      const statusTitle = isLocked ? "未解锁" : "待完成";
      html += `<div class="gantt-marker ${isLocked ? 'locked' : 'pending'}" title="${escapeHtml(task.name)} — ${statusTitle}">${statusIcon}</div>`;
    }

    html += '</div></div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

// Compute topological depth levels for each task based on dependency chains.
// Reserved for future use: hierarchical Gantt layout or dependency-based task sorting.
function computeLevels(tasks) {
  const nameToIdx = {};
  tasks.forEach((t, i) => nameToIdx[t.name] = i);
  const levels = new Array(tasks.length).fill(0);
  let changed = true;
  let iter = 0;
  while (changed && iter < 100) {
    changed = false;
    iter++;
    tasks.forEach((t, i) => {
      if (!t.dependsOn) return;
      t.dependsOn.forEach(dep => {
        const di = nameToIdx[dep];
        if (di !== undefined && levels[di] + 1 > levels[i]) {
          levels[i] = levels[di] + 1;
          changed = true;
        }
      });
    });
  }
  return levels;
}

// ===== Export / Import Data =====
function exportData() {
  const data = {
    version: "1.2.0",
    exportDate: new Date().toISOString(),
    projects: projects,
    customTemplates: customTemplates,
    hiddenBuiltinTemplates: hiddenBuiltinTemplates,
    theme: currentTheme
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `soloflow-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.projects || !Array.isArray(data.projects)) {
          alert("无效的数据文件：缺少项目数据");
          return;
        }
        if (!confirm(`确定导入数据？\n当前所有数据将被替换为备份文件中的内容。\n\n备份文件包含 ${data.projects.length} 个项目。`)) return;
        projects = data.projects;
        customTemplates = data.customTemplates || [];
        hiddenBuiltinTemplates = data.hiddenBuiltinTemplates || [];
        if (data.theme) {
          currentTheme = data.theme;
          document.body.setAttribute("data-theme", currentTheme);
          localStorage.setItem("theme", currentTheme);
          updateThemeUI();
        }
        selectedProject = null;
        saveProjects();
        localStorage.setItem("customTemplates", JSON.stringify(customTemplates));
        localStorage.setItem("hiddenBuiltinTemplates", JSON.stringify(hiddenBuiltinTemplates));
        document.getElementById("projectTitle").textContent = "选择项目以查看详情";
        document.getElementById("headerActions").style.display = "none";
        document.getElementById("progressContainer").style.display = "none";
        document.getElementById("viewTabs").style.display = "none";
        document.getElementById("workflow").innerHTML = "";
        document.getElementById("stuckNote").style.display = "none";
        document.getElementById("stuckBox").style.display = "none";
        document.getElementById("lastUpdated").style.display = "none";
        renderProjectList();
        alert("数据导入成功！");
      } catch (err) {
        alert("文件解析失败，请确保选择的是有效的 JSON 备份文件。");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
