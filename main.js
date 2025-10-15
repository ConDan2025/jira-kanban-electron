const { app, BrowserWindow, ipcMain, safeStorage, shell } = require("electron")
const path = require("path")
const fs = require("fs")
const axios = require("axios")

const isDev = !app.isPackaged
const patFilePath = () => path.join(app.getPath("userData"), "pat.bin")

// --- PAT storage ---
function savePat(pat) {
  const buf = safeStorage.encryptString(pat)
  fs.writeFileSync(patFilePath(), buf)
  return true
}

function getPat() {
  try {
    const buf = fs.readFileSync(patFilePath())
    return safeStorage.decryptString(buf)
  } catch (e) {
    return null
  }
}

function clearPat() {
  try {
    fs.unlinkSync(patFilePath())
  } catch (e) {}
  return true
}

// --- Jira API helper ---
async function jqlSearch(jiraUrl, pat, jql, fields, maxResults = 200) {
  const url = jiraUrl.replace(/\/$/, "") + "/rest/api/2/search"
  const resp = await axios.get(url, {
    headers: { Authorization: `Bearer ${pat}` },
    params: { jql, fields, maxResults }
  })
  return resp.data
}

// --- IPC handlers ---
function registerIpc() {
  ipcMain.handle("pat:get", () => getPat())
  ipcMain.handle("pat:save", (_e, pat) => savePat(pat))
  ipcMain.handle("pat:clear", () => clearPat())

  ipcMain.handle("jira:fetchMyWork", async (_e, { jiraUrl, project, issuetype, user }) => {
    const pat = getPat()
    if (!pat) throw new Error("No PAT stored")

    // Get subtasks for user
    const jqlSub = `project = "${project}" AND issuetype = "Sub-task" AND assignee = "${user}" ORDER BY Rank ASC`
    const subData = await jqlSearch(jiraUrl, pat, jqlSub, "key,summary,assignee,status,parent", 500)
    const subs = subData.issues || []

    const subsByParent = {}
    const parentKeys = new Set()
    for (const s of subs) {
      const p = s.fields.parent
      if (!p) continue
      parentKeys.add(p.key)
      ;(subsByParent[p.key] ||= []).push({
        key: s.key,
        summary: s.fields.summary,
        status: s.fields.status?.name || ""
      })
    }

    if (parentKeys.size === 0) {
      return { columns: {}, initiativesOrdered: [], subtasksByParent: {} }
    }

    // Get parent initiatives sorted by rank
    const keyList = Array.from(parentKeys).join(",")
    const jqlParents = `project = "${project}" AND key in (${keyList}) AND issuetype = "${issuetype}" ORDER BY Rank ASC`
    const parentsData = await jqlSearch(jiraUrl, pat, jqlParents, "key,summary,status,issuetype", 500)
    const parents = parentsData.issues || []

    const columns = {}
    const initiativesOrdered = []
    for (const p of parents) {
      const st = p.fields.status?.name || "Unknown"
      ;(columns[st] ||= []).push({ key: p.key, summary: p.fields.summary, status: st })
      initiativesOrdered.push(p.key)
    }
    return { columns, initiativesOrdered, subtasksByParent: subsByParent }
  })
}

// --- Browser Window ---
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (isDev) {
    win.loadURL("http://localhost:5173")
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, "dist", "index.html"))
  }

  // 🔹 F5 refresh support
  win.webContents.on("before-input-event", (event, input) => {

    if (input.key === "F5"){
      win.webContents.reload()
      event.preventDefault()
    }
    // Optional: Ctrl+R also triggers reload
    if (input.key === "r" && input.control) {
      win.webContents.reload()
      event.preventDefault()
    }
  })

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith("http://localhost") && !url.startsWith("file://")) {
      shell.openExternal(url)
      return { action: "deny" }
    }
    return { action: "allow" }
  })

  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http://localhost") && !url.startsWith("file://")) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
}

// --- App lifecycle ---
app.whenReady().then(() => {
  registerIpc()
  createWindow()

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit()
})
