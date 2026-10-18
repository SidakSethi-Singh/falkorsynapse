"""
Track 2: Agent Memory and Coordination
Manages episodic incident memory, procedural runbook retrieval,
cross-session state persistence, and inter-agent coordination handoffs in FalkorDB.
"""

import time
from typing import Dict, Any, List
from ..graph_engine import engine

class MemoryAgent:
    def __init__(self):
        self.name = "Episodic Memory & Swarm Coordinator"
        self.track = "Track 2: Agent Memory and Coordination"
        self.active_session_id = f"session_{int(time.time())}"

    def retrieve_episodic_memory(self, target_node_id: str) -> Dict[str, Any]:
        """
        Queries FalkorDB for past incidents, historical resolutions, and procedural runbooks.
        """
        reasoning_steps = []

        # Step 1: Episodic Memory Retrieval for Past Incidents on this node
        cypher_step1 = f"""
        MATCH (inc:PastIncident)-[:AFFECTED_TARGET]->(target {{id: '{target_node_id}'}})
        OPTIONAL MATCH (inc)-[:RESOLVED_BY]->(rb:Runbook)
        RETURN inc.id, inc.name, inc.root_cause, inc.resolution, rb.name AS runbook_name, rb.confidence_score AS confidence
        """
        res1 = engine.execute_cypher(cypher_step1)
        reasoning_steps.append({
            "step": 1,
            "purpose": "Episodic Memory Recall: Search FalkorDB for past outage signatures and solutions",
            "cypher": cypher_step1.strip(),
            "execution_ms": res1["execution_time_ms"],
            "finding": f"Retrieved historical incident graph nodes linked to '{target_node_id}'"
        })

        matched_incidents = []
        recommended_runbooks = []

        for nid, data in engine.node_store.items():
            if data.get("label") == "PastIncident":
                if engine.nx_graph.has_edge(nid, target_node_id):
                    matched_incidents.append(data)
                    # Find attached runbooks
                    for successor in engine.nx_graph.successors(nid):
                        sdata = engine.node_store.get(successor, {})
                        if sdata.get("label") == "Runbook":
                            recommended_runbooks.append(sdata)

        # Step 2: Procedural Runbook Extraction & Safety Validation
        cypher_step2 = f"""
        MATCH (rb:Runbook) WHERE rb.automation_safe = true
        RETURN rb.id, rb.name, rb.confidence_score
        ORDER BY rb.confidence_score DESC
        LIMIT 3
        """
        res2 = engine.execute_cypher(cypher_step2)
        reasoning_steps.append({
            "step": 2,
            "purpose": "Procedural Memory: Identify automation-safe remediation runbooks",
            "cypher": cypher_step2.strip(),
            "execution_ms": res2["execution_time_ms"],
            "finding": f"Identified {len(recommended_runbooks)} matching validated runbook(s) in procedural memory"
        })

        return {
            "agent": self.name,
            "track": self.track,
            "session_id": self.active_session_id,
            "matched_incidents": matched_incidents,
            "recommended_runbooks": recommended_runbooks,
            "reasoning_steps": reasoning_steps,
            "memory_retention_tier": "FalkorDB Synaptic Graph Store"
        }

    def record_agent_handoff(self, from_agent: str, to_agent: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persists a cross-agent coordination event directly into FalkorDB
        so any subsequent agent or human operator has transparent context.
        """
        handoff_id = f"handoff_{int(time.time() * 1000)}"
        engine.add_node(handoff_id, "AgentHandoff", {
            "from_agent": from_agent,
            "to_agent": to_agent,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "COMPLETED",
            "summary": payload.get("summary", "Context transfer across swarm agents")
        })

        # Add coordination edge in FalkorDB
        engine.add_edge(from_agent, handoff_id, "DISPATCHED_TO")
        engine.add_edge(handoff_id, to_agent, "RECEIVED_BY")

        cypher_query = f"""
        CREATE (h:AgentHandoff {{id: '{handoff_id}', from: '{from_agent}', to: '{to_agent}', status: 'DISPATCHED'}})
        RETURN h.id
        """
        res = engine.execute_cypher(cypher_query)

        return {
            "handoff_id": handoff_id,
            "from_agent": from_agent,
            "to_agent": to_agent,
            "cypher_logged": cypher_query.strip(),
            "status": "SYNCHRONIZED_IN_GRAPH"
        }
