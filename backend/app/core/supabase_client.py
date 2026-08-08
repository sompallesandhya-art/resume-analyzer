from supabase import create_client, Client
from app.core.config import settings

_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Returns a singleton Supabase client for backend use.

    Uses the SERVICE ROLE key (not the anon key) because the backend
    needs full table access to perform operations on behalf of the
    authenticated user. Row Level Security is bypassed by the service
    role key, so every query/service function MUST manually filter by
    user_id (using the id from get_current_user()) to prevent one user
    from accessing another user's data.
    """
    global _supabase_client

    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set "
                "in the environment to initialize the Supabase client."
            )
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )

    return _supabase_client
