# Real-Time Collaborative System Design Interview Platform

**Document Version:** 1.0  
**Status:** Production Specification  
**Target:** Web-based MVP → scalable collaborative platform  
**Primary Users:** Interviewers and Candidates  
**Optional Users:** Observers and Administrators

---

# 1. Goals and Scope

## 1.1 Product Goal

Build a browser-based platform where an interviewer and one or more candidates can collaboratively perform a system-design interview using a shared, real-time canvas.

The platform should provide an experience similar to a shared whiteboard, but optimized for software/system architecture interviews.

Participants can:

- Create and move architecture components.
- Connect components with directional edges.
- Draw free-form diagrams.
- Add annotations.
- See other participants' cursors and presence.
- Collaboratively modify the same canvas.
- Communicate through session chat.
- Save and restore session state.
- Review an audit history of important actions.

The system must remain responsive when multiple users edit the same canvas simultaneously.

---

## 1.2 Primary Workflow

### Interviewer

1. Authenticate.
2. Create an interview session.
3. Configure session options.
4. Receive a unique shareable link.
5. Share the link with the candidate.
6. Candidate joins.
7. Interviewer and candidate collaborate on the canvas.
8. Interviewer controls session state when necessary.
9. Interviewer saves/ends the session.
10. Session data remains available according to retention policy.

### Candidate

1. Open invitation link.
2. Enter display name/authenticate as required.
3. Join the session.
4. View the existing canvas.
5. Create and manipulate allowed canvas objects.
6. Collaborate in real time.
7. Leave the session.

### Observer

Optional read-only role.

Can:

- View canvas.
- View participant presence.
- View chat if permitted.

Cannot modify the canvas.

### Administrator

Can:

- Manage users.
- Manage sessions.
- Investigate audit logs.
- Moderate active sessions.
- Configure platform-level settings.

---

# 2. Goals

## 2.1 Functional Goals

The platform must:

- Support creation of interview sessions.
- Generate secure shareable invitation links.
- Support multiple simultaneous participants.
- Synchronize canvas changes in real time.
- Display participant presence.
- Support architecture components.
- Support directed connections.
- Support free-form drawing.
- Persist canvas state.
- Support undo/redo.
- Maintain an audit trail.
- Enforce role-based permissions.
- Recover gracefully from temporary network failures.

## 2.2 Non-Goals for MVP

The MVP will NOT initially include:

- AI-generated architecture diagrams.
- Automatic system-design grading.
- Video conferencing.
- Screen sharing.
- Voice communication.
- Advanced UML modeling.
- Full BPMN support.
- Complex diagram auto-layout.
- Offline-first editing.
- Advanced analytics.
- Session playback.

These can be added later.

---

# 3. Recommended Technology Stack

## 3.1 Primary Recommendation

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Canvas | tldraw or React Flow + custom drawing layer |
| State | Zustand |
| Real-time | WebSockets |
| Backend | TypeScript + Node.js |
| API | REST |
| Real-time protocol | WebSocket |
| Database | PostgreSQL |
| Cache/presence | Redis |
| Object storage | Amazon S3 |
| Authentication | Auth0, Clerk, Cognito, or custom OIDC |
| Hosting | AWS |
| Containers | ECS/Fargate |
| Load balancing | Application Load Balancer |
| CDN | CloudFront |
| Observability | OpenTelemetry + CloudWatch/Grafana |
| Infrastructure | Terraform |
| CI/CD | GitHub Actions |

### Recommended initial deployment

```text
CloudFront
    |
    v
React SPA
    |
    +--------------------+
    |                    |
    v                    v
REST API             WebSocket API
    |                    |
    +----------+---------+
               |
               v
        Application Service
          /           \
         v             v
   PostgreSQL         Redis
         |
         v
        S3
```

---

# 4. Why This Stack

## React + TypeScript

Chosen because:

- Excellent ecosystem.
- Strong typing.
- Good fit for collaborative UI.
- Large hiring pool.
- Easy integration with canvas libraries.

## WebSockets

Chosen for real-time synchronization because:

- Persistent connection.
- Low overhead.
- Bidirectional communication.
- Excellent fit for collaborative editing.

Alternative:

**WebRTC**

Useful for peer-to-peer communication but unnecessarily complex for the initial architecture.

## PostgreSQL

Chosen as the system of record because the platform has strongly related entities:

```text
User
  |
  +-- Session
        |
        +-- Participants
        +-- Canvas Items
        +-- Messages
        +-- Snapshots
        +-- Audit Logs
```

PostgreSQL also provides transactions, indexing, constraints, JSONB, and mature operational tooling.

Alternative:

DynamoDB is possible, particularly for an AWS-native architecture, but PostgreSQL is easier for MVP development and relational queries.

## Redis

Used for:

- Presence.
- WebSocket connection coordination.
- Pub/sub.
- Short-lived session state.
- Rate limiting.

Redis should NOT be the permanent source of truth.

---

# 5. High-Level Architecture

```text
                    ┌─────────────────────┐
                    │     Browser         │
                    │ React + TypeScript  │
                    │ Canvas + UI         │
                    └──────────┬──────────┘
                               │
                    HTTPS / WSS│
                               │
                 ┌─────────────▼─────────────┐
                 │       CloudFront          │
                 │         + WAF             │
                 └─────────────┬─────────────┘
                               │
             ┌─────────────────┴─────────────────┐
             │                                   │
       ┌─────▼─────┐                       ┌─────▼─────┐
       │ REST API  │                       │ WebSocket │
       │ Service   │                       │ Gateway   │
       └─────┬─────┘                       └─────┬─────┘
             │                                   │
             └────────────────┬──────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Collaboration     │
                    │ Service           │
                    └──────┬─────┬──────┘
                           │     │
                 ┌─────────┘     └──────────┐
                 ▼                          ▼
          ┌─────────────┐             ┌──────────┐
          │ PostgreSQL  │             │  Redis   │
          └──────┬──────┘             └──────────┘
                 │
                 ▼
             ┌───────┐
             │  S3   │
             └───────┘
```

