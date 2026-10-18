"""
FalkorSynapse: Autonomous Graph-Native SRE Swarm powered by FalkorDB
1-Command Launch Script (Safe Windows Console Encoding)
"""

import uvicorn
import os
import sys

# Ensure utf-8 stdout if possible
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

if __name__ == "__main__":
    print("=" * 65)
    print(" [*] Launching FalkorSynapse: Autonomous SRE Swarm")
    print(" [*] Powered by FalkorDB (Graph Hacks Hackathon 2026)")
    print("=" * 65)
    print("  * Web UI:        http://localhost:8000")
    print("  * API Docs:      http://localhost:8000/docs")
    print("  * Health Check:  http://localhost:8000/api/health")
    print("=" * 65)
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.api:app", host="0.0.0.0", port=port, reload=False)
