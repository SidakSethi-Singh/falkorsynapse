# FalkorSynapse: Cypher Queries & Graph Algorithms Reference

This document catalogs every Cypher query, multi-hop traversal pattern, and graph algorithm that powers the **FalkorSynapse** multi-agent swarm, fulfilling **Rule 10** of the Graph Hacks Hackathon.

---

## 1. Track 01: Agents That Act on Connected Data

### 1.1 Multi-Hop Downstream Blast Radius Traversal
When an anomaly is detected on an infrastructure component or microservice, the **TopologyAgent** executes a multi-hop traversal along operational dependency edges up to depth 3 to compute every impacted downstream service.

```cypher
MATCH path = (root {id: $target_node_id})-[:ROUTES_THROUGH|FORWARD_CALL|PUBLISHES_EVENT|WRITES_TRANSACTIONS*1..3]->(downstream)
RETURN downstream.id AS service_id, 
       downstream.name AS service_name, 
       length(path) AS hop_depth,
       downstream.tier AS criticality_tier
ORDER BY hop_depth ASC;
```

### 1.2 Git Lineage & Commit Blast Correlation
Correlates recent code deployments and configuration changes to pinpoint the root cause of an outage.

```cypher
MATCH (pr:PullRequest)-[r:MODIFIES_CONFIG|DEPLOYED_TO]->(target {id: $target_node_id})
RETURN pr.id AS pr_id, 
       pr.name AS title, 
       pr.author AS author, 
       pr.merged_at AS merged_time,
       r.risk AS risk_level;
```

### 1.3 Shortest Causal Path Finding
Determines the exact propagation vector between two disconnected systems reporting errors.

```cypher
MATCH p = shortestPath((source:Service {id: $source_id})-[*]-(target:Database {id: $target_id}))
RETURN p, length(p) AS distance;
```

### 1.4 Critical Infrastructure PageRank Algorithm
Identifies single points of failure across the enterprise graph topology:

```python
# Graph algorithm tool called directly inside the agent loop
pagerank_scores = engine.calculate_pagerank()
# Yields vulnerability indices for all critical DBs and API Gateways
```

---

## 2. Track 02: Agent Memory and Coordination

### 2.1 Episodic Memory Recall of Past Incidents
Queries historical incident signatures and previously verified resolutions in FalkorDB:

```cypher
MATCH (inc:PastIncident)-[:AFFECTED_TARGET]->(target {id: $target_node_id})
OPTIONAL MATCH (inc)-[:RESOLVED_BY]->(rb:Runbook)
RETURN inc.id AS incident_id, 
       inc.name AS title, 
       inc.root_cause AS root_cause, 
       inc.resolution AS historical_resolution, 
       rb.name AS runbook_name, 
       rb.confidence_score AS confidence;
```

### 2.2 Procedural Memory (Validated Runbook Selection)
Filters and sorts automation-safe runbooks from procedural memory:

```cypher
MATCH (rb:Runbook) 
WHERE rb.automation_safe = true
RETURN rb.id AS runbook_id, 
       rb.name AS runbook_title, 
       rb.confidence_score AS confidence
ORDER BY rb.confidence_score DESC
LIMIT 3;
```

### 2.3 Cross-Agent Coordination & State Handoff
Persists inter-agent coordination tokens into FalkorDB so swarm state is immutable, auditable, and shared across sessions:

```cypher
CREATE (h:AgentHandoff {
  id: $handoff_id, 
  from_agent: $from_agent, 
  to_agent: $to_agent, 
  timestamp: $timestamp, 
  status: 'DISPATCHED'
})
RETURN h.id;
```

---

## 3. Track 03: Company Brain & Decision Provenance

### 3.1 Ownership Graph Traversal ("Who knows what?")
Traverses the organizational ownership hierarchy to identify designated architects, schema owners, and on-call engineers:

```cypher
MATCH (e:Engineer)-[r:PRIMARY_ARCHITECT|SCHEMA_OWNER|MAINTAINER|SECURITY_OWNER]->(target {id: $target_node_id})
RETURN e.id AS engineer_id, 
       e.name AS engineer_name, 
       e.role AS role, 
       e.slack AS slack_handle, 
       e.on_call AS is_on_call, 
       type(r) AS ownership_relation;
```

### 3.2 Decision Provenance Audit
Traces architectural decisions and config modifications back to their originating pull request and author:

```cypher
MATCH (pr:PullRequest)-[:MODIFIES_CONFIG|DEPLOYED_TO]->(target {id: $target_node_id})
OPTIONAL MATCH (author:Engineer {id: pr.author})
RETURN pr.id AS pr_id, 
       pr.name AS pr_title, 
       author.name AS author_name, 
       author.slack AS author_slack,
       pr.merged_at AS timestamp;
```

### 3.3 Dynamic Graph State Mutation (Autonomous Mitigation)
Applies autonomous remediation, records new episodic memory, and updates node health in real time:

```cypher
MATCH (target {id: $target_node_id})
CREATE (m:MitigationAction {
  id: $mitigation_id, 
  action: $action_type, 
  timestamp: $timestamp, 
  status: 'APPLIED'
})
CREATE (target)-[:MITIGATED_BY]->(m)
SET target.status = 'healthy'
RETURN target, m;
```