---

# 6. Deployment Architecture

## 6.1 AWS Recommendation

Use:

- CloudFront
- AWS WAF
- Application Load Balancer
- ECS/Fargate
- RDS PostgreSQL
- ElastiCache Redis
- S3
- CloudWatch
- Secrets Manager
- KMS
- Route 53
- ECR

## 6.2 Security Zones

### Public Zone

Only:

- CloudFront
- ALB

should be internet-facing.

### Application Zone

ECS services run in private subnets.

### Data Zone

RDS and Redis run in private subnets.

```text
Internet
   |
CloudFront/WAF
   |
ALB
   |
Private Application Subnets
   |
   +---- API
   +---- WebSocket
   |
Private Data Subnets
   |
   +---- PostgreSQL
   +---- Redis
```

---

# 7. Multi-Session Isolation

Every collaborative operation must contain a `sessionId`.

Example:

```json
{
  "sessionId": "ses_123",
  "operationId": "op_456",
  "type": "canvas.item.move"
}
```

The server MUST verify:

```text
Authenticated user
       |
       v
Participant?
       |
       v
Member of session?
       |
       v
Authorized for operation?
       |
       v
Apply operation
```

A user connected to Session A must never receive events from Session B.

---

# 8. User Roles and Permissions

## 8.1 Roles

### Interviewer

Session owner.

Permissions:

- Create session.
- Edit canvas.
- Delete canvas items.
- Move items.
- Create edges.
- Delete edges.
- Draw.
- Annotate.
- Chat.
- Invite participants.
- Save.
- Export.
- End session.
- Lock canvas.
- Remove participant.

### Candidate

Permissions:

- View canvas.
- Create components.
- Move components.
- Create connections.
- Draw.
- Annotate.
- Chat.
- Undo own operations where supported.

Cannot:

- Delete the entire session.
- Remove participants.
- Change session security settings.
- End the session.

### Observer

Read-only.

Can:

- View canvas.
- View presence.
- View allowed chat.

Cannot modify.

### Administrator

Platform-level management.

---

# 9. Permission Matrix

| Action | Interviewer | Candidate | Observer | Admin |
|---|---:|---:|---:|---:|
| Create session | ✓ | ✗ | ✗ | ✓ |
| Join session | ✓ | ✓ | ✓ | ✓ |
| Create component | ✓ | ✓ | ✗ | ✓ |
| Move component | ✓ | ✓ | ✗ | ✓ |
| Delete component | ✓ | ✓* | ✗ | ✓ |
| Create edge | ✓ | ✓ | ✗ | ✓ |
| Delete edge | ✓ | ✓* | ✗ | ✓ |
| Draw | ✓ | ✓ | ✗ | ✓ |
| Annotate | ✓ | ✓ | ✗ | ✓ |
| Chat | ✓ | ✓ | optional | ✓ |
| Invite | ✓ | ✗ | ✗ | ✓ |
| Export | ✓ | optional | ✗ | ✓ |
| Lock canvas | ✓ | ✗ | ✗ | ✓ |
| End session | ✓ | ✗ | ✗ | ✓ |
| Remove participant | ✓ | ✗ | ✗ | ✓ |
| View audit log | ✓ | limited | ✗ | ✓ |

`*` Configurable by interviewer.

---

# 10. Data Model

## 10.1 User

```text
User
----
id
externalAuthId
email
displayName
avatarUrl
status
createdAt
updatedAt
```

---

## 10.2 Session

```text
Session
-------
id
ownerId
title
description
status
joinCode
settings
createdAt
startedAt
endedAt
expiresAt
version
```

Status:

```text
CREATED
ACTIVE
PAUSED
ENDED
EXPIRED
```

---

## 10.3 SessionParticipant

```text
SessionParticipant
------------------
id
sessionId
userId
role
displayName
joinedAt
leftAt
lastSeenAt
status
permissions
```

---

# 11. CanvasItem

Use a polymorphic canvas object.

```text
CanvasItem
----------
id
sessionId
type
version
createdBy
x
y
width
height
rotation
zIndex
parentId
data
createdAt
updatedAt
deletedAt
```

Possible types:

```text
COMPONENT
EDGE
DRAWING
ANNOTATION
GROUP
```

---

# 12. Component

Example:

```json
{
  "id": "cmp_123",
  "type": "COMPONENT",
  "componentType": "DATABASE",
  "catalogId": "postgresql",
  "position": {
    "x": 450,
    "y": 200
  },
  "size": {
    "width": 180,
    "height": 100
  },
  "label": "User Database",
  "metadata": {
    "technology": "PostgreSQL"
  }
}
```

---

# 13. ComponentCatalog

Provides reusable component definitions.

```text
ComponentCatalog
----------------
id
name
category
icon
description
defaultWidth
defaultHeight
ports
metadata
version
isActive
```

Initial catalog:

### Infrastructure

- Generic Server
- Load Balancer
- API Gateway
- CDN
- Cache
- Queue

### Databases

- SQL Database
- NoSQL Database
- Q Database
- Vector Database

### AI

- LLM
- Embedding Model
- RAG
- AI Agent

### Messaging

- Message Queue
- Event Bus
- Pub/Sub

### Generic

- Box
- External Service
- User
- Mobile Client
- Web Client

The initial MVP should use a small catalog rather than attempting to recreate every cloud provider.

---

# 14. Edge

```text
Edge
----
id
sessionId
sourceItemId
sourcePort
targetItemId
targetPort
direction
label
routing
style
version
createdBy
createdAt
updatedAt
```

