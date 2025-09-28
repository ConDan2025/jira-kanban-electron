import React, { useEffect, useState } from "react"
import { Container, Button, Offcanvas, Form } from "react-bootstrap"
import { Gear } from "react-bootstrap-icons"
import KanbanBoard from "./components/KanbanBoard"

const App: React.FC = () => {
  const [jiraUrl, setJiraUrl] = useState(localStorage.getItem("jiraUrl") || "https://your-jira-url")
  const [project, setProject] = useState(localStorage.getItem("project") || "DCW")
  const [issuetype, setIssuetype] = useState(localStorage.getItem("issuetype") || "Solution Initiative")

  // 🔹 User list + dropdown
  const [userList, setUserList] = useState(localStorage.getItem("userList") || "alice,bob,charlie")
  const [user, setUser] = useState(localStorage.getItem("user") || "")
  const users = userList.split(",").map((u) => u.trim()).filter(Boolean)

  // 🔹 Search + refresh
  const [search, setSearch] = useState("")
  const [refreshInterval, setRefreshInterval] = useState<number>(0)
  const [refreshKey, setRefreshKey] = useState<number>(0)

  // 🔹 Settings panel
  const [showSettings, setShowSettings] = useState(false)

  // 🔹 PAT storage
  const [pat, setPat] = useState<string | null>(null)
  const [tempPat, setTempPat] = useState("")

  useEffect(() => {
    const loadPat = async () => {
      const stored = await window.api.getPAT()
      setPat(stored)
    }
    loadPat()
  }, [])

  useEffect(() => {
    localStorage.setItem("userList", userList)
    if (user) {
      localStorage.setItem("user", user)
    }
  }, [user, userList])

  return (
    <Container fluid className="p-3">
      {/* ⚙️ Cogwheel */}
      <div className="d-flex justify-content-end mb-3">
        <Button variant="outline-secondary" onClick={() => setShowSettings(true)}>
          <Gear size={20} /> Settings
        </Button>
      </div>

      {/* Settings Panel */}
      <Offcanvas show={showSettings} onHide={() => setShowSettings(false)} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Settings</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {/* Jira URL */}
          <Form.Group className="mb-3">
            <Form.Label>Jira URL</Form.Label>
            <Form.Control
              type="text"
              value={jiraUrl}
              onChange={(e) => {
                setJiraUrl(e.target.value)
                localStorage.setItem("jiraUrl", e.target.value)
              }}
            />
          </Form.Group>

          {/* Project */}
          <Form.Group className="mb-3">
            <Form.Label>Project Key</Form.Label>
            <Form.Control
              type="text"
              value={project}
              onChange={(e) => {
                setProject(e.target.value)
                localStorage.setItem("project", e.target.value)
              }}
            />
          </Form.Group>

          {/* Issue Type */}
          <Form.Group className="mb-3">
            <Form.Label>Issue Type</Form.Label>
            <Form.Control
              type="text"
              value={issuetype}
              onChange={(e) => {
                setIssuetype(e.target.value)
                localStorage.setItem("issuetype", e.target.value)
              }}
            />
          </Form.Group>

          {/* User list config */}
          <Form.Group className="mb-3">
            <Form.Label>User List (comma separated)</Form.Label>
            <Form.Control
              type="text"
              value={userList}
              onChange={(e) => setUserList(e.target.value)}
            />
            <Form.Text className="text-muted">e.g. alice,bob,charlie</Form.Text>
          </Form.Group>

          {/* User dropdown */}
          <Form.Group className="mb-3">
            <Form.Label>Select User</Form.Label>
            <Form.Select value={user} onChange={(e) => setUser(e.target.value)}>
              <option value="">-- Select user --</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* PAT Storage */}
          <Form.Group className="mb-3">
            <Form.Label>Jira Personal Access Token</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter your PAT"
              value={tempPat || ""}
              onChange={(e) => setTempPat(e.target.value)}
            />
            <div className="mt-2">
              <Button
                variant="primary"
                size="sm"
                className="me-2"
                onClick={async () => {
                  if (tempPat.trim()) {
                    await window.api.savePAT(tempPat.trim())
                    setPat(tempPat.trim())
                    setTempPat("")
                  }
                }}
              >
                Save PAT
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={async () => {
                  await window.api.clearPAT()
                  setPat(null)
                }}
              >
                Clear PAT
              </Button>
            </div>
            {pat ? (
              <Form.Text className="text-success">✔ PAT stored</Form.Text>
            ) : (
              <Form.Text className="text-danger">❌ No PAT stored</Form.Text>
            )}
          </Form.Group>

          {/* Search */}
          <Form.Group className="mb-3">
            <Form.Label>Search</Form.Label>
            <Form.Control
              type="text"
              placeholder="🔍 Search initiatives..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Form.Group>

          {/* Refresh interval */}
          <Form.Group className="mb-3">
            <Form.Label>Refresh Interval</Form.Label>
            <Form.Select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={0}>Manual Refresh</option>
              <option value={1}>Every 1 min</option>
              <option value={5}>Every 5 min</option>
              <option value={10}>Every 10 min</option>
            </Form.Select>
          </Form.Group>

          <Button
            variant="primary"
            onClick={() => setRefreshKey(refreshKey + 1)}
            className="mt-2"
          >
            🔄 Refresh Now
          </Button>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Kanban Board */}
      <KanbanBoard
        jiraUrl={jiraUrl}
        project={project}
        issuetype={issuetype}
        user={user}
        search={search}
        refreshInterval={refreshInterval}
        refreshKey={refreshKey}
      />
    </Container>
  )
}

export default App
