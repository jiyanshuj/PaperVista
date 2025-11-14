# TODO List for Updating Error Handling in /api/generate-questions Endpoint

- [x] Edit the `except Exception as e:` block in `backend/main.py` to add specific error checks for quota/rate limit (429) and API key (401) errors, falling back to generic 500 error.
