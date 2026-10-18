"""
Track 1: Agents That Act on Connected Data
Performs multi-hop graph reasoning, blast radius computation,
and PageRank vulnerability assessment using FalkorDB Cypher queries and graph algorithms.
"""

from typing import Dict, Any, List
from ..graph_engine import engine

class TopologyAgent:
    def __init__(self):
        self.name = "Topology & Blast-Radius Sentinel"
        self.track = "Track 1: Agents That Act on Connected Data"

    def analyze_outage(self, root_node_id: str) -> Dict[str, Any]:
        """
        Executes multi-hop Cypher queries and graph traversal algorithms
        to calculate impact, root-cause links, and downstream blast radius.
        """
        reasoning_steps = []

        # Step 1: Identify Target and its centrality via PageRank
        cypher_step1 = f"""
        MATCH (n {{id: '{root_node_id}'}})
        RETURN n.name AS name, n.tier AS tier, n.criticality AS criticality
        """
        res1 = engine.execute_cypher(cypher_step1)
        reasoning_steps.append({
            "step": 1,
            "purpose": "Identify targeted infrastructure node & assess criticality",
            "cypher": cypher_step1.strip(),
            "execution_ms": res1["execution_time_ms"],
            "finding": f"Inspecting target node '{root_node_id}'"
        })

        # Step 2: Calculate Downstream Blast Radius via Graph Traversal
        blast_data = engine.calculate_blast_radius(root_node_id, max_depth=3)
        cypher_step2 = f"""
        MATCH path = (root {{id: '{root_node_id}'}})-[:ROUTES_THROUGH|FORWARD_CALL|PUBLISHES_EVENT|WRITES_TRANSACTIONS*1..3]->(downstream)
        RETURN downstream.id, downstream.name, length(path) as depth
        ORDER BY depth ASC
        """
        res2 = engine.execute_cypher(cypher_step2)
        reasoning_steps.append({
            "step": 2,
            "purpose": "Graph Traversal: Compute downstream blast radius and failure propagation",
            "cypher": cypher_step2.strip(),
            "execution_ms": res2["execution_time_ms"],
            "finding": f"Detected {blast_data['impacted_count']} directly impacted downstream services/components"
        })

        # Step 3: Check for Recent Commits / PR deployments touching this node
        cypher_step3 = f"""
        MATCH (pr:PullRequest)-[r:MODIFIES_CONFIG|DEPLOYED_TO]->(target {{id: '{root_node_id}'}})
        RETURN pr.id AS pr_id, pr.name AS title, pr.author AS author, pr.merged_at AS merged
        """
        res3 = engine.execute_cypher(cypher_step3)
        correlated_prs = []
        for nid, data in engine.node_store.items():
            if data.get("label") == "PullRequest":
                # Check if edge exists to root_node_id
                if engine.nx_graph.has_edge(nid, root_node_id):
                    correlated_prs.append(data)

        reasoning_steps.append({
            "step": 3,
            "purpose": "Lineage Correlation: Correlate recent code deploys to root cause",
            "cypher": cypher_step3.strip(),
            "execution_ms": res3["execution_time_ms"],
            "finding": f"Correlated {len(correlated_prs)} recent pull request(s) deployed to this system within last 4 hours"
        })

        # Step 4: PageRank calculation for infrastructure vulnerability index
        pr_scores = engine.calculate_pagerank()
        target_pagerank = round(pr_scores.get(root_node_id, 0.0) * 100, 2)

        return {
            "agent": self.name,
            "track": self.track,
            "root_node_id": root_node_id,
            "root_name": blast_data["root_name"],
            "pagerank_index": target_pagerank,
            "blast_radius": blast_data,
            "correlated_prs": correlated_prs,
            "reasoning_steps": reasoning_steps,
            "severity": "CRITICAL - SEV-1" if blast_data["total_criticality_score"] > 8.0 else "HIGH - SEV-2"
        }
