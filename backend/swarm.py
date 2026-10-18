"""
Autonomous Swarm Orchestrator:
Orchestrates TopologyAgent, MemoryAgent, and CompanyBrainAgent in a cooperative loop,
querying and writing to FalkorDB at every step to triage, plan, and autonomously resolve incidents.
"""

import time
from typing import Dict, Any, List
from .agents.topology_agent import TopologyAgent
from .agents.memory_agent import MemoryAgent
from .agents.brain_agent import CompanyBrainAgent
from .graph_engine import engine

class SynapseSwarmOrchestrator:
    def __init__(self):
        self.topology_agent = TopologyAgent()
        self.memory_agent = MemoryAgent()
        self.brain_agent = CompanyBrainAgent()

    def run_swarm_triage(self, incident_target_id: str, trigger_reason: str = "Automated Alert") -> Dict[str, Any]:
        """
        Executes an end-to-end multi-agent triage loop over FalkorDB:
        1. Topology analysis (Track 1)
        2. Swarm handoff & episodic memory recall (Track 2)
        3. Organizational brain & provenance resolution (Track 3)
        4. Synthesized remediation plan
        """
        start_time = time.time()
        
        # Mark targeted node as degraded/unhealthy in the live graph
        if incident_target_id in engine.node_store:
            engine.node_store[incident_target_id]["status"] = "degraded"

        # ----------------------------------------------------
        # Step 1: Topology & Blast Radius Analysis (Track 1)
        # ----------------------------------------------------
        topo_result = self.topology_agent.analyze_outage(incident_target_id)
        
        # ----------------------------------------------------
        # Step 2: Handoff & Memory Recall (Track 2)
        # ----------------------------------------------------
        handoff_1 = self.memory_agent.record_agent_handoff(
            from_agent="TopologyAgent",
            to_agent="MemoryAgent",
            payload={"summary": f"Target {incident_target_id} blast radius computed: {topo_result['blast_radius']['impacted_count']} nodes"}
        )
        
        memory_result = self.memory_agent.retrieve_episodic_memory(incident_target_id)

        # ----------------------------------------------------
        # Step 3: Enterprise Brain & Ownership Resolution (Track 3)
        # ----------------------------------------------------
        handoff_2 = self.memory_agent.record_agent_handoff(
            from_agent="MemoryAgent",
            to_agent="CompanyBrainAgent",
            payload={"summary": f"Recalled {len(memory_result['recommended_runbooks'])} runbooks, resolving team owners"}
        )

        brain_result = self.brain_agent.resolve_ownership_and_provenance(incident_target_id)

        # ----------------------------------------------------
        # Step 4: Autonomous Mitigation Synthesis
        # ----------------------------------------------------
        recommended_action = "Standard manual escalation"
        best_runbook = None
        if memory_result["recommended_runbooks"]:
            best_runbook = memory_result["recommended_runbooks"][0]
            recommended_action = f"Execute {best_runbook['name']} (Confidence: {int(best_runbook.get('confidence_score', 0.9) * 100)}%)"
        elif topo_result["correlated_prs"]:
            culprit_pr = topo_result["correlated_prs"][0]
            recommended_action = f"Hotfix / Immediate Rollback of {culprit_pr['name']}"

        elapsed_total = round((time.time() - start_time) * 1000, 2)

        # Aggregate all Cypher queries executed across the agent pipeline
        all_cypher_queries = []
        for step in topo_result["reasoning_steps"]:
            all_cypher_queries.append({"agent": "TopologyAgent", "step": step["step"], "cypher": step["cypher"], "ms": step["execution_ms"]})
        for step in memory_result["reasoning_steps"]:
            all_cypher_queries.append({"agent": "MemoryAgent", "step": step["step"], "cypher": step["cypher"], "ms": step["execution_ms"]})
        for step in brain_result["reasoning_steps"]:
            all_cypher_queries.append({"agent": "CompanyBrainAgent", "step": step["step"], "cypher": step["cypher"], "ms": step["execution_ms"]})

        return {
            "incident_id": f"INC-{int(time.time())}",
            "target_node_id": incident_target_id,
            "trigger_reason": trigger_reason,
            "severity": topo_result["severity"],
            "total_execution_ms": elapsed_total,
            "topology_analysis": topo_result,
            "memory_analysis": memory_result,
            "brain_analysis": brain_result,
            "recommended_action": recommended_action,
            "best_runbook": best_runbook,
            "handoffs": [handoff_1, handoff_2],
            "all_cypher_queries": all_cypher_queries
        }

    def execute_autonomous_mitigation(self, incident_target_id: str, action_type: str = "runbook") -> Dict[str, Any]:
        """
        Executes autonomous mitigation:
        1. Updates graph node state back to healthy
        2. Stores the resolution in episodic memory for future agent recall
        3. Updates FalkorDB relationships
        """
        # Restore target health
        if incident_target_id in engine.node_store:
            engine.node_store[incident_target_id]["status"] = "healthy"

        # Record mitigation into FalkorDB as new episodic memory node
        mitigation_node_id = f"mitigation_{int(time.time())}"
        engine.add_node(mitigation_node_id, "MitigationAction", {
            "target": incident_target_id,
            "action": action_type,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "APPLIED_SUCCESSFULLY"
        })
        engine.add_edge(incident_target_id, mitigation_node_id, "MITIGATED_BY")

        # Cypher query for execution logging
        cypher = f"""
        MATCH (target {{id: '{incident_target_id}'}})
        CREATE (m:MitigationAction {{id: '{mitigation_node_id}', action: '{action_type}', status: 'APPLIED'}})
        CREATE (target)-[:MITIGATED_BY]->(m)
        SET target.status = 'healthy'
        RETURN target, m
        """
        engine.execute_cypher(cypher)

        return {
            "status": "SUCCESS",
            "message": f"Autonomous mitigation applied to {incident_target_id}. Graph state updated to Healthy.",
            "mitigation_id": mitigation_node_id,
            "cypher_logged": cypher.strip()
        }

swarm = SynapseSwarmOrchestrator()