Example:

```json
{
  "id": "edge_123",
  "sourceItemId": "cmp_api",
  "targetItemId": "cmp_db",
  "direction": "FORWARD",
  "label": "SQL queries"
}
```

Edges are directional.

---

# 15. Annotation

```text
Annotation
----------
id
sessionId
itemId
authorId
text
position
createdAt
updatedAt
```

Annotations may be:

- Text labels.
- Comments.
- Interviewer notes.

Private interviewer notes must be stored separately or marked with explicit visibility.

---

# 16. Message / Chat

```text
Message
-------
id
sessionId
senderId
content
createdAt
editedAt
deletedAt
```

---

# 17. Snapshot

A snapshot represents a complete recoverable canvas state.

```text
Snapshot
--------
id
sessionId
version
createdBy
state
createdAt
```

Snapshots provide recovery points and facilitate future replay.

---

# 18. AuditLog

```text
AuditLog
--------
id
sessionId
actorId
action
resourceType
resourceId
operationId
before
after
timestamp
metadata
```

Example:

```json
{
  "action": "CANVAS_ITEM_DELETED",
  "resourceType": "COMPONENT",
  "resourceId": "cmp_123",
  "actorId": "usr_456"
}
```

Audit logs should be append-only from the application's perspective.

---

# 19. Canvas Behavior

## 19.1 Coordinate System

Canvas uses an infinite or large virtual coordinate system.

Example:

```text
x = 1200
y = 650
```

The UI converts world coordinates into screen coordinates based on:

```text
zoom
panX
panY
```

---

# 20. Drag and Drop

When dragging:

1. Client immediately updates local position.
2. Client sends movement operation.
3. Server validates authorization.
4. Server assigns operation/version.
5. Server broadcasts operation.
6. Other clients apply operation.

The originating client should not wait for the server before rendering movement.

This provides optimistic UI.

---

# 21. Snapping

MVP:

- Optional grid.
- Default grid size: 8 or 16 pixels.
- Snap while dragging.
- User can disable snapping.

Future:

- Alignment guides.
- Smart spacing.
- Auto-layout.

---

# 22. Grouping

MVP:

- Optional parent/child relationship.

Future:

- Multi-select.
- Group/ungroup.
- Nested groups.
- Resizable containers.

---

# 23. Connection Semantics

Connections are directed:

```text
Client
   |
   v
API Gateway
   |
   v
Service
   |
   v
Database
```

Each component can expose ports.

Example:

```json
{
  "ports": [
    {
      "id": "input",
      "direction": "IN"
    },
    {
      "id": "output",
      "direction": "OUT"
    }
  ]
}
```

The server validates:

- Source exists.
- Target exists.
- Both belong to same session.
- Source port exists.
- Target port exists.
- User has permission.
- Self-connections are either rejected or explicitly allowed.

MVP routing:

```text
Straight line
```

Future:

```text
Orthogonal routing
Bezier routing
Automatic obstacle avoidance
```

---

# 24. Free-Form Drawing

The drawing system should use an ink/stroke model.

```json
{
  "type": "DRAWING",
  "points": [
    {"x": 100, "y": 100},
    {"x": 104, "y": 105},
    {"x": 109, "y": 111}
  ],
  "strokeWidth": 3,
  "tool": "PEN"
}
```

Supported MVP tools:

- Pen.
- Eraser.
- Basic color selection.
- Stroke width.
- Undo.

Drawings should be grouped into strokes rather than individual points being persisted as separate database records.

---

# 25. Persistence Strategy

Use three levels.

## Level 1 — Real-Time Operations

Operations are transmitted through WebSockets.

## Level 2 — Database Persistence

Accepted operations update persistent state.

## Level 3 — Snapshots

Create periodic snapshots.

Recommended:

```text
Every 50–100 operations
OR
Every 30–60 seconds
```

whichever comes first.

This allows recovery without replaying an enormous operation log.

---

# 26. Autosave

Autosave is enabled by default.

User should see:

```text
Saving...
Saved
Offline
Reconnecting...
```

The UI must never imply that data has been permanently saved until the server acknowledges persistence.

---

# 27. Undo / Redo

Use operation-based undo rather than simply restoring an old canvas snapshot.

Example:

```text
Move component A
Move component A
Delete component B
```

Undo:

```text
Restore component B
```

The system should avoid globally undoing another user's unrelated action.

MVP recommendation:

**Undo the current user's own operations.**

Future versions can introduce collaborative semantic undo.

---

# 28. Real-Time Collaboration Model

## 28.1 Recommended Strategy

Use:

**Operation-based synchronization + server-authoritative ordering.**

For the canvas MVP, a full CRDT implementation is unnecessary.

Why:

- Most canvas operations are discrete.
- Objects have IDs.
- Operations can be represented compactly.
- Server ordering is easier to reason about.
- PostgreSQL provides durable state.
- Conflict scenarios are manageable.

---

# 29. OT vs CRDT

| Requirement | OT | CRDT |
|---|---:|---:|
| Text collaboration | Excellent | Excellent |
| Canvas objects | Good | Excellent |
| Implementation complexity | Medium | High |
| Offline-first | More difficult | Excellent |
| Server authority | Excellent | Good |
| MVP suitability | High | Medium |

### Decision

Use **server-authoritative operation ordering for MVP**.

Consider CRDT later if:

- Offline editing becomes important.
- Large-scale peer collaboration is required.
- Users frequently edit the same object simultaneously.

---

# 30. Operation Model

Every operation receives:

```text
operationId
sessionId
actorId
sequenceNumber
type
payload
timestamp
```

Example:

```json
{
  "operationId": "op_123",
  "sessionId": "ses_123",
  "actorId": "usr_456",
  "sequence": 103,
  "type": "ITEM_MOVE",
  "payload": {
    "itemId": "cmp_123",
    "x": 500,
    "y": 300
  }
}
```

