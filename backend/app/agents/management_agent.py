def appointment_tool_args(request: str) -> dict:
    """
    Converts a natural-language management request into a safe intermediate object.
    Actual appointment creation is performed by a backend endpoint/tool, not by an LLM.
    """
    return {
        "request": request,
        "action": "requires_backend_validation",
    }
