# 🧠 Project Overview

SafeScale is a Universal AI Gateway with FinOps Control Layer.

It provides:

- OpenAI-compatible API
- Budget enforcement (kill-switch + degradation)
- Intelligent routing (rule-based → ML-driven)
- Observability and analytics

SafeScale = Stripe (billing control) + Kubernetes (routing abstraction) for LLMs

## 🎯 Core Engineering Principle

Build the system layer by layer, not all at once.

## ❗ Golden Rule

If Phase 1 is unstable, the entire system will collapse.

## 🧱 Development Strategy (MANDATORY)

### 🔹 Phase-based Development (STRICT)

**Phase 1 — Proxy Layer**
- OpenAI-compatible endpoint
- Forward request to provider
- Return response EXACTLY

**Phase 2 — Budget Layer**
- Cost estimation
- Budget enforcement (block/downgrade)

**Phase 3 — Routing Layer**
- Rule-based routing
- Basic degradation logic

**Phase 4 — Streaming & Logging**
- Real-time streaming
- Async logging

**Phase 5 — Reliability Layer**
- Fail-open client
- Retry/fallback handling

**Phase 6 — Observability & Dashboard**

**Phase 7 — ML Routing (SafeRoute)**

**❗ DO NOT SKIP PHASES**

## ⚙️ High-Level Architecture

### 🧱 System Layers

```text
Client (LangChain / App)
        ↓
SafeScale Proxy (Node.js)
        ↓
Core Layers:
  - Auth Layer
  - Budget Engine
  - Router
  - Adapter Layer
        ↓
Execution Layer:
  - LiteLLM Proxy (later phase)
        ↓
LLM Providers
```

### 🔌 Internal Communication

✅ **Use gRPC for internal services**

Why gRPC?
- low latency
- strongly typed
- efficient for internal calls

Applies to:
- Router ↔ Budget Engine
- Proxy ↔ Logging Service
- Future ML routing service

### 🔄 Query Flow (VERY IMPORTANT)

#### 🟢 Phase 1 Flow
`Client → Proxy → OpenAI → Response → Client`

#### 🟡 Phase 2 Flow (Budget)
```text
Client →
  Proxy →
    Estimate Cost →
      Budget Check →
        Allow / Block →
          OpenAI →
            Response
```

#### 🔵 Phase 3 Flow (Routing)
```text
Client →
  Proxy →
    Budget Check →
      Router →
        Select Model →
          Provider →
            Response
```

#### ⚡ Final Flow (Future)
```text
Client →
  Proxy →
    Auth →
    Budget Engine →
    Router →
    Adapter →
      LiteLLM →
        Provider →
          Stream Response →
            Client

Parallel:
→ Async Logging
→ Metrics
```

## 🧠 Core Components

**1. Proxy Layer**
- OpenAI-compatible API
- MUST not change request/response format

**2. Budget Engine**
- Real-time cost tracking
- Two-phase accounting:
  - estimate
  - commit

**3. Router**
- Rule-based initially
- ML-based later (SafeRoute)

**4. Adapter Layer**
- Normalize provider differences
- No provider-specific logic in core

**5. Logging System**
- Async ONLY
- Must not block response

**6. Fail-Open System**
- Client-side fallback
- Ensures reliability

## ⚙️ Technology Decisions

**Runtime**
- Node.js (Fastify)

**Database**
- PostgreSQL (persistent data)

**Cache**
- Redis (real-time budget)

**Observability**
- Helicone (initial phase)

**Execution Layer**
- LiteLLM (NOT in Phase 1)

## 🧪 Development Best Practices

**🟢 1. Build Small, Validate Fast**
- One feature at a time
- Test before moving forward

**🟢 2. Strict Separation of Concerns**
- Route ≠ Business logic
- Business logic ≠ Provider calls

**🟢 3. Keep Proxy Stateless**
- No session storage
- All state external (Redis/DB)

**🟢 4. Streaming First Design**
- Never buffer full response

**🟢 5. Async Everything Non-Critical**
- logging
- analytics

**🟢 6. Defensive Programming**
- handle timeouts
- handle provider failures
- validate inputs

**🟢 7. Minimal Latency**
- avoid unnecessary layers
- avoid blocking operations

**🟢 8. Deterministic Behavior**
- routing must be predictable (initially)

## 🚫 STRICT DO NOT DO LIST

### ❌ Architecture Violations
- Do NOT build full system at once
- Do NOT introduce microservices early
- Do NOT add unnecessary abstraction

### ❌ Technology Misuse
- Do NOT use LiteLLM in Phase 1
- Do NOT integrate Helicone in early phases
- Do NOT add database before Phase 2

### ❌ Feature Creep
- Do NOT implement MCP/A2A
- Do NOT build agent orchestration
- Do NOT build ML routing early

### ❌ Code Quality Issues
- Do NOT mix layers
- Do NOT write monolithic functions
- Do NOT ignore error handling

### ❌ Performance Mistakes
- Do NOT block request thread
- Do NOT buffer streaming responses
- Do NOT add heavy middleware

### ❌ External Tools Usage
- External tools MAY be used for development
- External tools MUST NOT be tightly integrated into core system early

## 🧠 Copilot Behavior Rules

**Copilot MUST:**
- Follow phase-based development
- Keep implementation minimal
- Respect architecture boundaries

**Copilot MUST NOT:**
- Over-engineer
- Add features not requested
- Modify API structure

## 🚀 Execution Philosophy

Build → Test → Validate → Then Expand

**Priority Order**
1. Reliability
2. Cost Control
3. Performance
4. Intelligence

## 🔥 Final Principle

SafeScale is NOT an API wrapper.

It is a:

**Decision Engine for AI Cost + Performance**

## ⚡ One Line to Remember

> “If it doesn’t reduce cost risk, it’s not part of the MVP.”