---

# 31. Conflict Resolution

## Example

User A moves component:

```text
A → x=500
```

User B moves same component:

```text
B → x=700
```

The server determines ordering.

For MVP:

```text
Last accepted operation wins.
```

The final state becomes:

```text
x=700
```

The server broadcasts the canonical result.

---

# 32. Optimistic Concurrency

Every item has a version.

Example:

```text
Component version = 8
```

Client sends:

```json
{
  "itemId": "cmp_123",
  "expectedVersion": 8,
  "x": 500
}
```

Server checks:

```text
Current version = 8
```

Accept.

Then:

```text
version = 9
```

If current version is 9:

```text
CONFLICT
```

Server returns canonical state.

---

# 33. Presence

Presence should include:

```text
userId
displayName
role
cursorPosition
selectedItemId
connectionStatus
lastSeen
```

Example:

```json
{
  "userId": "usr_123",
  "displayName": "Candidate",
  "role": "CANDIDATE",
  "cursor": {
    "x": 450,
    "y": 320
  },
  "status": "ONLINE"
}
```

Cursor updates should NOT be persisted to PostgreSQL.

Recommended:

```text
20–30 updates/sec maximum
```

and throttle/coalesce client updates.

---

# 34. WebSocket Channels

Each session represents a logical collaboration room:

```text
session:{sessionId}
```

Clients only subscribe after server authorization.

Events:

```text
session.joined
session.left
presence.updated

canvas.item.created
canvas.item.updated
canvas.item.deleted

canvas.edge.created
canvas.edge.deleted

drawing.created
drawing.deleted

annotation.created
annotation.updated

session.saved
session.locked
session.ended
```

---

# 35. Reconnection

When disconnected:

```text
CONNECTED
   |
   v
DISCONNECTED
   |
   v
RECONNECTING
   |
   +---- success ---> RESYNC
   |
   +---- failure ---> retry
```

Exponential backoff:

```text
1s
2s
4s
8s
16s
30s maximum
```

After reconnection:

1. Client sends last known sequence.
2. Server determines missing operations.
3. Server sends missed operations.
4. Client applies them.
5. Client verifies state version.

---

# 36. Offline Support

Full offline-first editing is not MVP.

MVP behavior:

- Detect network loss.
- Disable server-dependent operations where necessary.
- Preserve unsent local operations temporarily.
- Attempt reconnection.
- Resynchronize.

Phase 2 can introduce durable offline queues and CRDT-based synchronization.

---

# 37. Authentication

Recommended:

**OIDC/OAuth 2.0**

Possible providers:

- Amazon Cognito.
- Auth0.
- Clerk.
- Enterprise SSO.

For MVP:

- Interviewer authentication required.
- Candidate can join using secure invitation token plus display name.

---

# 38. Invitation Links

Never use:

```text
/session/123
```

as an authorization mechanism.

Instead:

```text
/join/{random-high-entropy-token}
```

Token requirements:

- Cryptographically random.
- At least 128 bits of entropy.
- Stored hashed when practical.
- Revocable.
- Optional expiration.
- Optional maximum uses.

Example:

```text
https://app.example.com/join/7f3...
```

---

# 39. Session Security

Session invitation settings:

```text
Anyone with link
Link + name
Link + authenticated account
Password protected
```

MVP:

**Random invitation link + display name.**

Optional interviewer setting:

```text
Require approval to join
```

can be added in Phase 2.

---

# 40. Rate Limiting

Apply limits at:

### IP

For:

- Login attempts.
- Join attempts.
- API requests.

### User

For:

- Session creation.
- Messages.
- Exports.

### Session

For:

- Canvas operations.
- WebSocket events.

Example initial limits:

```text
REST:
100 requests/min/user

Join:
10 attempts/min/IP

Chat:
10 messages/sec/user

Canvas:
200 operations/sec/session
```

These are starting values and should be adjusted using production telemetry.

---

# 41. Data Privacy

Requirements:

- TLS everywhere.
- Encryption at rest.
- Secrets stored in Secrets Manager.
- Database credentials never committed to source control.
- Least-privilege IAM.
- Tenant/session isolation.
- Audit access to sensitive information.
- Avoid storing unnecessary candidate personal information.

---

# 42. Auditability

Audit important actions:

```text
SESSION_CREATED
SESSION_JOINED
SESSION_ENDED

COMPONENT_CREATED
COMPONENT_UPDATED
COMPONENT_DELETED

EDGE_CREATED
EDGE_DELETED

DRAWING_CREATED
DRAWING_DELETED

PERMISSION_CHANGED
PARTICIPANT_REMOVED

CANVAS_LOCKED
EXPORT_CREATED
```

Audit logs should be append-only.

For stronger tamper resistance:

- Store periodic audit-log hashes.
- Export immutable audit archives to S3.
- Enable S3 Object Lock for regulated deployments.

---

# 43. Non-Functional Requirements

## 43.1 Performance

Target:

| Metric | Target |
|---|---:|
| Initial page load | < 3 seconds |
| Canvas interaction | < 50 ms local response |
| WebSocket propagation | p95 < 150 ms |
| API latency | p95 < 300 ms |
| Session join | < 2 seconds |
| Autosave acknowledgment | p95 < 500 ms |

The local UI should respond immediately without waiting for the network.

---

# 44. Scalability

Initial target:

```text
10,000 concurrent sessions
50,000 concurrent WebSocket connections
```

MVP should initially be tested at a lower operational target, for example:

```text
1,000 concurrent sessions
5,000 concurrent connections
```

Architecture should allow horizontal scaling.

---

# 45. Reliability

Target:

```text
99.9% monthly availability
```

