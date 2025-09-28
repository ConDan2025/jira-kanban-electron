import React, { useEffect, useState, useCallback } from 'react'
import { Container, Row, Col, Card, Spinner, Alert, Accordion, ListGroup, Badge, Button } from 'react-bootstrap'

type Subtask = { key: string; summary: string; status: string; duedate?: string }
type Initiative = { key: string; summary: string; status: string }
type Columns = Record<string, Initiative[]>

const statusColor = (status: string): string => {
  const s = status.toLowerCase()
  if (s.includes('done') || s.includes('closed')) return 'success'
  if (s.includes('progress') || s.includes('working')) return 'warning'
  if (s.includes('todo') || s.includes('backlog')) return 'secondary'
  if (s.includes('review')) return 'info'
  if (s.includes('analyz')) return 'primary'
  if (s.includes('funnel')) return 'secondary'
  return 'dark'
}

const columnBg = (status: string): string => {
  const s = status.toLowerCase()
  if (s.includes('funnel')) return '#f8f9fa'
  if (s.includes('review')) return '#e8f4fd'
  if (s.includes('analyz')) return '#fef6e4'
  return '#ffffff'
}

interface KanbanProps {
  jiraUrl: string
  project: string
  issuetype: string
  user: string
  search: string
  refreshInterval: number
  refreshKey: number
}

const KanbanBoard: React.FC<KanbanProps> = ({ jiraUrl, project, issuetype, user, search, refreshInterval, refreshKey }) => {
  const [columns, setColumns] = useState<Columns>({})
  const [subtasksByParent, setSubtasksByParent] = useState<Record<string, Subtask[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({})
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({})
  const [showExtra, setShowExtra] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api!.fetchMyWork(jiraUrl, project, issuetype, user)
      setColumns(data.columns || {})
      setSubtasksByParent(data.subtasksByParent || {})

      const initialCounts: Record<string, number> = {}
      const initExpand: Record<string, boolean> = {}
      Object.keys(data.columns || {}).forEach(status => {
        initialCounts[status] = 5
        initExpand[status] = true
      })
      setVisibleCount(initialCounts)
      setExpandedCols(initExpand)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [jiraUrl, project, issuetype, user])

  // manual + auto refresh
  useEffect(() => {
    load()
    if (refreshInterval > 0) {
      const id = setInterval(() => load(), refreshInterval * 60000)
      return () => clearInterval(id)
    }
  }, [load, refreshInterval, refreshKey])

  if (loading) return <Spinner animation="border" role="status"><span className="visually-hidden">Loading…</span></Spinner>
  if (error) return <Alert variant="danger">{error}</Alert>

  const coreStatuses = ['Funnel', 'Reviewing', 'Analyzing']
  const allStatuses = Object.keys(columns)
  const extraStatuses = allStatuses.filter(s => !coreStatuses.includes(s))

  const statusesToShow = showExtra ? [...coreStatuses, ...extraStatuses] : coreStatuses

  const isOverdue = (duedate?: string) => {
    if (!duedate) return false
    const due = new Date(duedate)
    const today = new Date()
    return due < today
  }

  return (
    <Container fluid>
      <Row className="g-3 flex-nowrap" style={{ overflowX: 'auto' }}>
        {statusesToShow.map(status => {
          const initiatives = (columns[status] || []).filter(it =>
            it.summary.toLowerCase().includes(search.toLowerCase()) ||
            it.key.toLowerCase().includes(search.toLowerCase()) ||
            it.status.toLowerCase().includes(search.toLowerCase())
          )
          const visible = visibleCount[status] || 5
          const showMore = initiatives.length > visible

          return (
            <Col key={status} style={{ minWidth: 300, maxWidth: 350 }}>
              <div
                style={{
                  background: columnBg(status),
                  borderRadius: 8,
                  padding: '8px',
                  maxHeight: '85vh',
                  overflowY: 'auto'
                }}
              >
                {/* Sticky header */}
                <div
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000,
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: columnBg(status),
                    borderBottom: '2px solid #dee2e6',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    fontWeight: 'bold',
                    padding: '0 8px'
                  }}
                >
                  <span>{status} <Badge bg="dark">{initiatives.length}</Badge></span>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => setExpandedCols({ ...expandedCols, [status]: !expandedCols[status] })}
                  >
                    {expandedCols[status] ? 'Collapse all' : 'Expand all'}
                  </Button>
                </div>

                {/* Initiative cards */}
                {initiatives.slice(0, visible).map(it => {
                  const subtasks = subtasksByParent[it.key] || []
                  const doneCount = subtasks.filter(st => st.status.toLowerCase().includes('done')).length
                  const totalCount = subtasks.length

                  return (
                    <Card key={it.key} className="mb-3 shadow-sm">
                      <Card.Header>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <a href={`${jiraUrl}/browse/${it.key}`} target="_blank" rel="noreferrer">
                              <strong>[{it.key}]</strong>
                            </a> {it.summary}
                          </div>
                          <div className="text-end">
                            {totalCount > 0 && (
                              <Badge bg="secondary" className="me-1">
                                {doneCount}/{totalCount}
                              </Badge>
                            )}
                            <Badge bg={statusColor(it.status)}>{it.status}</Badge>
                          </div>
                        </div>
                      </Card.Header>
                      {expandedCols[status] && subtasks.length > 0 && (
                        <Accordion>
                          <Accordion.Item eventKey="0">
                            <Accordion.Header>Subtasks</Accordion.Header>
                            <Accordion.Body>
                              <ListGroup variant="flush">
                                {subtasks.map(st => (
                                  <ListGroup.Item
                                    key={st.key}
                                    style={isOverdue(st.duedate) ? { color: 'red', fontWeight: 'bold' } : {}}
                                  >
                                    <a href={`${jiraUrl}/browse/${st.key}`} target="_blank" rel="noreferrer">
                                      <strong>{st.key}</strong>
                                    </a>
                                    &nbsp;— {st.summary}{' '}
                                    <Badge bg={statusColor(st.status)}>{st.status}</Badge>
                                    {st.duedate && (
                                      <span className="ms-2 small text-muted">({st.duedate})</span>
                                    )}
                                  </ListGroup.Item>
                                ))}
                              </ListGroup>
                            </Accordion.Body>
                          </Accordion.Item>
                        </Accordion>
                      )}
                    </Card>
                  )
                })}

                {showMore && (
                  <div className="d-grid mb-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() =>
                        setVisibleCount({ ...visibleCount, [status]: visible + 5 })
                      }
                    >
                      Load more…
                    </Button>
                  </div>
                )}
              </div>
            </Col>
          )
        })}

        {!showExtra && extraStatuses.length > 0 && (
          <Col style={{ minWidth: 150, maxWidth: 200 }}>
            <div
              style={{
                background: '#f1f3f5',
                borderRadius: 8,
                height: '85vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Button variant="outline-secondary" onClick={() => setShowExtra(true)}>
                + Show More ({extraStatuses.length})
              </Button>
            </div>
          </Col>
        )}
      </Row>
    </Container>
  )
}

export default KanbanBoard
