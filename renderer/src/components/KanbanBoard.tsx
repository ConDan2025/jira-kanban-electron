
import React, { useEffect, useState } from 'react'

type Item = { key: string; summary: string; status: string };
type Columns = Record<string, Item[]>;

const Column: React.FC<{ title: string; items: Item[]; subtasksByParent: Record<string, any[]>; jiraUrl: string; }> = ({ title, items, subtasksByParent, jiraUrl }) => {
  return (
    <div style={{ flex: 1, minWidth: 280, background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
      <h3 style={{ marginTop: 0 }}>{title} ({items.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(it => (
          <details key={it.key} style={{ background: '#fff', border: '1px solid #e6e6e6', borderRadius: 6, padding: 8 }}>
            <summary>
              <strong>[{it.key}]</strong> {it.summary} &nbsp;
              <a href={`${jiraUrl}/browse/${it.key}`} target="_blank" rel="noreferrer">Open</a>
            </summary>
            <ul>
              {(subtasksByParent[it.key] || []).map(st => (
                <li key={st.key}>
                  <a href={`${jiraUrl}/browse/${st.key}`} target="_blank" rel="noreferrer"><strong>{st.key}</strong></a>
                  &nbsp;— {st.summary} <em>({st.status})</em>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  )
}

const KanbanBoard: React.FC<{ jiraUrl: string; project: string; issuetype: string; user: string; }> = ({ jiraUrl, project, issuetype, user }) => {
  const [columns, setColumns] = useState<Columns>({})
  const [order, setOrder] = useState<string[]>([])
  const [subtasksByParent, setSubtasksByParent] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const data = await window.api.fetchMyWork(jiraUrl, project, issuetype, user)
      setColumns(data.columns || {})
      setOrder(data.initiativesOrdered || [])
      setSubtasksByParent(data.subtasksByParent || {})
    } catch (e:any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [jiraUrl, project, issuetype, user])

  if (loading) return <p>Loading…</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  // Order columns in a friendly order
  const statusOrder = ['Funnel', 'Reviewing', 'Analyzing']
  const allStatuses = Object.keys(columns)
  const sortedStatuses = [...statusOrder, ...allStatuses.filter(s => !statusOrder.includes(s))]

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {sortedStatuses.map(status => (
        <Column key={status} title={status} items={columns[status] || []} subtasksByParent={subtasksByParent} jiraUrl={jiraUrl} />
      ))}
    </div>
  )
}

export default KanbanBoard