Requirements:

- Multi-AZ application deployment.
- RDS Multi-AZ.
- Automated backups.
- Health checks.
- Graceful WebSocket reconnection.
- Durable database persistence.
- Snapshot recovery.

---

# 46. Accessibility

Target:

**WCAG 2.2 AA**

Requirements:

- Keyboard navigation.
- Visible focus.
- Accessible buttons.
- Screen-reader labels.
- Sufficient contrast.
- Non-color-only indicators.
- Reduced-motion support.
- Zoom support.
- Keyboard-accessible component creation.
- Accessible session controls.

Canvas-specific functionality should have accessible alternatives.

For example:

```text
Canvas visual representation
+
Component list/tree view
```

This prevents the canvas from being the only way to understand the architecture.

---

# 47. Internationalization

Design for i18n from the beginning.

Requirements:

- Externalized UI strings.
- UTF-8 everywhere.
- Locale-aware dates.
- Locale-aware times.
- Time-zone aware timestamps.

Store timestamps in UTC.

Display according to user's locale/time zone.

---

# 48. Data Retention

Recommended defaults:

### Active sessions

Retain indefinitely until ended/expired.

### Completed sessions

Retain:

```text
90 days
```

for MVP.

Configurable by organization.

### Audit logs

```text
1 year
```

or organization-specific policy.

### Backups

Recommended:

```text
Daily snapshots
30-day recovery window
```

Retention should ultimately be configurable.

---

# 49. Monitoring

Monitor:

### Application

- Request latency.
- Error rate.
- WebSocket connections.
- WebSocket disconnects.
- Reconnection rate.
- Canvas operation rate.
- Conflict rate.

### Infrastructure

- CPU.
- Memory.
- Database connections.
- Redis memory.
- Network traffic.

### Product

- Session creation.
- Join success/failure.
- Average participants/session.
- Session duration.
- Canvas operations/session.

---

# 50. Logging

Use structured JSON logs.

Example:

```json
{
  "timestamp": "2026-09-13T18:00:00Z",
  "level": "INFO",
  "service": "collaboration-service",
  "sessionId": "ses_123",
  "userId": "usr_456",
  "operationId": "op_789",
  "event": "CANVAS_ITEM_UPDATED"
}
```

Never log:

- Passwords.
- Authentication tokens.
- Session invitation secrets.
- Sensitive personal information.

---

# 51. API Design

Base URL:

```text
/api/v1
```

---

# 52. Create Session

```http
POST /api/v1/sessions
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "title": "System Design Interview",
  "description": "Design a URL shortener",
  "settings": {
    "allowCandidateEditing": true,
    "allowCandidateDrawing": true
  }
}
```

Response:

```json
{
  "id": "ses_123",
  "title": "System Design Interview",
  "status": "CREATED",
  "joinUrl": "https://app.example.com/join/abc123",
  "createdAt": "2026-09-13T18:00:00Z"
}
```

---

# 53. Get Session

```http
GET /api/v1/sessions/{sessionId}
```

Response:

```json
{
  "id": "ses_123",
  "title": "System Design Interview",
  "status": "ACTIVE",
  "version": 42,
  "participants": [
    {
      "id": "usr_1",
      "role": "INTERVIEWER",
      "displayName": "Interviewer"
    },
    {
      "id": "usr_2",
      "role": "CANDIDATE",
      "displayName": "Candidate"
    }
  ]
}
```

---

# 54. Join Session

```http
POST /api/v1/sessions/join
```

Request:

```json
{
  "token": "abc123",
  "displayName": "Jane Doe"
}
```

Response:

```json
{
  "sessionId": "ses_123",
  "participantId": "part_456",
  "role": "CANDIDATE",
  "websocketUrl": "wss://realtime.example.com"
}
```

---

# 55. Get Canvas

```http
GET /api/v1/sessions/{sessionId}/canvas
```

Response:

```json
{
  "sessionId": "ses_123",
  "version": 42,
  "items": [
    {
      "id": "cmp_1",
      "type": "COMPONENT",
      "componentType": "API_GATEWAY",
      "x": 100,
      "y": 200
    }
  ],
  "edges": []
}
```

---

# 56. Create Component

```http
POST /api/v1/sessions/{sessionId}/canvas/items
```

Request:

```json
{
  "type": "COMPONENT",
  "componentType": "DATABASE",
  "x": 500,
  "y": 300,
  "label": "Users DB"
}
```

Response:

```json
{
  "id": "cmp_123",
  "version": 1,
  "type": "COMPONENT",
  "componentType": "DATABASE",
  "x": 500,
  "y": 300
}
```

---

# 57. WebSocket Protocol

Connect:

```text
wss://realtime.example.com/ws
```

Authenticate:

```json
{
  "type": "auth",
  "token": "<access-token>"
}
```

Join:

```json
{
  "type": "session.join",
  "sessionId": "ses_123"
}
```

---

# 58. WebSocket Canvas Event

Client → Server:

```json
{
  "type": "canvas.item.move",
  "operationId": "op_123",
  "sessionId": "ses_123",
  "itemId": "cmp_456",
  "expectedVersion": 4,
  "position": {
    "x": 500,
    "y": 300
  }
}
```

Server → Clients:

```json
{
  "type": "canvas.item.updated",
  "operationId": "op_123",
  "sessionId": "ses_123",
  "itemId": "cmp_456",
  "version": 5,
  "position": {
    "x": 500,
    "y": 300
  },
  "actorId": "usr_789"
}
```

---

# 59. Conflict Response

```json
{
  "type": "operation.rejected",
  "operationId": "op_123",
  "reason": "VERSION_CONFLICT",
  "canonicalItem": {
    "id": "cmp_456",
    "version": 5,
    "x": 600,
    "y": 350
  }
}
```

