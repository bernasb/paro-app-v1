from flask import Flask, request, jsonify, g
import os
import firebase_admin
from firebase_admin import auth, credentials
from functools import wraps
from flask_cors import CORS
from services.liturgical import get_daily_readings_from_gemini
from services.magisterium import get_magisterium_chat_response, summarize_reading
from services.summary import get_reading_summary

# Initialize Firebase Admin SDK if not already initialized
if not firebase_admin._apps:
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred)

app = Flask(__name__)
CORS(app, origins=["https://paro.it.com", "http://localhost:8081"], supports_credentials=True)  # Allow all origins for testing; restrict in prod if needed

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
MAGISTERIUM_API_KEY = os.environ.get("MAGISTERIUM_API_KEY")

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', None)
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Missing or invalid Authorization header'}), 401
        token = auth_header.split(' ')[1]
        try:
            # Try verifying as a Firebase ID token
            decoded_token = auth.verify_id_token(token)
            g.user = decoded_token
            return f(*args, **kwargs)
        except Exception as e:
            # Not a valid Firebase token; could be a Google OIDC token (service account)
            # Optionally, add extra OIDC validation here if needed
            return jsonify({'status': 'error', 'message': 'Invalid or expired token', 'details': str(e)}), 401
    return decorated

# Helper: Extract user info from Firebase token
def get_current_user_info():
    """
    Returns the current authenticated user's info from g.user (Firebase token claims).
    Example: { 'uid': ..., 'email': ..., 'name': ... }
    """
    user = getattr(g, 'user', None)
    if not user:
        return None
    return {
        'uid': user.get('uid'),
        'email': user.get('email'),
        'name': user.get('name', user.get('displayName', ''))
    }

@app.route('/daily-readings', methods=['POST'])
@require_auth
def daily_readings():
    """
    Returns the daily readings for a given date.
    
    Request Body:
    {
        "date": "YYYY-MM-DD"
    }
    
    Response:
    {
        "status": "success",
        "data": [...readings...]
    }
    """
    data = request.get_json()
    date_str = data.get("date")
    if not date_str:
        return jsonify({"status": "error", "message": "Missing date"}), 400
    try:
        readings = get_daily_readings_from_gemini(date_str, GOOGLE_API_KEY)
        return jsonify({"status": "success", "data": readings})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/magisterium', methods=['POST'])
@require_auth
def magisterium():
    """
    Returns the Magisterium chat response for a given list of messages.
    
    Request Body:
    {
        "messages": [...messages...],
        "return_related_questions": boolean
    }
    
    Response:
    {
        "status": "success",
        "data": [...response...]
    }
    """
    data = request.get_json()
    messages = data.get("messages")
    return_related_questions = data.get("return_related_questions", False)
    if not messages or not isinstance(messages, list):
        return jsonify({"status": "error", "message": "Missing or invalid 'messages' array"}), 400
    try:
        result = get_magisterium_chat_response(messages, MAGISTERIUM_API_KEY, return_related_questions)
        return jsonify({"status": "success", "data": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/reading-summary', methods=['POST'])
@require_auth
def reading_summary():
    """
    Returns the summary of a reading for a given title and citation.
    
    Request Body:
    {
        "title": "...",
        "citation": "..."
    }
    
    Response:
    {
        "status": "success",
        "summary": "...",
        "detailedExplanation": "..."
    }
    """
    import logging
    data = request.get_json()
    title = data.get("title")
    citation = data.get("citation")
    if not title or not citation:
        return jsonify({"status": "error", "message": "Missing 'title' or 'citation'"}), 400
    try:
        result = get_reading_summary(title, citation, GOOGLE_API_KEY)
        # Normalize the response structure
        if result.get("status") == "success":
            summary = None
            detailed_explanation = None
            # New format
            if result.get("responseType") == "json" and isinstance(result.get("data"), dict):
                summary = result["data"].get("summary")
                detailed_explanation = result["data"].get("detailedExplanation")
            # Legacy format: just a string
            elif result.get("responseType") == "text":
                summary = result.get("data")
            # Fallback: try to use whatever is present
            if not summary:
                summary = result.get("data")
            return jsonify({
                "status": "success",
                "summary": summary,
                "detailedExplanation": detailed_explanation
            })
        else:
            logging.error(f"Summary generation failed: {result}")
            return jsonify({"status": "error", "message": result.get("data", "Unknown error")}), 500
    except Exception as e:
        logging.exception("Exception in /reading-summary endpoint")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
