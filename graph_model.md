# FalkorSynapse: Graph Data Model Schema

This document details the **Graph Data Model** designed for **FalkorSynapse**, representing a distributed cloud infrastructure mesh, code deployment lineage, organizational ownership, and episodic memory stored natively in **FalkorDB**.

---

## 1. Schema Diagram (Mermaid)

```mermaid
graph TD
  %% Nodes
  Engineer["(:Engineer)<br>name, role, slack, on_call"]
  PullRequest["(:PullRequest)<br>id, name, author, merged_at"]
  Service["(:Service)<br>id, name, tier, criticality, qps"]
  Database["(:Database)<br>id, name, tier, criticality"]
  MessageBroker["(:MessageBroker)<br>id, name, throughput"]
  PastIncident["(:PastIncident)<br>id, name, root_cause, resolution"]
  Runbook["(:Runbook)<br>id, name, confidence, auto_safe"]
  AgentHandoff["(:AgentHandoff)<br>from, to, timestamp, status"]

  %% Relationships
  Engineer -->|PRIMARY_ARCHITECT / MAINTAINER| Service
  Engineer -->|SCHEMA_OWNER| Database
  Engineer -->|AUTHORED| PullRequest
  
  PullRequest -->|DEPLOYED_TO| Service
  PullRequest -->|MODIFIES_CONFIG| Database
  PullRequest -->|MODIFIES_BUFFER| MessageBroker

  Service -->|ROUTES_THROUGH / FORWARD_CALL| Service
  Service -->|PUBLISHES_EVENT| MessageBroker
  MessageBroker -->|CONSUMED_BY| Service
  Service -->|WRITES_TRANSACTIONS| Database

  PastIncident -->|AFFECTED_TARGET| Database
  PastIncident -->|AFFECTED_TARGET| Service
  PastIncident -->|RESOLVED_BY| Runbook

  AgentHandoff -->|DISPATCHED_TO| Engineer
```

---

## 2. Node Taxonomy

| Label | Description | Primary Properties |
|---|---|---|
| `:Service` | Microservice / API in the architecture | `id`, `name`, `tier`, `criticality`, `qps`, `status` |
| `:Database` | Data persistence store | `id`, `name`, `tier`, `criticality`, `connections`, `status` |
| `:MessageBroker`| Event bus or message queue | `id`, `name`, `throughput`, `criticality`, `status` |
| `:Cache` | Distributed caching layer | `id`, `name`, `hit_rate`, `criticality`, `status` |
| `:ExternalAPI` | Third-party vendor API (PSP, Auth) | `id`, `name`, `sla`, `status` |
| `:Engineer` | Team member or on-call commander | `id`, `name`, `role`, `slack`, `on_call`, `timezone` |
| `:PullRequest` | Deployed code change or hotfix | `id`, `name`, `author`, `merged_at`, `status` |
| `:PastIncident`| Historical outage record in episodic memory | `id`, `name`, `occurred`, `root_cause`, `resolution` |
| `:Runbook` | Validated procedural remediation recipe | `id`, `name`, `confidence_score`, `automation_safe` |
| `:AgentHandoff`| Swarm state transfer token | `id`, `from_agent`, `to_agent`, `timestamp`, `status` |

---

## 3. Relationship (Edge) Semantics

| Relationship Type | Source Node | Target Node | Purpose |
|---|---|---|---|
| `:ROUTES_THROUGH` | `:Service` | `:Service` | Ingress and reverse proxy routing |
| `:FORWARD_CALL` | `:Service` | `:Service` | Synchronous RPC/REST call dependency |
| `:PUBLISHES_EVENT`| `:Service` | `:MessageBroker`| Asynchronous event publishing |
| `:CONSUMED_BY` | `:MessageBroker` | `:Service` | Event-driven subscriber link |
| `:WRITES_TRANSACTIONS`| `:Service` | `:Database` | Relational/ledger write dependency |
| `:PRIMARY_ARCHITECT` | `:Engineer` | `:Service` | Organizational domain ownership |
| `:SCHEMA_OWNER` | `:Engineer` | `:Database` | Data model gatekeeper |
| `:DEPLOYED_TO` | `:PullRequest` | `:Service` | Continuous deployment lineage |
| `:MODIFIES_CONFIG` | `:PullRequest` | `:Database` | Schema/connection pool alteration |
| `:AFFECTED_TARGET` | `:PastIncident` | Component | Historical failure link |
| `:RESOLVED_BY` | `:PastIncident` | `:Runbook` | Validated resolution association |
| `:MITIGATED_BY` | Component | `:MitigationAction`| Dynamic resolution attribution |