The client replaces its stale state with the canonical state.

---

# 60. Presence Event

```json
{
  "type": "presence.updated",
  "sessionId": "ses_123",
  "participant": {
    "id": "usr_123",
    "displayName": "Jane",
    "role": "CANDIDATE",
    "status": "ONLINE",
    "cursor": {
      "x": 450,
      "y": 250
    }
  }
}
```

---

# 61. Session State Machine

```text
CREATED
   |
   | candidate joins
   v
ACTIVE
   |
   | interviewer pauses
   v
PAUSED
   |
   | resume
   v
ACTIVE
   |
   | interviewer ends
   v
ENDED
   |
   | retention period expires
   v
EXPIRED
```

---

# 62. MVP Scope

The MVP should intentionally be small.

## Included

### Sessions

- Interviewer authentication.
- Create session.
- Generate invitation link.
- Candidate joins through link.
- Start/end session.

### Canvas

- Pan.
- Zoom.
- Basic boxes/components.
- Q database block.
- LLM block.
- Generic service block.
- Generic database block.
- Drag and drop.
- Resize.
- Delete.
- Directed connections.
- Free-form pen.
- Eraser.

### Collaboration

- Multiple users.
- WebSocket synchronization.
- Presence.
- Cursor indicators.
- Basic conflict handling.
- Reconnection.

### Persistence

- Autosave.
- Canvas restore.
- Session history.
- Basic audit logging.

### Permissions

- Interviewer.
- Candidate.
- Read-only observer.

---

# 63. Explicit MVP Exclusions

Do NOT build these before the core collaborative experience works:

- AI assistant.
- Advanced cloud icon library.
- Complex auto-layout.
- CRDT framework.
- Offline-first architecture.
- Video calling.
- Screen sharing.
- Advanced analytics.
- Enterprise SSO.
- Complex moderation.
- Full replay engine.

This protects the MVP from scope creep.

---

# 64. Phase 2

Add:

- Larger component library.
- AWS/GCP/Azure components.
- Import/export.
- PNG/SVG export.
- JSON export.
- Better connection routing.
- Groups.
- Templates.
- Session locking.
- Candidate approval.
- Enhanced annotations.
- Better undo/redo.

---

# 65. Phase 3

Add:

- Offline support.
- CRDT synchronization.
- Playback/replay.
- Operation timeline.
- Advanced audit history.
- Moderation.
- Organization/team support.
- Interview templates.
- Session analytics.

---

# 66. Phase 4 — AI Features

Potential capabilities:

### AI Interview Assistant

Analyze:

- Architecture decisions.
- Scalability concerns.
- Missing components.
- Bottlenecks.
- Tradeoffs.

### AI-generated feedback

Example:

```text
Strengths:
- Correctly identified caching requirements.
- Added asynchronous processing.

Areas to explore:
- Database partitioning.
- Failure handling.
- Rate limiting.
```

AI functionality should be separated from the core collaboration engine.

---

# 67. Acceptance Criteria — Sessions

### AC-SESSION-001

Given an authenticated interviewer,

when they create a session,

then the platform creates a unique session ID.

### AC-SESSION-002

A newly created session generates a secure invitation link.

### AC-SESSION-003

A candidate using a valid invitation link can join the session.

### AC-SESSION-004

An invalid or expired invitation cannot join a session.

### AC-SESSION-005

The interviewer can end the session.

### AC-SESSION-006

After ending the session, canvas mutations are rejected.

---

# 68. Acceptance Criteria — Canvas

### AC-CANVAS-001

A user with edit permission can create a component.

### AC-CANVAS-002

A component can be dragged to another location.

### AC-CANVAS-003

All connected clients see the new position.

### AC-CANVAS-004

A component can be deleted by an authorized user.

### AC-CANVAS-005

A user can connect two components.

### AC-CANVAS-006

Connections are rendered as directed edges.

### AC-CANVAS-007

A user can draw free-form strokes.

### AC-CANVAS-008

Drawing changes synchronize with other clients.

---

# 69. Acceptance Criteria — Collaboration

### AC-COLLAB-001

Two users joining the same session see the same canvas.

### AC-COLLAB-002

When User A moves an object, User B sees the change without refreshing.

### AC-COLLAB-003

Presence indicates when users join and leave.

### AC-COLLAB-004

Users see collaborator cursors.

### AC-COLLAB-005

Simultaneous modifications do not corrupt the canvas.

### AC-COLLAB-006

The server produces a canonical ordering for conflicting operations.

### AC-COLLAB-007

A reconnecting client can recover missed changes.

---

# 70. Acceptance Criteria — Permissions

### AC-AUTH-001

Observers cannot modify canvas items.

### AC-AUTH-002

Candidates cannot end a session.

### AC-AUTH-003

Candidates cannot remove other participants.

### AC-AUTH-004

Unauthorized WebSocket operations are rejected.

### AC-AUTH-005

A participant from Session A cannot access Session B.

---

# 71. Acceptance Criteria — Persistence

### AC-PERSIST-001

Canvas state survives browser refresh.

### AC-PERSIST-002

Canvas state can be restored after reconnect.

### AC-PERSIST-003

Autosave status is visible.

### AC-PERSIST-004

Important canvas operations appear in audit logs.

### AC-PERSIST-005

An interviewer can reopen a completed session according to retention rules.

---

# 72. Acceptance Criteria — Accessibility

### AC-A11Y-001

All primary controls are keyboard accessible.

### AC-A11Y-002

Interactive elements have accessible names.

### AC-A11Y-003

Focus state is visible.

### AC-A11Y-004

Color is not the only indication of user role or status.

### AC-A11Y-005

Canvas information has an accessible non-canvas representation.

### AC-A11Y-006

Automated accessibility tests produce no critical WCAG violations.

---

