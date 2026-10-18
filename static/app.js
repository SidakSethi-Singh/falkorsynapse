/**
 * FalkorSynapse Frontend Controller (v2.0 Advanced)
 * Draggable SVG Graph Visualizer + Zoom/Pan + Web Audio Synthesizer + GraphRAG Chat + Shortest Path Finder
 */

document.addEventListener("DOMContentLoaded", () => {
  // Graph State
  let graphData = { nodes: [], edges: [] };
  let nodePositions = {};
  let activeTargetNodeId = null;
  let highlightedPathEdgeKeys = new Set();
  let highlightedNodeIds = new Set();

  // Zoom / Pan State
  let zoomLevel = 1.0;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;

  // Dragging State
  let draggingNodeId = null;

  // DOM Elements
  const svg = document.getElementById("graph-svg");
  const graphWrapper = document.getElementById("graph-wrapper");
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
  
  // Path Finder Elements
  const pathSourceSelect = document.getElementById("path-source-select");
  const pathTargetSelect = document.getElementById("path-target-select");
  const btnFindPath = document.getElementById("btn-find-path");
  
  // Zoom Elements
  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");
  const btnZoomReset = document.getElementById("btn-zoom-reset");

  // Tab Elements
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  
  // Chat Elements
  const chatMessages = document.getElementById("chat-messages");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatChips = document.querySelectorAll(".chat-chip");

  // Cypher Console Elements
  const cypherInput = document.getElementById("cypher-input");
  const btnRunCypher = document.getElementById("btn-run-cypher");
  const cypherResultsJson = document.getElementById("cypher-results-json");
  const cypherMs = document.getElementById("cypher-ms");
  const chipBtns = document.querySelectorAll(".chip-btn");

  // Audio Synth (Web Audio API)
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    return audioCtx;
  }

  function playAlertSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.debug("Audio synth note error:", e);
    }
  }

  function playSuccessSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.debug("Audio synth note error:", e);
    }
  }

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

  const labelColors = {
    Service: "#38bdf8",
    Database: "#4ade80",
    MessageBroker: "#ffa666",
    Cache: "#38bdf8",
    ExternalAPI: "#a78bfa",
    Engineer: "#ff76a5",
    PullRequest: "#a78bfa",
    Runbook: "#feef85",
    PastIncident: "#f87171"
  };

  // 1. Fetch & Initialize Graph
  async function loadGraph() {
    try {
      const res = await fetch("/api/graph");
      const data = await res.json();
      graphData = data;
      
      meshStats.textContent = `${data.total_nodes} Nodes • ${data.total_edges} Relationships • FalkorDB Engine Active`;
      if (data.driver_mode) {
        driverStatusText.textContent = `Engine: ${data.driver_mode}`;
      }
      
      calculateNodeLayout();
      populateDropdowns();
      renderGraph();
      renderMemoryTimeline();
    } catch (err) {
      console.error("Failed to load graph data:", err);
      meshStats.textContent = "Error connecting to FalkorDB backend";
    }
  }

  function populateDropdowns() {
    if (!pathSourceSelect || !pathTargetSelect) return;
    pathSourceSelect.innerHTML = '<option value="">Start Node...</option>';
    pathTargetSelect.innerHTML = '<option value="">End Node...</option>';

    graphData.nodes.forEach(n => {
      const opt1 = document.createElement("option");
      opt1.value = n.id;
      opt1.textContent = n.name || n.id;
      pathSourceSelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = n.id;
      opt2.textContent = n.name || n.id;
      pathTargetSelect.appendChild(opt2);
    });

    pathSourceSelect.value = "svc_checkout_flow";
    pathTargetSelect.value = "infra_postgres_ledger";
  }

  // 2. Spatial Ring Layout
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

    function arrangeRing(nodes, radius, angleOffset = 0) {
      const step = (2 * Math.PI) / (nodes.length || 1);
      nodes.forEach((n, i) => {
        if (!nodePositions[n.id]) {
          const angle = angleOffset + i * step;
          nodePositions[n.id] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          };
        }
      });
    }

    arrangeRing(layers.infra, Math.min(width, height) * 0.18, 0.2);
    arrangeRing(layers.services, Math.min(width, height) * 0.32, 0.5);
    arrangeRing(layers.people, Math.min(width, height) * 0.44, 0.1);
    arrangeRing(layers.commits, Math.min(width, height) * 0.44, Math.PI);
    arrangeRing(layers.memory, Math.min(width, height) * 0.25, -Math.PI / 2);
  }

  // 3. Render SVG Graph with Dragging, Zoom & Pan
  function renderGraph() {
    svg.innerHTML = "";

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="arrow" viewBox="0 -5 10 10" refX="22" refY="0" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,-5L10,0L0,5" fill="rgba(255,255,255,0.2)"></path>
      </marker>
      <marker id="arrow-alert" viewBox="0 -5 10 10" refX="22" refY="0" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,-5L10,0L0,5" fill="#ef4444"></path>
      </marker>
      <marker id="arrow-path" viewBox="0 -5 10 10" refX="22" refY="0" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,-5L10,0L0,5" fill="#06b6d4"></path>
      </marker>
    `;
    svg.appendChild(defs);

    // Zoom & Pan Container
    const zoomGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    zoomGroup.setAttribute("id", "zoom-group");
    zoomGroup.setAttribute("transform", `translate(${panX}, ${panY}) scale(${zoomLevel})`);
    svg.appendChild(zoomGroup);

    const edgesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    zoomGroup.appendChild(edgesGroup);
    zoomGroup.appendChild(nodesGroup);

    // Render Edges
    graphData.edges.forEach(edge => {
      const p1 = nodePositions[edge.source];
      const p2 = nodePositions[edge.target];
      if (!p1 || !p2) return;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", p1.x);
      line.setAttribute("y1", p1.y);
      line.setAttribute("x2", p2.x);
      line.setAttribute("y2", p2.y);
      line.setAttribute("id", `edge-${edge.source}-${edge.target}`);
      line.setAttribute("class", "edge-line");
      line.setAttribute("marker-end", "url(#arrow)");

      const edgeKeyForward = `${edge.source}->${edge.target}`;
      const edgeKeyBackward = `${edge.target}->${edge.source}`;

      if (highlightedPathEdgeKeys.has(edgeKeyForward) || highlightedPathEdgeKeys.has(edgeKeyBackward)) {
        line.classList.add("edge-path");
        line.setAttribute("marker-end", "url(#arrow-path)");
      } else if (
        (edge.source === activeTargetNodeId && highlightedNodeIds.has(edge.target)) ||
        (highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target))
      ) {
        line.classList.add("edge-highlight");
        line.setAttribute("marker-end", "url(#arrow-alert)");
      }

      edgesGroup.appendChild(line);
    });

    // Render Nodes
    graphData.nodes.forEach(node => {
      const pos = nodePositions[node.id];
      if (!pos) return;

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
      group.setAttribute("id", `node-group-${node.id}`);
      group.style.cursor = "grab";

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      const isDegraded = node.status === "degraded" || node.id === activeTargetNodeId;
      const isHighlighted = highlightedNodeIds.has(node.id);
      
      const radius = isDegraded ? 15 : (isHighlighted ? 13 : 11);
      circle.setAttribute("r", radius);
      circle.setAttribute("fill", isDegraded ? "#ef4444" : (isHighlighted ? "#f59e0b" : (labelColors[node.label] || "#64748b")));
      circle.setAttribute("stroke", isDegraded ? "#fca5a5" : "#ffffff");
      circle.setAttribute("stroke-width", isDegraded ? "3" : "1.5");
      circle.setAttribute("class", isDegraded ? "node-circle node-degraded" : "node-circle");

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("y", radius + 13);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", isDegraded ? "#fca5a5" : (isHighlighted ? "#fcd34d" : "#e2e8f0"));
      text.setAttribute("font-size", "10px");
      text.setAttribute("font-family", "Inter, sans-serif");
      text.setAttribute("font-weight", isDegraded || isHighlighted ? "700" : "400");
      text.textContent = (node.name || node.id).substring(0, 20);

      group.appendChild(circle);
      group.appendChild(text);

      // Node Dragging Handlers
      group.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        draggingNodeId = node.id;
        group.style.cursor = "grabbing";
      });

      // Click to inspect
      group.addEventListener("click", () => openInspector(node));

      nodesGroup.appendChild(group);
    });
  }

  // SVG Pan & Drag Handlers
  svg.addEventListener("mousedown", (e) => {
    if (!draggingNodeId) {
      isPanning = true;
      startPanX = e.clientX - panX;
      startPanY = e.clientY - panY;
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (draggingNodeId) {
      const rect = svg.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - panX) / zoomLevel;
      const mouseY = (e.clientY - rect.top - panY) / zoomLevel;
      
      nodePositions[draggingNodeId] = { x: mouseX, y: mouseY };
      renderGraph();
    } else if (isPanning) {
      panX = e.clientX - startPanX;
      panY = e.clientY - startPanY;
      const zoomGroup = document.getElementById("zoom-group");
      if (zoomGroup) {
        zoomGroup.setAttribute("transform", `translate(${panX}, ${panY}) scale(${zoomLevel})`);
      }
    }
  });

  window.addEventListener("mouseup", () => {
    draggingNodeId = null;
    isPanning = false;
  });

  // Zoom Controls
  btnZoomIn.addEventListener("click", () => {
    zoomLevel = Math.min(2.5, zoomLevel + 0.2);
    renderGraph();
  });

  btnZoomOut.addEventListener("click", () => {
    zoomLevel = Math.max(0.4, zoomLevel - 0.2);
    renderGraph();
  });

  btnZoomReset.addEventListener("click", () => {
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    renderGraph();
  });

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

  // 5. Shortest Path Finder
  btnFindPath.addEventListener("click", async () => {
    const src = pathSourceSelect.value;
    const tgt = pathTargetSelect.value;
    if (!src || !tgt || src === tgt) return;

    btnFindPath.textContent = "...";
    try {
      const res = await fetch(`/api/shortest-path?source=${src}&target=${tgt}`);
      const data = await res.json();
      btnFindPath.textContent = "Find Path";

      if (data.found) {
        highlightedPathEdgeKeys.clear();
        highlightedNodeIds.clear();
        
        data.nodes.forEach(n => highlightedNodeIds.add(n.id));
        for (let i = 0; i < data.nodes.length - 1; i++) {
          highlightedPathEdgeKeys.add(`${data.nodes[i].id}->${data.nodes[i+1].id}`);
        }

        renderGraph();
        playSuccessSound();
      } else {
        alert("No connected path found between selected systems.");
      }
    } catch (e) {
      btnFindPath.textContent = "Find Path";
    }
  });

  // 6. Trigger Outage & Run Swarm Triage
  btnTriggerOutage.addEventListener("click", async () => {
    const targetId = scenarioSelect.value;
    activeTargetNodeId = targetId;

    playAlertSound();
    btnTriggerOutage.disabled = true;
    btnTriggerOutage.textContent = "Swarm Reasoning...";

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_node_id: targetId })
      });
      const data = await res.json();

      document.querySelector('[data-tab="tab-triage"]').click();
      renderTriageResults(data);

      highlightedPathEdgeKeys.clear();
      highlightedNodeIds.clear();
      data.topology_analysis.blast_radius.nodes.forEach(n => highlightedNodeIds.add(n.id));

      renderGraph();

    } catch (err) {
      console.error("Triage error:", err);
      alert("Failed to execute swarm triage.");
    } finally {
      btnTriggerOutage.disabled = false;
      btnTriggerOutage.textContent = "⚡ Trigger Outage";
    }
  });

  // 7. Render Swarm Triage Findings
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

  // 8. Apply Autonomous Mitigation
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

      playSuccessSound();
      alert(`✅ Mitigation Executed!\n${data.message}\nAction written to FalkorDB episodic memory.`);
      
      activeTargetNodeId = null;
      highlightedNodeIds.clear();
      highlightedPathEdgeKeys.clear();
      
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

  // 9. Reset Mesh Button
  btnResetMesh.addEventListener("click", async () => {
    activeTargetNodeId = null;
    highlightedNodeIds.clear();
    highlightedPathEdgeKeys.clear();
    await fetch("/api/reset", { method: "POST" });
    await loadGraph();
    triageEmpty.classList.remove("hidden");
    triageResults.classList.add("hidden");
  });

  // 10. GraphRAG Chat Interaction
  chatChips.forEach(chip => {
    chip.addEventListener("click", () => {
      chatInput.value = chip.dataset.prompt;
      submitChat(chip.dataset.prompt);
    });
  });

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = chatInput.value.trim();
    if (!q) return;
    submitChat(q);
  });

  async function submitChat(question) {
    appendChatMessage("user", question);
    chatInput.value = "";

    const loadingId = appendChatMessage("assistant", "Traversing FalkorDB knowledge graph in sub-milliseconds...");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      const data = await res.json();

      // Highlight involved nodes on canvas
      highlightedNodeIds.clear();
      highlightedPathEdgeKeys.clear();
      if (data.highlight_nodes) {
        data.highlight_nodes.forEach(id => highlightedNodeIds.add(id));
      }
      if (data.path_steps && data.path_steps.length > 0) {
        for (let i = 0; i < data.path_steps.length; i++) {
          highlightedPathEdgeKeys.add(`${data.path_steps[i].from_id}->${data.path_steps[i].to_id}`);
        }
      }
      renderGraph();

      // Render formatted response
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) {
        loadingEl.innerHTML = `
          <div>${data.answer.replace(/\n/g, "<br>")}</div>
          <div style="margin-top:8px;font-size:0.72rem;color:var(--text-dim);">
            <span>⚡ FalkorDB Latency: <strong>${data.execution_ms}ms</strong></span>
          </div>
          <div class="cypher-snippet">${data.cypher_query}</div>
        `;
      }
    } catch (e) {
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.textContent = "Error querying FalkorDB: " + e;
    }
  }

  function appendChatMessage(sender, text) {
    const msg = document.createElement("div");
    const id = "msg-" + Date.now();
    msg.id = id;
    msg.className = `chat-msg msg-${sender}`;
    msg.innerHTML = sender === "user" ? `<strong>You:</strong> ${text}` : `<strong>Synapse AI:</strong> ${text}`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
  }

  // 11. Cypher Console
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

  // 12. Episodic Memory Timeline Tab
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
