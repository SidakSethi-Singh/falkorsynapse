"""
FastAPI application exposing REST endpoints for FalkorSynapse,
FalkorDB graph inspection, live Cypher queries, multi-agent triage, and autonomous mitigation.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os

from .graph_engine import engine
from .dataset_seed import seed_enterprise_mesh
from .swarm import swarm

# Seed initial graph on startup
seed_enterprise_mesh()

app = FastAPI(
    title="FalkorSynapse: Graph-Native SRE Swarm",
    description="Autonomous Multi-Agent Incident Response & Enterprise Brain powered by FalkorDB",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TriageRequest(BaseModel):
    target_node_id: str
    trigger_reason: Optional[str] = "Synthetic Outage Simulation"

class MitigateRequest(BaseModel):
    target_node_id: str
    action_type: Optional[str] = "Execute Verified Runbook"

class CypherQueryRequest(BaseModel):
    query: str
    params: Optional[Dict[str, Any]] = None

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "engine_mode": engine.driver_mode,
        "is_connected_falkordb": engine.is_connected,
        "total_nodes": len(engine.node_store),
        "total_edges": len(engine.edge_store)
    }

@app.get("/api/graph")
def get_graph():
    return engine.get_full_graph()

@app.post("/api/triage")
def trigger_triage(req: TriageRequest):
    if req.target_node_id not in engine.node_store:
        raise HTTPException(status_code=404, detail=f"Node '{req.target_node_id}' not found in graph")
    result = swarm.run_swarm_triage(req.target_node_id, req.trigger_reason)
    return result

@app.post("/api/mitigate")
def trigger_mitigate(req: MitigateRequest):
    if req.target_node_id not in engine.node_store:
        raise HTTPException(status_code=404, detail=f"Node '{req.target_node_id}' not found in graph")
    result = swarm.execute_autonomous_mitigation(req.target_node_id, req.action_type)
    return result

@app.get("/api/blast-radius/{node_id}")
def get_blast_radius(node_id: str, depth: int = 3):
    return engine.calculate_blast_radius(node_id, max_depth=depth)

@app.post("/api/cypher")
def run_custom_cypher(req: CypherQueryRequest):
    res = engine.execute_cypher(req.query, req.params)
    return res

@app.post("/api/reset")
def reset_graph():
    seed_enterprise_mesh()
    return {"status": "SUCCESS", "message": "Enterprise graph mesh re-seeded to healthy baseline."}

# Mount static web directory
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