# 73. Test Plan

## Unit Tests

Test:

- Permission evaluation.
- Canvas operations.
- Position calculations.
- Edge validation.
- Version checks.
- Conflict handling.
- Invitation token validation.
- Session state transitions.

---

# 74. Integration Tests

Test:

```text
Browser
  |
REST API
  |
Database
```

and:

```text
Browser A
    |
WebSocket
    |
Collaboration Server
    |
WebSocket
    |
Browser B
```

---

# 75. Multi-Client Synchronization Tests

### Test 1 — Basic synchronization

1. User A creates component.
2. User B observes component.
3. User B moves component.
4. User A observes movement.

Expected:

```text
Canvas A == Canvas B
```

---

### Test 2 — Concurrent moves

1. A moves component.
2. B moves same component.
3. Operations arrive close together.

Expected:

- No corrupted state.
- One canonical final state.
- Both clients converge.

---

### Test 3 — Concurrent deletion

1. A deletes component.
2. B moves component simultaneously.

Expected:

- Delete wins according to server operation ordering.
- Both clients converge.

---

# 76. Reconnection Test

1. Candidate joins.
2. Disconnect network.
3. Interviewer performs several operations.
4. Candidate reconnects.

Expected:

Candidate receives all missed operations and reaches the current canonical canvas state.

---

# 77. Permission Test

Attempt:

```text
Candidate → end session
```

Expected:

```text
403 FORBIDDEN
```

Attempt:

```text
Observer → move component
```

Expected:

```text
403 FORBIDDEN
```

---

# 78. Load Testing

Simulate:

### Scenario A

```text
1 session
2 users
```

### Scenario B

```text
100 sessions
200 users
```

### Scenario C

```text
1,000 sessions
5,000 connections
```

Measure:

- p50 latency.
- p95 latency.
- p99 latency.
- CPU.
- Memory.
- WebSocket connection stability.
- Database load.
- Redis load.

---

# 79. Security Testing

Perform:

- Authentication tests.
- Authorization tests.
- IDOR testing.
- Session-token guessing tests.
- WebSocket authorization testing.
- Rate-limit testing.
- XSS testing.
- SQL injection testing.
- CSRF testing where applicable.
- Dependency scanning.
- Container scanning.
- Secret scanning.

Most importantly:

```text
Never trust sessionId supplied by the client.
```

The server must independently verify authorization.

---

# 80. Recommended Repository Structure

```text
collaborative-interview-platform/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── shared-types/
│   ├── canvas/
│   ├── protocol/
│   └── validation/
│
├── infrastructure/
│   ├── terraform/
│   ├── networking/
│   ├── database/
│   └── monitoring/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── load/
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── realtime-protocol.md
│
└── README.md
```

---

# 81. API Versioning

All public APIs use:

```text
/api/v1
```

Breaking changes require:

```text
/api/v2
```

WebSocket protocol should also include a protocol version:

```json
{
  "protocolVersion": 1
}
```

---

# 82. Error Format

Use a consistent API error structure:

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "The requested session does not exist.",
    "requestId": "req_123"
  }
}
```

Never expose internal stack traces to clients.

---

# 83. Idempotency

Mutating operations should support idempotency.

Example:

```http
Idempotency-Key: op_123
```

If a network retry sends the same operation twice, the server must not create duplicate objects.

This is particularly important for:

- Component creation.
- Edge creation.
- Session creation.
- Export creation.

---

# 84. Database Indexes

Recommended indexes:

```text
Session.ownerId
Session.status
Session.expiresAt

SessionParticipant.sessionId
SessionParticipant.userId

CanvasItem.sessionId
CanvasItem.sessionId + updatedAt

AuditLog.sessionId + timestamp

Message.sessionId + createdAt
```

Use foreign keys for relational integrity.

---

# 85. Database Transaction Boundaries

A canvas mutation should conceptually execute as:

```text
BEGIN
  validate permission
  validate version
  modify canvas state
  increment version
  write audit event
COMMIT
```

The operation should not be acknowledged as persisted until the transaction succeeds.

---

# 86. Event Processing

The WebSocket service should separate:

```text
Receive
  ↓
Authenticate
  ↓
Authorize
  ↓
Validate
  ↓
Apply
  ↓
Persist
  ↓
