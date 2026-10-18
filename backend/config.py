import os
from pydantic import BaseModel

class Settings(BaseModel):
    # FalkorDB connection settings
    falkordb_host: str = os.getenv("FALKORDB_HOST", "localhost")
    falkordb_port: int = int(os.getenv("FALKORDB_PORT", "6379"))
    falkordb_password: str | None = os.getenv("FALKORDB_PASSWORD", None)
    graph_name: str = os.getenv("FALKORDB_GRAPH", "synapse_enterprise_mesh")
    
    # App settings
    app_port: int = int(os.getenv("PORT", "8000"))
    app_host: str = os.getenv("HOST", "0.0.0.0")
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    
settings = Settings()
