/**
 * FalkorSynapse Frontend Controller
 * Interactive SVG Force/Spatial Graph Visualizer + Multi-Agent Swarm Real-Time HUD
 */

document.addEventListener("DOMContentLoaded", () => {
  // State
  let graphData = { nodes: [], edges: [] };
  let nodePositions = {};
  let activeTargetNodeId = null;

  // DOM Elements
  const svg = document.getElementById("graph-svg");
  const meshStats = document.getElementById("mesh-stats");
  const driverStatusText = document.getElementById("driver-status-text");
  const scenarioSelect = document.getElementById("scenario-select");
  const btnTriggerOutage = document.getElementById("btn-trigger-outage");
  const btnResetMesh = document.getElementById("btn-reset-mesh");
  const btnApplyMitigation = document.getElementById("btn-apply-mitigation");
  const triageEmpty = document.getElementById("triage-empty");
  const triageResults = document.getElementById("triage-results");
  const nodeInspector = document.getElementById("node-inspector");
  const btnCloseInspector = document.getElementById("btn-close-inspector");
  
  // Tab Elements
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  
  // Cypher Console Elements
  const cypherInput = document.getElementById("cypher-input");
  const btnRunCypher = document.getElementById("btn-run-cypher");
  const cypherResultsJson = document.getElementById("cypher-results-json");
  const cypherMs = document.getElementById("cypher-ms");
  const chipBtns = document.querySelectorAll(".chip-btn");

  // Tab Switching
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add("active");
    });
  });

  // Color mapping by label
  const labelColors = {
    Service: "#3b82f6",
    Database: "#10b981",
    MessageBroker: "#f59e0b",
    Cache: "#06b6d4",
    ExternalAPI: "#8b5cf6",
    Engineer: "#ec4899",
    PullRequest: "#a855f7",
    Runbook: "#06b6d4",
    PastIncident: "#ef4444"
  };

  // 1. Fetch and Load Graph
  async function loadGraph() {
    try {
      const res = await fetch("/api/graph");
      const data = await res.json();
      graphData = data;
      
      meshStats.textContent = `${data.total_nodes} Nodes • ${data.total_edges} Relationships • FalkorDB Context Active`;
      if (data.driver_mode) {
        driverStatusText.textContent = `Engine: ${data.driver_mode}`;
      }
      
      calculateNodeLayout();
      renderGraph();
      renderMemoryTimeline();
    } catch (err) {
      console.error("Failed to load graph data:", err);
      meshStats.textContent = "Error connecting to FalkorDB backend";
    }
  }

  // 2. Spatial Node Layout (Structured Ring & Layer layout for clear readability)
  function calculateNodeLayout() {
    const width = svg.clientWidth || 750;
    const height = svg.clientHeight || 550;
    const centerX = width / 2;
    const centerY = height / 2;

    const layers = {
      services: [],
      infra: [],
      people: [],
      commits: [],
      memory: []
    };

    graphData.nodes.forEach(n => {
      if (n.label === "Service") layers.services.push(n);
      else if (["Database", "MessageBroker", "Cache", "ExternalAPI"].includes(n.label)) layers.infra.push(n);
      else if (n.label === "Engineer") layers.people.push(n);
      else if (n.label === "PullRequest") layers.commits.push(n);
      else layers.memory.push(n);
    });

    // Outer layout rings
    function arrangeRing(nodes, radius, angleOffset = 0) {
      const step = (2 * Math.PI) / (nodes.length || 1);
      nodes.forEach((n, i) => {
        const angle = angleOffset + i * step;
        nodePositions[n.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });
    }

    arrangeRing(layers.infra, Math.min(width, height) * 0.18, 0.2);
    arrangeRing(layers.services, Math.min(width, height) * 0.32, 0.5);
    arrangeRing(layers.people, Math.min(width, height) * 0.44, 0.1);
    arrangeRing(layers.commits, Math.min(width, height) * 0.44, Math.PI);
    arrangeRing(layers.memory, Math.min(width, height) * 0.25, -Math.PI / 2);
  }

  // 3. Render SVG Graph
  function renderGraph(highlightedNodeId = null, blastRadiusNodeIds = []) {
    svg.innerHTML = "";

    // Defs for glowing filters and arrows
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="arrow" viewBox="0 -5 10 10" refX="22" refY="0" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,-5L10,0L0,5" fill="rgba(255,255,255,0.2)"></path>
      </marker>
      <marker id="arrow-alert" viewBox="0 -5 10 10" refX="22" refY="0" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,-5L10,0L0,5" fill="#ef4444"></path>
      </marker>
    `;
    svg.appendChild(defs);

    const edgesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(edgesGroup);
    svg.appendChild(nodesGroup);

    // Draw Edges
    graphData.edges.forEach(edge => {
      const p1 = nodePositions[edge.source];
      const p2 = nodePositions[edge.target];
      if (!p1 || !p2) return;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", p1.x);
      line.setAttribute("y1", p1.y);
      line.setAttribute("x2", p2.x);
      line.setAttribute("y2", p2.y);
      line.setAttribute("class", "edge-line");
      line.setAttribute("marker-end", "url(#arrow)");

      // Check if this edge is along the blast radius path
      const isBlastEdge = (edge.source === highlightedNodeId && blastRadiusNodeIds.includes(edge.target)) ||
                          (blastRadiusNodeIds.includes(edge.source) && blastRadiusNodeIds.includes(edge.target));
      if (isBlastEdge) {
        line.classList.add("edge-highlight");
        line.setAttribute("marker-end", "url(#arrow-alert)");
      }

      edgesGroup.appendChild(line);
    });

    // Draw Nodes
    graphData.nodes.forEach(node => {
      const pos = nodePositions[node.id];
      if (!pos) return;

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
      group.style.cursor = "pointer";

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      const isDegraded = node.status === "degraded" || node.id === highlightedNodeId;
      const isImpacted = blastRadiusNodeIds.includes(node.id);
      
      const radius = isDegraded ? 15 : (isImpacted ? 13 : 11);
      circle.setAttribute("r", radius);
      circle.setAttribute("fill", isDegraded ? "#ef4444" : (isImpacted ? "#f59e0b" : (labelColors[node.label] || "#64748b")));
      circle.setAttribute("stroke", isDegraded ? "#fca5a5" : "#ffffff");
      circle.setAttribute("stroke-width", isDegraded ? "3" : "1.5");
      circle.setAttribute("class", isDegraded ? "node-circle node-degraded" : "node-circle");

      // Label text
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("y", radius + 13);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", isDegraded ? "#fca5a5" : (isImpacted ? "#fcd34d" : "#e2e8f0"));
      text.setAttribute("font-size", "10px");
      text.setAttribute("font-family", "Inter, sans-serif");
      text.setAttribute("font-weight", isDegraded || isImpacted ? "700" : "400");
      text.textContent = (node.name || node.id).substring(0, 20);

      group.appendChild(circle);
      group.appendChild(text);

      // Click to inspect
      group.addEventListener("click", () => openInspector(node));

      nodesGroup.appendChild(group);
    });
  }

  // 4. Node Inspector Drawer
  function openInspector(node) {
    document.getElementById("inspector-name").textContent = node.name || node.id;
    const body = document.getElementById("inspector-content");
    body.innerHTML = "";

    const propsToShow = ["label", "id", "status", "tier", "criticality", "pagerank", "role", "slack", "on_call", "throughput", "connections"];
    propsToShow.forEach(prop => {
      if (node[prop] !== undefined) {
        const row = document.createElement("div");
        row.className = "prop-row";
        row.innerHTML = `<span class="prop-label">${prop}:</span> <span class="prop-value">${node[prop]}</span>`;
        body.appendChild(row);
      }
    });

    nodeInspector.classList.remove("hidden");
  }

  btnCloseInspector.addEventListener("click", () => {
    nodeInspector.classList.add("hidden");
  });

  // 5. Trigger Outage & Run Swarm Triage
  btnTriggerOutage.addEventListener("click", async () => {
    const targetId = scenarioSelect.value;
    activeTargetNodeId = targetId;

    btnTriggerOutage.disabled = true;
    btnTriggerOutage.textContent = "Swarm Reasoning...";

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_node_id: targetId })
      });
      const data = await res.json();

      // Switch to triage tab
      document.querySelector('[data-tab="tab-triage"]').click();
      renderTriageResults(data);

      // Re-render graph highlighting the root cause and downstream cascade
      const blastNodeIds = data.topology_analysis.blast_radius.nodes.map(n => n.id);
      renderGraph(targetId, blastNodeIds);

    } catch (err) {
      console.error("Triage error:", err);
      alert("Failed to execute swarm triage.");
    } finally {
      btnTriggerOutage.disabled = false;
      btnTriggerOutage.textContent = "⚡ Trigger Outage";
    }
  });

  // 6. Render Swarm Triage Findings
  function renderTriageResults(data) {
    triageEmpty.classList.add("hidden");
    triageResults.classList.remove("hidden");

    document.getElementById("incident-sev").textContent = data.severity;
    document.getElementById("incident-elapsed").textContent = `FalkorDB Traversal: ${data.total_execution_ms}ms`;
    document.getElementById("incident-headline").textContent = `Anomaly Detected on ${data.topology_analysis.root_name}`;
    document.getElementById("incident-summary").textContent = 
      `The 3-agent swarm traversed FalkorDB context graph to assess downstream blast radius (${data.topology_analysis.blast_radius.impacted_count} services affected), recalled historical incident patterns, and traced author provenance.`;

    document.getElementById("recommended-action-text").textContent = data.recommended_action;

    // Agent 1: Topology Sentinel
    const topoBody = document.getElementById("agent-topo-body");
    topoBody.innerHTML = `
      <div class="reasoning-item">
        <div class="reasoning-item-title">Blast Radius & Criticality Index</div>
        <p>Impacted Nodes: <strong>${data.topology_analysis.blast_radius.impacted_count}</strong> | PageRank Vulnerability: <strong>${data.topology_analysis.pagerank_index}</strong></p>
      </div>
      <div class="reasoning-item">
        <div class="reasoning-item-title">Correlated PRs / Deployments</div>
        <p>${data.topology_analysis.correlated_prs.length > 0 ? data.topology_analysis.correlated_prs.map(p => `• ${p.name} (Merged ${p.merged_at})`).join("<br>") : "No suspicious commits detected within 24h."}</p>
      </div>
      <div class="reasoning-item">
        <div class="reasoning-item-title">Executed FalkorDB Cypher Traversal:</div>
        <div class="cypher-snippet">${data.topology_analysis.reasoning_steps[1].cypher}</div>
      </div>
    `;

    // Agent 2: Memory & Coordinator
    const memBody = document.getElementById("agent-mem-body");
    const pastInc = data.memory_analysis.matched_incidents[0];
    const runbook = data.memory_analysis.recommended_runbooks[0];
    memBody.innerHTML = `
      <div class="reasoning-item">
        <div class="reasoning-item-title">Episodic Memory Recall</div>
        <p>${pastInc ? `Matched historical pattern: <strong>${pastInc.name}</strong><br>Past Root Cause: ${pastInc.root_cause}` : "No identical past failure recorded in episodic memory."}</p>
      </div>
      <div class="reasoning-item">
        <div class="reasoning-item-title">Procedural Memory (Validated Runbook)</div>
        <p>${runbook ? `Runbook: <strong>${runbook.name}</strong> (Confidence: ${Math.round((runbook.confidence_score || 0.9) * 100)}%)` : "Manual intervention required."}</p>
      </div>
      <div class="reasoning-item">
        <div class="reasoning-item-title">FalkorDB Memory Query:</div>
        <div class="cypher-snippet">${data.memory_analysis.reasoning_steps[0].cypher}</div>
      </div>
    `;

    // Agent 3: Company Brain
    const brainBody = document.getElementById("agent-brain-body");
    const onCall = data.brain_analysis.on_call_responder;
    const experts = data.brain_analysis.subject_matter_experts;
    brainBody.innerHTML = `
      <div class="reasoning-item">
        <div class="reasoning-item-title">Designated Incident Commander & Owners</div>
        <p>On-Call Lead: <strong>${onCall ? `${onCall.name} (${onCall.role}, Slack: ${onCall.slack})` : "On-Call Rotation Unassigned"}</strong></p>
        <p>Subject Matter Experts: ${experts.map(e => `${e.name} [${e.ownership_type}]`).join(", ")}</p>
      </div>
      <div class="reasoning-item">
        <div class="reasoning-item-title">FalkorDB Provenance Cypher Query:</div>
        <div class="cypher-snippet">${data.brain_analysis.reasoning_steps[0].cypher}</div>
      </div>
    `;
  }

  // 7. Apply Autonomous Mitigation
  btnApplyMitigation.addEventListener("click", async () => {
    if (!activeTargetNodeId) return;

    btnApplyMitigation.disabled = true;
    btnApplyMitigation.textContent = "Applying Autonomous Fix...";

    try {
      const res = await fetch("/api/mitigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_node_id: activeTargetNodeId, action_type: "Execute Runbook & Clear Backlog" })
      });
      const data = await res.json();

      alert(`✅ Mitigation Executed!\n${data.message}\nAction written to FalkorDB episodic memory.`);
      
      // Reload graph and reset visualization to healthy state
      await loadGraph();
      btnApplyMitigation.disabled = false;
      btnApplyMitigation.textContent = "✓ Mitigated & Saved";
      triageEmpty.classList.remove("hidden");
      triageResults.classList.add("hidden");

    } catch (err) {
      console.error("Mitigation error:", err);
      alert("Mitigation failed.");
      btnApplyMitigation.disabled = false;
    }
  });

  // 8. Reset Mesh Button
  btnResetMesh.addEventListener("click", async () => {
    await fetch("/api/reset", { method: "POST" });
    await loadGraph();
    triageEmpty.classList.remove("hidden");
    triageResults.classList.add("hidden");
  });

  // 9. Cypher Console
  chipBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      cypherInput.value = btn.dataset.query;
      executeCypher(btn.dataset.query);
    });
  });

  btnRunCypher.addEventListener("click", () => {
    executeCypher(cypherInput.value);
  });

  async function executeCypher(query) {
    if (!query || !query.trim()) return;
    cypherResultsJson.textContent = "Running query in FalkorDB...";
    try {
      const res = await fetch("/api/cypher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() })
      });
      const data = await res.json();
      cypherMs.textContent = `${data.execution_time_ms} ms (${data.mode})`;
      cypherResultsJson.textContent = JSON.stringify(data.records, null, 2);
    } catch (err) {
      cypherResultsJson.textContent = `Error executing query: ${err}`;
    }
  }

  // 10. Episodic Memory Timeline Tab
  function renderMemoryTimeline() {
    const container = document.getElementById("memory-timeline");
    if (!container) return;
    container.innerHTML = "";

    const memoryNodes = graphData.nodes.filter(n => ["PastIncident", "Runbook"].includes(n.label));
    memoryNodes.forEach(m => {
      const card = document.createElement("div");
      card.className = "memory-card";
      card.innerHTML = `
        <div class="memory-card-top">
          <span>${m.label.toUpperCase()}</span>
          <span>${m.occurred || "VERIFIED RUNBOOK"}</span>
        </div>
        <div class="memory-title">${m.name}</div>
        <div class="memory-details">
          ${m.root_cause ? `<div><strong>Root Cause:</strong> ${m.root_cause}</div>` : ""}
          ${m.resolution ? `<div><strong>Resolution:</strong> ${m.resolution}</div>` : ""}
          ${m.confidence_score ? `<div><strong>Confidence:</strong> ${(m.confidence_score * 100).toFixed(0)}%</div>` : ""}
        </div>
      `;
      container.appendChild(card);
    });
  }

  // Window Resize
  window.addEventListener("resize", () => {
    calculateNodeLayout();
    renderGraph();
  });

  // Initial Boot
  loadGraph();
});