Broadcast
```

This prevents clients from broadcasting unvalidated state directly to other clients.

---

# 87. Important Architectural Decision

The system should be:

**Server-authoritative, client-optimistic.**

Meaning:

### Client

Optimistically renders:

```text
User drags box
↓
Box moves immediately
```

### Server

Ultimately decides:

```text
Is this operation valid?
What is its order?
What is the canonical state?
```

### Other clients

Receive:

```text
Canonical operation
```

This provides a good balance between responsiveness and consistency.

---

# 88. Consistency Model

The platform should provide:

### Strong consistency

For:

- Session permissions.
- Session state.
- Persistent canvas mutations.
- Participant membership.

### Eventual consistency

Acceptable for:

- Cursor position.
- Online status.
- Typing indicators.

Presence does not need transactional persistence.

---

# 89. Failure Handling

If PostgreSQL is unavailable:

```text
Do not acknowledge durable canvas mutations.
```

If Redis is unavailable:

```text
Presence may temporarily degrade.
```

If one WebSocket server fails:

```text
Client reconnects through load balancer.
```

If a client crashes:

```text
Server retains canonical session state.
```

---

# 90. Product UX Requirements

The interface should contain:

```text
┌─────────────────────────────────────────────┐
│ Interview | Share | Participants | End      │
├──────────────┬──────────────────────────────┤
│ Components   │                              │
│              │                              │
│ Database     │        CANVAS                │
│ API          │                              │
│ LLM          │       ┌───────┐              │
│ Queue        │       │  API  │──────┐       │
│ Server       │       └───────┘      │       │
│              │                      ▼       │
│              │                  ┌───────┐   │
│              │                  │  DB   │   │
├──────────────┴──────────────────┴───────┴───┤
│ Pen | Select | Connect | Text | Zoom         │
└─────────────────────────────────────────────┘
```

---

# 91. MVP Success Metrics

The MVP should be considered successful if:

1. An interviewer can create a session in under 30 seconds.
2. A candidate can join in under 15 seconds.
3. Two users can collaboratively construct a diagram without refreshing.
4. Canvas changes normally appear within 150 ms p95.
5. Reconnection restores the correct canvas.
6. No cross-session data leakage occurs.
7. Core operations survive browser refresh.
8. Users can complete a typical 45–60 minute system-design interview without the tool becoming a bottleneck.

---

# 92. Constraints and Assumptions

## Platform

Initial platform:

**Modern desktop web browsers.**

Primary support:

- Chrome.
- Edge.
- Firefox.
- Safari.

Mobile is not an MVP target.

System-design interviews generally benefit from a large screen.

---

## Hosting

AWS is the recommended deployment target because the architecture aligns well with:

- ECS.
- RDS.
- ElastiCache.
- S3.
- CloudFront.
- WAF.
- CloudWatch.

The architecture should remain portable enough to move to:

- GCP.
- Azure.
- Kubernetes.

---

## Third-Party Services

Potential dependencies:

- Authentication provider.
- Canvas library.
- Redis provider.
- Cloud hosting.
- Monitoring.

Avoid making the core collaboration protocol dependent on a proprietary canvas vendor.

---

# 93. Cost Strategy

For MVP, prioritize:

```text
Managed services
+
Small compute footprint
+
Horizontal scaling later
```

Avoid prematurely deploying:

- Kafka.
- Kubernetes.
- Complex event-sourcing infrastructure.
- Multiple databases.
- Dedicated collaboration clusters.

A PostgreSQL + Redis + WebSocket service is sufficient for the initial product.

---

# 94. Recommended MVP Architecture

The final MVP architecture should therefore be:

```text
                    Internet
                       |
                 CloudFront + WAF
                       |
                React TypeScript
                       |
             ┌─────────┴─────────┐
             │                   │
          REST API           WebSocket
             │                   │
             └─────────┬─────────┘
                       |
              Collaboration API
                       |
              ┌────────┴────────┐
              │                 │
          PostgreSQL           Redis
              |
              |
              S3
```

Application deployment:

```text
ECS/Fargate
├── API service
└── Collaboration service
```

This keeps the architecture simple enough for an MVP while leaving a clean path to horizontal scaling.

---

# 95. Definition of Done

The MVP is complete when all of the following are true:

- [ ] Interviewer authentication works.
- [ ] Interviewer can create sessions.
- [ ] Secure invitation links work.
- [ ] Candidate can join.
- [ ] Multiple clients can connect simultaneously.
- [ ] Presence indicators work.
- [ ] Components can be created.
- [ ] Components can be moved.
- [ ] Components can be deleted.
- [ ] Components can be connected.
- [ ] Free-form drawing works.
- [ ] Canvas updates synchronize in real time.
- [ ] Server validates all mutations.
- [ ] Conflicting updates converge.
- [ ] Reconnection works.
- [ ] Canvas persists.
- [ ] Autosave works.
- [ ] Basic undo works.
- [ ] Role permissions work.
- [ ] Audit logs are created.
- [ ] Session isolation is verified.
- [ ] WCAG-critical accessibility issues are resolved.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] E2E multi-user tests pass.
- [ ] Load testing meets MVP targets.
- [ ] Security testing passes.
- [ ] Production monitoring is configured.
- [ ] Database backups are configured.
- [ ] Infrastructure is reproducible through Terraform.
- [ ] Production deployment can be rolled back.

---

# 96. Final Architecture Decisions

| Decision | Selected Approach | Reason |
|---|---|---|
| Frontend | React + TypeScript | Mature collaborative UI ecosystem |
| Canvas | tldraw/custom or React Flow + drawing layer | Accelerates MVP |
| API | REST | Simple and familiar |
| Real-time | WebSocket | Low-latency bidirectional updates |
| State authority | Server | Predictable consistency |
| Conflict resolution | Version + server ordering | Simpler than CRDT for MVP |
| Database | PostgreSQL | Relational model + transactions |
| Presence | Redis | Fast ephemeral state |
| Object storage | S3 | Durable snapshots/exports |
| Authentication | OIDC/OAuth | Secure and extensible |
| Hosting | AWS | Strong managed-service ecosystem |
| Compute | ECS/Fargate | Avoid Kubernetes complexity |
| Infrastructure | Terraform | Reproducible deployments |
| Observability | OpenTelemetry | Vendor-neutral telemetry |
| Offline | Phase 2 | Avoid MVP complexity |
| CRDT | Phase 2/3 | Only justified if offline/concurrent-edit needs grow |
| AI | Phase 4 | Keep collaboration engine independent |

---

# 97. Core Engineering Principle

The most important architectural principle is:

> **The canvas is a collection of independently addressable objects, and collaboration is synchronization of operations on those objects—not synchronization of screenshots or entire canvas states.**

Therefore:

```text
User action
    ↓
Operation
    ↓
Validation
    ↓
Authorization
    ↓
Version check
    ↓
Persistent state change
    ↓
Canonical event
    ↓
Broadcast
    ↓
Other clients
```

This model provides the foundation for:

- Real-time collaboration.
- Conflict handling.
- Auditability.
- Undo/redo.
- Reconnection.
- Snapshots.
- Future replay.
- Future CRDT migration.
- Future AI analysis.

It also keeps the MVP implementation substantially simpler than attempting to solve every possible collaborative-editing problem on day one.