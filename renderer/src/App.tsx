
import React, { useEffect, useMemo, useState } from 'react'
import KanbanBoard from './components/KanbanBoard'

declare global {
  interface Window {
    api: {
      getPAT: () => Promise<string | null>;
      savePAT: (pat: string) => Promise<boolean>;
      clearPAT: () => Promise<boolean>;
      fetchMyWork: (jiraUrl: string, project: string, issuetype: string, user: string) => Promise<any>;
    }
  }
}

const App: React.FC = () => {
  // Config persisted in localStorage
  const [jiraUrl, setJiraUrl] = useState(localStorage.getItem('jiraUrl') || 'https://devtrack.vanderlande.com')
  const [project, setProject] = useState(localStorage.getItem('project') || 'DCW')
  const [issuetype, setIssuetype] = useState(localStorage.getItem('issuetype') || 'Solution Initiative')
  const [usersList, setUsersList] = useState(localStorage.getItem('usersList') || 'nlcdan,nlrhoog,nljkos')
  const [selectedUser, setSelectedUser] = useState(localStorage.getItem('selectedUser') || 'nlcdan')

  const [hasPat, setHasPat] = useState<boolean>(false)
  const [patInput, setPatInput] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const users = useMemo(() => usersList.split(',').map(s => s.trim()).filter(Boolean), [usersList])

  useEffect(() => {
    window.api.getPAT().then(p => setHasPat(!!p)).catch(() => setHasPat(false))
  }, [])

  useEffect(() => { localStorage.setItem('jiraUrl', jiraUrl) }, [jiraUrl])
  useEffect(() => { localStorage.setItem('project', project) }, [project])
  useEffect(() => { localStorage.setItem('issuetype', issuetype) }, [issuetype])
  useEffect(() => { localStorage.setItem('usersList', usersList) }, [usersList])
  useEffect(() => { localStorage.setItem('selectedUser', selectedUser) }, [selectedUser])

  const savePat = async () => {
    try {
      await window.api.savePAT(patInput)
      setHasPat(true)
      setPatInput('')
    } catch (e:any) {
      setError(e?.message || 'Failed to save PAT')
    }
  }

  const logoutPat = async () => {
    await window.api.clearPAT()
    setHasPat(false)
  }

  return (
    <div style={{ padding: 16, fontFamily: 'Inter, system-ui, Arial' }}>
      <h2>Jira Kanban — My Initiatives</h2>
      {!hasPat ? (
        <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8, maxWidth: 520 }}>
          <h3>First-time setup</h3>
          <p>Enter your Jira Personal Access Token (stored securely in Windows Credential Manager).</p>
          <input
            type="password"
            placeholder="Jira PAT"
            value={patInput}
            onChange={e => setPatInput(e.target.value)}
            style={{ width: 400, padding: 8, marginRight: 8 }}
          />
          <button onClick={savePat}>Save</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <hr/>
          <p style={{fontSize: 12, opacity: 0.8}}>You can change settings below, then the board will appear after saving your PAT.</p>
        </div>
      ) : (
        <div style={{ marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label>Jira URL<br/>
              <input value={jiraUrl} onChange={e=>setJiraUrl(e.target.value)} style={{ width: 320, padding: 6 }}/>
            </label>
          </div>
          <div>
            <label>Project<br/>
              <input value={project} onChange={e=>setProject(e.target.value)} style={{ width: 120, padding: 6 }}/>
            </label>
          </div>
          <div>
            <label>Issue Type<br/>
              <input value={issuetype} onChange={e=>setIssuetype(e.target.value)} style={{ width: 200, padding: 6 }}/>
            </label>
          </div>
          <div>
            <label>Users (comma-separated)<br/>
              <input value={usersList} onChange={e=>setUsersList(e.target.value)} style={{ width: 320, padding: 6 }}/>
            </label>
          </div>
          <div>
            <label>User<br/>
              <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} style={{ padding: 6 }}>
                {users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button onClick={logoutPat}>Clear PAT</button>
          </div>
        </div>
      )}

      {hasPat && (
        <KanbanBoard
          jiraUrl={jiraUrl}
          project={project}
          issuetype={issuetype}
          user={selectedUser}
        />
      )}
    </div>
  )
}

export default App
