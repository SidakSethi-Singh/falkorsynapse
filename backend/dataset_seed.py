"""
Realistic enterprise seed dataset representing a distributed FinTech infrastructure:
- Services & APIs
- Databases & Message Brokers
- Engineers & Teams
- Code Commits & PRs
- Incident History & Resolution Runbooks
"""

from .graph_engine import engine

def seed_enterprise_mesh():
    # Clear existing state
    engine.nx_graph.clear()
    engine.node_store.clear()
    engine.edge_store.clear()

    # ========================================================
    # 1. CORE SERVICES (Track 1: Connected Data)
    # ========================================================
    services = [
        {"id": "svc_api_gateway", "label": "Service", "name": "API Gateway Envoy", "tier": "tier-0", "criticality": 5.0, "status": "healthy", "qps": 12500},
        {"id": "svc_auth_iam", "label": "Service", "name": "Auth & IAM Service", "tier": "tier-0", "criticality": 4.8, "status": "healthy", "qps": 8200},
        {"id": "svc_payments_core", "label": "Service", "name": "Core Payments Engine", "tier": "tier-0", "criticality": 5.0, "status": "healthy", "qps": 4300},
        {"id": "svc_checkout_flow", "label": "Service", "name": "Checkout Web Experience", "tier": "tier-1", "criticality": 4.5, "status": "healthy", "qps": 3100},
        {"id": "svc_fraud_detector", "label": "Service", "name": "Real-time Fraud Sentinel", "tier": "tier-1", "criticality": 4.2, "status": "healthy", "qps": 4300},
        {"id": "svc_ledger_accounting", "label": "Service", "name": "Double-Entry Ledger", "tier": "tier-0", "criticality": 4.9, "status": "healthy", "qps": 1800},
        {"id": "svc_notification_hub", "label": "Service", "name": "Customer Notification Hub", "tier": "tier-2", "criticality": 2.5, "status": "healthy", "qps": 900},
        {"id": "svc_analytics_etl", "label": "Service", "name": "Risk & Analytics Pipeline", "tier": "tier-2", "criticality": 2.0, "status": "healthy", "qps": 450},
    ]

    for s in services:
        engine.add_node(s["id"], s["label"], s)

    # ========================================================
    # 2. DATA INFRASTRUCTURE & BROKERS
    # ========================================================
    infra = [
        {"id": "infra_kafka_tx", "label": "MessageBroker", "name": "Kafka Event Bus (tx.events)", "tier": "tier-0", "criticality": 4.9, "status": "healthy", "throughput": "2.4 GB/s"},
        {"id": "infra_postgres_ledger", "label": "Database", "name": "Postgres Primary (LedgerDB)", "tier": "tier-0", "criticality": 5.0, "status": "healthy", "connections": 142},
        {"id": "infra_redis_token_cache", "label": "Cache", "name": "Redis Session & Token Cluster", "tier": "tier-1", "criticality": 4.0, "status": "healthy", "hit_rate": "99.4%"},
        {"id": "infra_stripe_psp", "label": "ExternalAPI", "name": "Stripe Global PSP Gateway", "tier": "tier-0", "criticality": 4.8, "status": "healthy", "sla": "99.99%"},
    ]

    for i in infra:
        engine.add_node(i["id"], i["label"], i)

    # ========================================================
    # 3. PEOPLE & TEAMS (Track 3: Company Brain)
    # ========================================================
    people = [
        {"id": "eng_alex_mercer", "label": "Engineer", "name": "Alex Mercer", "role": "Principal SRE", "timezone": "UTC-5", "on_call": True, "slack": "@alex_sre"},
        {"id": "eng_priya_sharma", "label": "Engineer", "name": "Priya Sharma", "role": "Lead Payments Architect", "timezone": "UTC+5:30", "on_call": False, "slack": "@priya_pay"},
        {"id": "eng_marcus_vance", "label": "Engineer", "name": "Marcus Vance", "role": "Senior Security Engineer", "timezone": "UTC-8", "on_call": True, "slack": "@marcus_sec"},
        {"id": "eng_elena_rostova", "label": "Engineer", "name": "Elena Rostova", "role": "Staff Data Infrastructure", "timezone": "UTC+1", "on_call": False, "slack": "@elena_data"},
    ]

    for p in people:
        engine.add_node(p["id"], p["label"], p)

    # ========================================================
    # 4. RECENT COMMITS & CODE REPOSITORIES
    # ========================================================
    commits = [
        {"id": "pr_8921_connection_pool", "label": "PullRequest", "name": "PR #8921: Optimize DB Connection Pooling", "author": "eng_priya_sharma", "merged_at": "Today 14:20", "status": "merged"},
        {"id": "pr_8924_kafka_backpressure", "label": "PullRequest", "name": "PR #8924: Tuning Kafka Consumer Buffer & Backpressure", "author": "eng_elena_rostova", "merged_at": "Today 16:05", "status": "merged"},
        {"id": "pr_8930_auth_jwt_ttl", "label": "PullRequest", "name": "PR #8930: Extend Auth JWT Lifetime for Long Sessions", "author": "eng_alex_mercer", "merged_at": "Yesterday 11:00", "status": "merged"},
    ]

    for c in commits:
        engine.add_node(c["id"], c["label"], c)

    # ========================================================
    # 5. EPISODIC INCIDENT MEMORY & RUNBOOKS (Track 2: Memory)
    # ========================================================
    memory_nodes = [
        {
            "id": "inc_2026_09_12", 
            "label": "PastIncident", 
            "name": "INC-4091: Redis Cluster Memory Leak", 
            "occurred": "2026-09-12",
            "root_cause": "Key expiration backlog exhausted maxmemory eviction thread", 
            "resolution": "Applied dynamic key slicing + restarted secondary nodes"
        },
        {
            "id": "inc_2026_10_02", 
            "label": "PastIncident", 
            "name": "INC-4120: Postgres Deadlock on Ledger Transactions", 
            "occurred": "2026-10-02",
            "root_cause": "Unindexed foreign key cascade lock on idempotency_keys table", 
            "resolution": "Added concurrent index and scaled connection limit from 100 to 250"
        },
        {
            "id": "runbook_db_pool_drain",
            "label": "Runbook",
            "name": "Runbook 14: Emergency Connection Pool Eviction & Hot Replica Promotion",
            "confidence_score": 0.94,
            "automation_safe": True
        },
        {
            "id": "runbook_kafka_rewind",
            "label": "Runbook",
            "name": "Runbook 08: Consumer Group Partition Rebalance & Lag Throttle",
            "confidence_score": 0.88,
            "automation_safe": True
        }
    ]

    for m in memory_nodes:
        engine.add_node(m["id"], m["label"], m)

    # ========================================================
    # 6. EDGES & MULTI-HOP RELATIONSHIPS
    # ========================================================
    # Service topology dependencies
    engine.add_edge("svc_checkout_flow", "svc_api_gateway", "ROUTES_THROUGH", {"weight": 1.0})
    engine.add_edge("svc_api_gateway", "svc_auth_iam", "AUTHENTICATES_WITH", {"weight": 1.0})
    engine.add_edge("svc_api_gateway", "svc_payments_core", "FORWARD_CALL", {"weight": 1.0})
    engine.add_edge("svc_payments_core", "svc_fraud_detector", "SYNCHRONOUS_INSPECT", {"weight": 1.2})
    engine.add_edge("svc_payments_core", "infra_stripe_psp", "TRANSACTS_VIA", {"weight": 1.0})
    engine.add_edge("svc_payments_core", "infra_kafka_tx", "PUBLISHES_EVENT", {"weight": 0.8})
    engine.add_edge("infra_kafka_tx", "svc_ledger_accounting", "CONSUMED_BY", {"weight": 1.0})
    engine.add_edge("svc_ledger_accounting", "infra_postgres_ledger", "WRITES_TRANSACTIONS", {"weight": 1.5})
    engine.add_edge("svc_auth_iam", "infra_redis_token_cache", "CACHES_TOKENS_IN", {"weight": 0.9})
    engine.add_edge("infra_kafka_tx", "svc_notification_hub", "TRIGGERS_ALERTS", {"weight": 0.5})
    engine.add_edge("infra_kafka_tx", "svc_analytics_etl", "BATCH_CONSUMES", {"weight": 0.4})

    # People ownership (Company Brain)
    engine.add_edge("eng_priya_sharma", "svc_payments_core", "PRIMARY_ARCHITECT", {"since": "2024"})
    engine.add_edge("eng_priya_sharma", "infra_postgres_ledger", "SCHEMA_OWNER", {"since": "2023"})
    engine.add_edge("eng_alex_mercer", "svc_api_gateway", "MAINTAINER", {"level": "L3"})
    engine.add_edge("eng_alex_mercer", "svc_auth_iam", "MAINTAINER", {"level": "L3"})
    engine.add_edge("eng_marcus_vance", "svc_fraud_detector", "SECURITY_OWNER", {"level": "L3"})
    engine.add_edge("eng_elena_rostova", "infra_kafka_tx", "CLUSTER_LEAD", {"level": "L3"})

    # Code deployment lineage
    engine.add_edge("pr_8921_connection_pool", "infra_postgres_ledger", "MODIFIES_CONFIG", {"risk": "HIGH"})
    engine.add_edge("pr_8921_connection_pool", "svc_payments_core", "DEPLOYED_TO", {"env": "prod"})
    engine.add_edge("pr_8924_kafka_backpressure", "infra_kafka_tx", "MODIFIES_BUFFER", {"risk": "MED"})

    # Episodic memory connections
    engine.add_edge("inc_2026_10_02", "infra_postgres_ledger", "AFFECTED_TARGET", {"severity": "SEV-1"})
    engine.add_edge("inc_2026_10_02", "runbook_db_pool_drain", "RESOLVED_BY", {"time_to_fix": "12m"})
    engine.add_edge("inc_2026_09_12", "infra_redis_token_cache", "AFFECTED_TARGET", {"severity": "SEV-2"})

    print(f"Seeded FalkorSynapse mesh: {len(engine.node_store)} nodes, {len(engine.edge_store)} relationships.")

if __name__ == "__main__":
    seed_enterprise_mesh()
