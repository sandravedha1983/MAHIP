from supabase import Client, create_client
from app.core.config import get_settings

settings = get_settings()

# Trusted server client. Never expose this client/key to the browser.
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_server_key,
)

# Publishable-key client is available for flows where the user's JWT/RLS
# context is explicitly passed. Do not use the server client for browser code.
supabase_public: Client = create_client(
    settings.supabase_url,
    settings.supabase_publishable_key,
)
