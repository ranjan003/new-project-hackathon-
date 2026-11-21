# Price service (Python, for local testing)

Searches Google Shopping through SerpApi and compares store offers. The live website does the same job in the
Supabase Edge Function `supabase/functions/prices` (same search and the same 60% name-match rule), so this folder is
only for trying searches from the command line.

```bash
pip install -r backend/requirements.txt
echo "SERPAPI_KEY=your-key" > .env      # never commit this file
python -m backend.price_service.test_search
```

For the website, the key is the Supabase secret `SERPAPI_KEY` (Edge Functions → Secrets), never a `VITE_` variable.
