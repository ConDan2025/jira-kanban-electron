const {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  shell,
  Menu,
  globalShortcut
} = require("electron")
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
  } catch {
    return null
  }
}

function clearPat() {
  try {
    fs.unlinkSync(patFilePath())
  } catch {}
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

    // 1) Fetch subtasks assigned to the user (include duedate)
    const jqlSub =
      `project = "${project}" AND issuetype = "Sub-task" AND assignee = "${user}" ORDER BY Rank ASC`
    const subData = await jqlSearch(
      jiraUrl,
      pat,
      jqlSub,
      "key,summary,assignee,status,parent,duedate",
      500
    )
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
        status: s.fields.status?.name || "",
        duedate: s.fields.duedate || null
      })
    }

    if (parentKeys.size === 0) {
      return { columns: {}, initiativesOrdered: [], subtasksByParent: {} }
    }

    // 2) Fetch parent initiatives sorted by Rank
    //    Include: fixVersions + customfield_14221 (Target End Date)
    const keyList = Array.from(parentKeys).join(",")
    const jqlParents =
      `project = "${project}" AND key in (${keyList}) AND issuetype = "${issuetype}" ORDER BY Rank ASC`
    const parentsData = await jqlSearch(
      jiraUrl,
      pat,
      jqlParents,
      "key,summary,status,issuetype,fixVersions,customfield_14221",
      500
    )
    const parents = parentsData.issues || []

    const columns = {}
    const initiativesOrdered = []
    for (const p of parents) {
      const st = p.fields.status?.name || "Unknown"
      const versions = (p.fields.fixVersions || []).map(v => v.name)
      const targetEnd = p.fields.customfield_14221 || null
      ;(columns[st] ||= []).push({
        key: p.key,
        summary: p.fields.summary,
        status: st,
        fixVersions: versions,
        targetEnd
      })
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
    autoHideMenuBar: true, // keep menu hidden
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

  // External links -> default browser
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

  // Hidden application menu with accelerators (F5 refresh)
  const template = [
    {
      label: "App",
      submenu: [
        {
          label: "Refresh",
          accelerator: "F5",
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            if (win) win.webContents.reload()
          }
        },
        { role: "reload", accelerator: "CmdOrCtrl+R" },
        { type: "separator" },
        { role: "quit" }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // Fallback global shortcut (some environments)
  globalShortcut.register("F5", () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.webContents.reload()
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
