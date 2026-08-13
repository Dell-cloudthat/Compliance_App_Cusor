# Compatibility shim — file relocated to mcp/clients/okta_iam.py
# All existing imports continue to work; new code should import from the new location.
from integrations.clients.okta_iam import (  # noqa: F401
    OktaIAMClient,
    CONTROL_MAPPINGS,
    MCP_TOOLS,
    call_tool,
    verify_okta_token,
    okta_get_violation_sources,
)
