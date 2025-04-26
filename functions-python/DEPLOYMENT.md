# Cloud Function Deployment Checklist

Before deploying Cloud Functions, verify the following:

## Response Serialization
- [ ] All API responses are properly serialized (never return Response objects directly)
- [ ] The `ensure_serializable_response` function is used for all external API responses
- [ ] Error handling is in place for all external API calls
- [ ] All functions return JSON-serializable objects

## CORS Configuration
- [ ] CORS headers are properly configured with `@cross_origin(origins=["*"], max_age=3600)`
- [ ] The function handles OPTIONS requests correctly

## Testing
- [ ] Run unit tests to verify response serialization
- [ ] Test the function locally before deployment
- [ ] Verify that the function works with the frontend

## Common Issues and Solutions

### "Object of type Response is not JSON serializable"
This error occurs when a Python `requests.Response` object is returned directly instead of its JSON content.

**Solution:**
```python
# WRONG - Will cause serialization error
return response

# CORRECT - Extract JSON data
return response.json()

# BEST - Use the helper function
return ensure_serializable_response(response)
```

### CORS Issues
CORS issues occur when the Cloud Function doesn't have the proper headers to allow cross-origin requests.

**Solution:**
```python
@https_fn.on_call(secrets=[API_KEY])
@cross_origin(origins=["*"], max_age=3600)  # Add this decorator
def myFunction(req: https_fn.CallableRequest) -> dict:
    # Function implementation
```

## Deployment Command

To deploy a specific function:
```bash
firebase deploy --only functions:functionName
```

To deploy all functions:
```bash
firebase deploy --only functions
```

## Monitoring

After deployment, monitor the function logs for any errors:
```bash
firebase functions:log
```

Or check the Firebase Console > Functions > Logs.
