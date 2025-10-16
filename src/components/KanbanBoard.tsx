import React, { useEffect, useState, useCallback } from "react"
import { Container, Row, Col, Card, Spinner, Alert, Accordion, ListGroup, Badge, Button } from "react-bootstrap"

type Subtask = {
  key: string
  summary: string
  status: string
  duedate?: string | null
}

type Initiative = {
  key: string
  summary: string
  status: string
  fixVersions?: string[]
  targetEnd?: string | null // customfield_14221 from Jira
}

type Columns = Record<string, Initiative[]>

const statusColor = (status: string): string => {
  const s = status.toLowerCase()
  if (s.includes("done") || s.includes("closed")) return "success"
  if (s.includes("progress") || s.includes("working") || s.includes("in progress")) return "warning"
  if (s.includes("todo") || s.includes("backlog")) return "secondary"
  if (s.includes("review")) return "info"
  if (s.includes("analyz")) return "primary"
  if (s.includes("funnel")) return "secondary"
  return "dark"
}

const columnBg = (status: string): string => {
  const s = status.toLowerCase()
  if (s.includes("funnel")) return "#f8f9fa"
  if (s.includes("review")) return "#e8f4fd"
  if (s.includes("analyz")) return "#fef6e4"
  return "#ffffff"
}

interface KanbanProps {
  jiraUrl: string
  project: string
  issuetype: string
  user: string
  search: string
  refreshInterval: number
  refreshKey: number
  showFixVersions?: boolean
  showTargetEnd?: boolean
}

const KanbanBoard: React.FC<KanbanProps> = ({
  jiraUrl,
  project,
  issuetype,
  user,
  search,
  refreshInterval,
  refreshKey,
  showFixVersions,
  showTargetEnd
}) => {
  const [columns, setColumns] = useState<Columns>({})
  const [subtasksByParent, setSubtasksByParent] = useState<Record<string, Subtask[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({})
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({})
  const [showExtra, setShowExtra] = useState(false)

  const isOverdue = (dateStr?: string | null) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const today = new Date()
    d.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return d < today
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.fetchMyWork(jiraUrl, project, issuetype, user)
      setColumns(data.columns || {})
      setSubtasksByParent(data.subtasksByParent || {})

      const initialCounts: Record<string, number> = {}
      const initExpand: Record<string, boolean> = {}
      Object.keys(data.columns || {}).forEach((status) => {
        initialCounts[status] = 5
        initExpand[status] = true
      })
      setVisibleCount(initialCounts)
      setExpandedCols(initExpand)
    } catch (e: any) {
      setError(e?.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [jiraUrl, project, issuetype, user])

  // initial + interval + manual refresh
  useEffect(() => {
    load()
    if (refreshInterval > 0) {
      const id = setInterval(load, refreshInterval * 60000)
      return () => clearInterval(id)
    }
  }, [load, refreshInterval, refreshKey])

  if (loading) {
    return (
      <div className="d-flex align-items-center">
        <Spinner animation="border" role="status" className="me-2" />
        <span>Loading…</span>
      </div>
    )
  }
  if (error) return <Alert variant="danger">{error}</Alert>

  const coreStatuses = ["Funnel", "Reviewing", "Analyzing"]
  const allStatuses = Object.keys(columns)
  const extraStatuses = allStatuses.filter((s) => !coreStatuses.includes(s))
  const statusesToShow = showExtra ? [...coreStatuses, ...extraStatuses] : coreStatuses

  return (
    <Container fluid>
      <Row className="g-3 flex-nowrap" style={{ overflowX: "auto" }}>
        {statusesToShow.map((status) => {
          const initiatives = (columns[status] || []).filter((it) => {
            const q = search.toLowerCase()
            return (
              it.summary.toLowerCase().includes(q) ||
              it.key.toLowerCase().includes(q) ||
              it.status.toLowerCase().includes(q) ||
              (showFixVersions && (it.fixVersions || []).some((v) => v.toLowerCase().includes(q))) ||
              (showTargetEnd && it.targetEnd && it.targetEnd.toLowerCase().includes(q))
            )
          })

          const visible = visibleCount[status] || 5
          const showMore = initiatives.length > visible

          return (
            <Col key={status} style={{ minWidth: 300, maxWidth: 350 }}>
              <div
                style={{
                  background: columnBg(status),
                  borderRadius: 8,
                  padding: "8px",
                  maxHeight: "85vh",
                  overflowY: "auto"
                }}
              >
                {/* Sticky header */}
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1000,
                    height: "50px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: columnBg(status),
                    borderBottom: "2px solid #dee2e6",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                    fontWeight: "bold",
                    padding: "0 8px"
                  }}
                >
                  <span>
                    {status} <Badge bg="dark">{initiatives.length}</Badge>
                  </span>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => setExpandedCols({ ...expandedCols, [status]: !expandedCols[status] })}
                  >
                    {expandedCols[status] ? "Collapse all" : "Expand all"}
                  </Button>
                </div>

                {/* Initiative cards */}
                {initiatives.slice(0, visible).map((it) => {
                  const subtasks = subtasksByParent[it.key] || []
                  const doneCount = subtasks.filter((st) => st.status.toLowerCase().includes("done")).length
                  const totalCount = subtasks.length

                  return (
                    <Card key={it.key} className="mb-3 shadow-sm">
                      <Card.Header>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <a href={`${jiraUrl}/browse/${it.key}`} target="_blank" rel="noreferrer">
                              <strong>[{it.key}]</strong>
                            </a>{" "}
                            {it.summary}
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

                        {/* Fix Versions badges (optional) */}
                        {showFixVersions && it.fixVersions && it.fixVersions.length > 0 && (
                          <div className="mt-2 d-flex flex-wrap gap-1">
                            {it.fixVersions.map((v) => (
                              <Badge key={v} bg="secondary" className="text-wrap">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Target End Date (customfield_14221) */}
                        {showTargetEnd && it.targetEnd && (
                          <div className="mt-1 small text-muted">
                            📅 Target End:{" "}
                            <span
                              style={{
                                color: isOverdue(it.targetEnd) ? "red" : "inherit",
                                fontWeight: isOverdue(it.targetEnd) ? "bold" : "normal"
                              }}
                            >
                              {it.targetEnd}
                            </span>
                          </div>
                        )}
                      </Card.Header>

                      {expandedCols[status] && subtasks.length > 0 && (
                        <Accordion>
                          <Accordion.Item eventKey="0">
                            <Accordion.Header>Subtasks</Accordion.Header>
                            <Accordion.Body>
                              <ListGroup variant="flush">
                                {subtasks.map((st) => (
                                  <ListGroup.Item
                                    key={st.key}
                                    style={isOverdue(st.duedate) ? { color: "red", fontWeight: "bold" } : {}}
                                  >
                                    <a href={`${jiraUrl}/browse/${st.key}`} target="_blank" rel="noreferrer">
                                      <strong>{st.key}</strong>
                                    </a>
                                    &nbsp;— {st.summary}{" "}
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

                {/* Load more */}
                {showMore && (
                  <div className="d-grid mb-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setVisibleCount({ ...visibleCount, [status]: visible + 5 })}
                    >
                      Load more…
                    </Button>
                  </div>
                )}
              </div>
            </Col>
          )
        })}

        {/* Show More statuses column */}
        {!showExtra && extraStatuses.length > 0 && (
          <Col style={{ minWidth: 150, maxWidth: 200 }}>
            <div
              style={{
                background: "#f1f3f5",
                borderRadius: 8,
                height: "85vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
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
