# Firebase Functions Python main entry point - Updated with Gemini Integration
import re
import time
from firebase_functions import options, https_fn, params as function_params
from firebase_admin import initialize_app
import flask
import requests
import json
import traceback
import logging
from flask_cors import cross_origin
from datetime import datetime, timedelta
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Initialize Firebase Admin SDK
initialize_app()

# === 1. Helper Functions (Date, Liturgical Context, Cycles) ===
def validate_date(date_str):
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")  # Enforce YYYY-MM-DD
    except ValueError:
        print(f"Error: Invalid date format input: {date_str}. Please use YYYY-MM-DD.")
        return None

def get_first_sunday_of_advent(year):
    christmas_day = datetime(year, 12, 25)
    days_to_subtract_for_sunday = (christmas_day.weekday() + 1) % 7
    fourth_sunday_before_christmas = christmas_day - timedelta(days=days_to_subtract_for_sunday + (3 * 7))
    return fourth_sunday_before_christmas

def calculate_easter(year):
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    easter_date = datetime(year, month, day)
    return easter_date

def get_retry_session(for_post=False):
    session = requests.Session()
    allowed_methods = ["POST", "GET"] if for_post else ["GET"]
    retries = Retry(total=2, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504], allowed_methods=allowed_methods)
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

def get_liturgical_day(date_obj):
    url = f"http://calapi.inadiutorium.cz/api/v0/en/calendars/default/{date_obj.strftime('%Y/%m/%d')}"
    headers = {"User-Agent": "Python-Requests/CatholicReadingsScript-BareBones"}
    session = get_retry_session()
    response = session.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()

    celebrations = data.get("celebrations", [])
    celebrations.sort(key=lambda c: c.get("rank_num", 0.0), reverse=True)

    for c in celebrations:
        c.setdefault("title", "Unknown Celebration")
        c.setdefault("colour", "unknown")
        c.setdefault("rank", "unknown")
        c.setdefault("rank_num", 0.0)

    primary_celebration = celebrations[0] if celebrations else {}
    liturgical_day_title = primary_celebration.get("title", "Unknown")
    rank = primary_celebration.get("rank", "").lower()
    season = data.get("season", "ordinary").lower()
    season_week = data.get("season_week", 0)
    weekday = data.get("weekday", date_obj.strftime('%A')).lower()

    day_type = "Unknown"
    if "solemnity" in rank:
        day_type = "Solemnity"
    elif "feast" in rank and " of the lord" in primary_celebration.get("title", "").lower():
        day_type = "Feast of the Lord"
    elif "feast" in rank:
        day_type = "Feast"
    elif "sunday" in rank:
        day_type = f"Sunday of {season.capitalize()}" if season else "Sunday"
    elif date_obj.weekday() == 6:
        if "Sunday" not in day_type:
            day_type = f"Sunday of {season.capitalize()}" if season else "Sunday"
    elif rank == "memorial":
        day_type = "Memorial"
    elif rank == "optional memorial":
        day_type = "Optional Memorial"
    elif celebrations:
        day_type = primary_celebration.get("rank", "Weekday").replace('_', ' ').title()
    else:
        day_type = "Weekday"

    processed_data = {
        "api_source": "calapi",
        "liturgical_day": liturgical_day_title,
        "season": season,
        "season_week": season_week,
        "weekday": weekday,
        "celebrations": celebrations,
        "type": day_type,
    }
    return processed_data

def find_next_special_day(start_date, max_days=30):
    for i in range(1, max_days + 1):
        check_date = start_date + timedelta(days=i)
        try:
            day_info = get_liturgical_day(check_date)
            day_type = day_info.get("type", "Unknown")

            is_special = (
                day_type.startswith("Sunday") or
                day_type == "Solemnity" or
                day_type == "Feast" or
                day_type == "Feast of the Lord"
            )

            if is_special:
                return {
                    "date": check_date.strftime("%Y-%m-%d"),
                    "name": day_info.get("liturgical_day", "Unknown Special Day"),
                    "type": day_type
                }
        except Exception as e:
            print(f"Warning: Could not get info for {check_date.strftime('%Y-%m-%d')} while searching for next special day: {e}")
            continue

    return None

def get_liturgical_cycles(date_obj):
    info = get_liturgical_day(date_obj)
    day_type = info.get("type", "Unknown")
    liturgical_day_name = info.get("liturgical_day", "Unknown")

    is_sunday_or_major = (
        day_type.startswith("Sunday") or
        day_type == "Solemnity" or
        day_type == "Feast of the Lord"
    )

    applicable_cycle_type = "Sunday/Major" if is_sunday_or_major else "Weekday"
    year = date_obj.year

    first_advent_prev_year = get_first_sunday_of_advent(year - 1)
    first_advent_curr_year = get_first_sunday_of_advent(year)

    if date_obj >= first_advent_curr_year:
        liturgical_year_num = year + 1
    elif date_obj >= first_advent_prev_year:
        liturgical_year_num = year
    else:
        liturgical_year_num = year

    cycle_mod = liturgical_year_num % 3
    sunday_cycle = "A" if cycle_mod == 1 else "B" if cycle_mod == 2 else "C"

    weekday_cycle_calc = "I" if date_obj.year % 2 != 0 else "II"
    final_weekday_cycle = "N/A" if applicable_cycle_type == "Sunday/Major" else weekday_cycle_calc

    return sunday_cycle, final_weekday_cycle, applicable_cycle_type, info

# === 2. Gemini API Interaction ===
# Environment configuration key / Secret Definition
GOOGLE_API_KEY = function_params.SecretParam("GOOGLE_API_KEY")

def get_easter_vigil_readings():
    """
    Returns the fixed, ordered list of readings for Easter Vigil.
    These readings are the same every year.
    """
    return [
        # Reading I + Psalm I
        {"title": "Reading I", "reference": "Genesis 1:1—2:2"},
        {"title": "Psalm I", "reference": "Psalm 104:1-2, 5-6, 10, 12, 13-14, 24, 35"},
        
        # Reading II + Psalm II
        {"title": "Reading II", "reference": "Genesis 22:1-18"},
        {"title": "Psalm II", "reference": "Psalm 16:5, 8, 9-10, 11"},
        
        # Reading III + Psalm III
        {"title": "Reading III", "reference": "Exodus 14:15—15:1"},
        {"title": "Psalm III", "reference": "Exodus 15:1-2, 3-4, 5-6, 17-18"},
        
        # Reading IV + Psalm IV
        {"title": "Reading IV", "reference": "Isaiah 54:5-14"},
        {"title": "Psalm IV", "reference": "Psalm 30:2, 4, 5-6, 11-12, 13"},
        
        # Reading V + Psalm V
        {"title": "Reading V", "reference": "Isaiah 55:1-11"},
        {"title": "Psalm V", "reference": "Isaiah 12:2-3, 4, 5-6"},
        
        # Reading VI + Psalm VI
        {"title": "Reading VI", "reference": "Baruch 3:9-15, 32-4:4"},
        {"title": "Psalm VI", "reference": "Psalm 19:8, 9, 10, 11"},
        
        # Reading VII + Psalm VII
        {"title": "Reading VII", "reference": "Ezekiel 36:16-17a, 18-28"},
        {"title": "Psalm VII", "reference": "Psalm 42:3, 5; 43:3, 4"},
        
        # Epistle
        {"title": "Epistle", "reference": "Romans 6:3-11"},
        
        # Epistle Psalm (renamed to ensure it gets a summary)
        {"title": "Epistle Psalm", "reference": "Psalm 118:1-2, 16-17, 22-23"},
        
        # Gospel (varies by year, but we'll use the default)
        {"title": "Gospel", "reference": "Luke 24:1-12"}
    ]

def get_daily_readings_from_gemini(date_str, google_api_key):
    """
    Fetch Mass reading REFERENCES using Google Gemini API.
    date_str: Date in "YYYY-MM-DD" format
    google_api_key: API key for Gemini
    Returns: List of readings (dictionaries) with "title" and "reference"
             OR raises an exception on error.
    """
    logging.info(f"Starting get_daily_readings_from_gemini for date: {date_str}")
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")

    if not google_api_key:
        logging.error("Google API key is missing or empty")
        raise ValueError("Google API key is missing or empty.")
    
    logging.info("Configuring Gemini API")
    genai.configure(api_key=google_api_key)

    # Special case for Easter Vigil - use our predefined readings
    # Check this first to avoid unnecessary API calls
    try:
        logging.info("Checking if date is Easter Vigil")
        easter_date = calculate_easter(date_obj.year)
        holy_saturday_date = easter_date - timedelta(days=1)
        
        if date_obj.date() == holy_saturday_date.date():
            logging.info("Easter Vigil detected - using predefined readings list")
            return get_easter_vigil_readings()
    except Exception as e:
        logging.warning(f"Error checking Easter date: {e}")
    
    # For all other dates, use a simplified approach with Gemini
    logging.info("Preparing prompt for Gemini API")
    
    # Simplified prompt
    prompt = f"""
    As a Catholic liturgical expert, provide the scripture references for the Mass readings on {date_str}.
    Return ONLY a JSON array of objects with 'title' and 'reference' properties.
    Example: [
      {{"title": "First Reading", "reference": "Acts 2:14, 22-33"}},
      {{"title": "Responsorial Psalm", "reference": "Psalm 16:1-2, 5, 7-11"}},
      {{"title": "Second Reading", "reference": "1 Peter 1:17-21"}},
      {{"title": "Gospel", "reference": "Luke 24:13-35"}}
    ]
    Do not include any explanatory text, only the JSON array.
    """
    
    logging.info("Creating Gemini model instance")
    model = genai.GenerativeModel(model_name="gemini-2.5-pro-preview-03-25")
    
    logging.info("Setting up generation config")
    generation_config = genai.GenerationConfig(
        temperature=0.1,
        response_mime_type="application/json"
    )
    
    logging.info("Setting up safety settings")
    safety_settings = { cat: HarmBlockThreshold.BLOCK_NONE for cat in HarmCategory if cat != HarmCategory.HARM_CATEGORY_UNSPECIFIED }

    try:
        logging.info("Calling Gemini API to generate content")
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
            safety_settings=safety_settings,
            request_options={'timeout': 30}  # Reduced timeout to avoid function timeout
        )
        
        logging.info("Received response from Gemini API")
        json_string = response.text
        
        # Extract JSON if wrapped in other text
        json_start = json_string.find('[')
        json_end = json_string.rfind(']') + 1
        if json_start >= 0 and json_end > json_start:
            json_string = json_string[json_start:json_end]
        
        logging.info(f"Parsing JSON response: {json_string[:100]}...")
        readings = json.loads(json_string)
        
        if not isinstance(readings, list):
            logging.error("Gemini response is not a list")
            raise ValueError("Gemini response is not a list.")

        logging.info(f"Successfully parsed {len(readings)} readings")
        validated_readings = []
        for reading in readings:
            if not isinstance(reading, dict):
                continue
            title = reading.get("title")
            reference = reading.get("reference")
            if not title or not reference:
                continue
            validated_readings.append({"title": title, "reference": reference})
        
        logging.info(f"Returning {len(validated_readings)} validated readings")
        return validated_readings

    except requests.exceptions.RequestException as req_err:
        logging.error(f"Network error during API call: {req_err}")
        raise Exception(f"Network error during API call: {req_err}")
    except json.JSONDecodeError as json_err:
        logging.error(f"Failed to parse JSON response from Gemini: {json_err}")
        raise Exception(f"Failed to parse JSON response from Gemini: {json_err}")
    except ValueError as val_err:
        logging.error(f"Data validation error: {val_err}")
        raise Exception(f"Data validation error: {val_err}")
    except Exception as e:
        logging.error(f"Unexpected error during Gemini reading fetch: {type(e).__name__} - {e}")
        raise Exception(f"Unexpected error during Gemini reading fetch: {type(e).__name__} - {e}")

# === 3. Magisterium API Interaction (Existing - Extracted) ===
# Environment configuration key / Secret Definition
MAGISTERIUM_API_KEY = function_params.SecretParam("MAGISTERIUM_API_KEY")

@https_fn.on_call(secrets=[MAGISTERIUM_API_KEY])
def magisteriumProxy(req: https_fn.CallableRequest) -> dict:
    """
    Proxies requests to the Magisterium API.
    This function is configured as a callable function for use with httpsCallable.
    
    Expected request format:
    {
        "messages": [
            {"role": "user", "content": "..."},
            ...
        ],
        "return_related_questions": boolean
    }
    
    Returns:
    {
        "data": {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": string
                }
            }],
            "citations": [],
            "related_questions": []
        }
    }
    """
    try:
        logging.info("Received callable request")
        request_data = req.data
        logging.info(f"Request data structure: {json.dumps(request_data, indent=2)}")

        # Validate request data
        if not request_data or not isinstance(request_data, dict):
            error_msg = "Invalid request: Data must be a dictionary"
            logging.error(error_msg)
            return create_error_response(error_msg)

        if "messages" not in request_data or not isinstance(request_data["messages"], list):
            error_msg = "Invalid request: Missing or invalid 'messages' array"
            logging.error(error_msg)
            return create_error_response(error_msg)

        messages = request_data["messages"]
        return_related_questions = request_data.get("return_related_questions", False)

        # Get API key
        try:
            magisterium_api_key_value = MAGISTERIUM_API_KEY.value
            if not magisterium_api_key_value:
                error_msg = "API key is empty or invalid"
                logging.error(error_msg)
                return create_error_response(error_msg)
        except Exception as e:
            error_msg = f"Error retrieving Magisterium API key: {str(e)}"
            logging.error(error_msg)
            return create_error_response(error_msg)

        # Call Magisterium API
        try:
            magisterium_response = get_magisterium_chat_response(messages, magisterium_api_key_value, return_related_questions)
            
            # Verify response structure
            if not isinstance(magisterium_response, dict):
                error_msg = f"Invalid response type from Magisterium API: {type(magisterium_response)}"
                logging.error(error_msg)
                return create_error_response(error_msg)

            # Log successful response structure
            logging.info(f"Successful response structure: {json.dumps(magisterium_response, indent=2)}")
            
            # Wrap the response in the expected structure
            return {
                "status": "success",
                "responseType": "json",
                "data": magisterium_response
            }

        except Exception as e:
            error_msg = f"Error during Magisterium API interaction: {str(e)}"
            logging.error(f"magisteriumProxy - {error_msg}")
            return create_error_response(error_msg)

    except Exception as e:
        error_msg = f"Unexpected error in magisteriumProxy: {str(e)}"
        logging.error(error_msg)
        return create_error_response(error_msg)

def create_error_response(error_message: str) -> dict:
    """
    Creates a properly formatted error response.
    
    Returns:
        A JSON-serializable dictionary in the format:
        {
            "status": "error",
            "responseType": "json",
            "data": {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": string
                    },
                    "finish_reason": string
                }],
                "citations": [],
                "related_questions": []
            }
        }
    """
    return {
        "status": "error",
        "responseType": "json",
        "data": {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": f"I apologize, but an error occurred: {error_message}"
                },
                "finish_reason": "error"
            }],
            "citations": [],
            "related_questions": []
        }
    }

def ensure_serializable_response(response_obj):
    """
    Ensures that the response is JSON serializable and matches the expected MagisteriumResponse format.
    Always use this function before returning API responses.
    
    Args:
        response_obj: The response object to serialize
        
    Returns:
        A JSON-serializable dictionary in the format:
        {
            "choices": [{
                "message": {
                    "role": string,
                    "content": string
                },
                "finish_reason": string
            }],
            "citations": Citation[],
            "related_questions": string[]
        }
    """
    try:
        # If it's a requests.Response object, extract the JSON
        if hasattr(response_obj, 'json'):
            try:
                data = response_obj.json()
                logging.info(f"Raw API response: {json.dumps(data, indent=2)}")
            except Exception as e:
                logging.error(f"Failed to parse response JSON: {e}")
                return create_error_response(f"Failed to parse response JSON: {e}")
        else:
            data = response_obj

        # Ensure the data is a dictionary
        if not isinstance(data, dict):
            logging.error(f"Response data is not a dictionary: {type(data)}")
            return create_error_response("Invalid response format")

        # Extract or create the required fields
        choices = data.get("choices", [])
        if not choices:
            # Create a default choice for error cases
            choices = [{
                "message": {
                    "role": "assistant",
                    "content": str(data.get("error", "Unknown error"))
                },
                "finish_reason": "stop"
            }]

        # Ensure each choice has the correct structure
        formatted_choices = []
        for choice in choices:
            if isinstance(choice, dict):
                message = choice.get("message", {})
                if not isinstance(message, dict):
                    message = {
                        "role": "assistant",
                        "content": str(message) if message else "No content available"
                    }
                formatted_choice = {
                    "message": {
                        "role": message.get("role", "assistant"),
                        "content": message.get("content", "No content available")
                    },
                    "finish_reason": choice.get("finish_reason", "stop")
                }
                formatted_choices.append(formatted_choice)
            else:
                formatted_choices.append({
                    "message": {
                        "role": "assistant",
                        "content": str(choice) if choice else "No content available"
                    },
                    "finish_reason": "stop"
                })

        # Construct the final response matching MagisteriumResponse type
        formatted_response = {
            "choices": formatted_choices,
            "citations": data.get("citations", []),
            "related_questions": data.get("related_questions", [])
        }

        # Log the formatted response for debugging
        logging.info(f"Formatted response: {json.dumps(formatted_response, indent=2)}")

        # Verify the response is JSON serializable
        json.dumps(formatted_response)
        return formatted_response

    except Exception as e:
        logging.error(f"Error in ensure_serializable_response: {e}")
        return create_error_response(f"Failed to process response: {e}")

def create_error_response(error_message: str):
    """
    Creates a properly formatted error response.
    """
    return {
        "choices": [{
            "message": {
                "role": "assistant",
                "content": f"I apologize, but an error occurred: {error_message}"
            }
        }],
        "citations": [],
        "related_questions": []
    }

def get_magisterium_chat_response(messages, magisterium_api_key, return_related_questions=False):
    """
    Calls the Magisterium API and returns the response.
    
    ⚠️ IMPORTANT: Always return JSON-serializable objects, never return Response objects directly!
    ⚠️ IMPORTANT: Always use .json() on response objects and handle exceptions that might occur!
    ⚠️ IMPORTANT: Any changes to this function must maintain proper response serialization!
    
    Args:
        messages: List of message objects to send to the API
        magisterium_api_key: API key for authentication
        return_related_questions: Whether to request related questions
        
    Returns:
        A JSON-serializable dictionary containing the API response
    """
    magisterium_api_endpoint = "https://www.magisterium.com/api/v1/chat/completions"  # Assuming chat completions endpoint
    # Construct request body for Magisterium API - adjust as needed for their specific API
    request_body = {
        "model": "magisterium-1",  # Or the appropriate model
        "messages": messages,
        # Add other parameters as required by the Magisterium API, e.g., "return_related_questions"
    }
    if return_related_questions:
        request_body["return_related_questions"] = True

    try:
        magisterium_response = requests.post(
            magisterium_api_endpoint,
            headers={
                "Authorization": f"Bearer {magisterium_api_key}",
                "Content-Type": "application/json",
            },
            json=request_body,
            timeout=60,  # Increased timeout to 60 seconds
        )
        magisterium_response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        
        # Extract JSON data from the response - don't return the Response object directly
        return ensure_serializable_response(magisterium_response)

    except requests.exceptions.RequestException as e:
        error_message = f"Magisterium API request failed: {e}"
        logging.error(error_message)
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "I apologize, but I encountered an error when connecting to the Magisterium API. Please try again later."
                },
                "finish_reason": "error"
            }],
            "citations": [],
            "related_questions": []
        }
    except Exception as e:
        error_message = f"An unexpected error occurred: {e}"
        logging.error(error_message)
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "I apologize, but an unexpected error occurred. Please try again later."
                },
                "finish_reason": "error"
            }],
            "citations": [],
            "related_questions": []
        }

def summarize_reading(reading_text, magisterium_api_key):
    """
    Summarizes a single reading using the Magisterium API.
    
    ⚠️ IMPORTANT: Always return JSON-serializable objects, never return Response objects directly!
    ⚠️ IMPORTANT: Always use .json() on response objects and handle exceptions that might occur!
    ⚠️ IMPORTANT: Any changes to this function must maintain proper response serialization!
    
    Args:
        reading_text: The text of the reading to summarize
        magisterium_api_key: API key for authentication
        
    Returns:
        The summary (string) or a default message on error
    """
    magisterium_api_endpoint = "https://www.magisterium.com/api/v1/chat/completions"
    messages = [
        {
            "role": "system",
            "content": "You are a Catholic API endpoint that returns JSON. Respond ONLY with the valid JSON array requested. ABSOLUTELY NO introductory text, explanations, markdown formatting, character or word counts, or anything other than the JSON itself. Your entire response MUST start with '[' and end with ']'. Do not wrap the JSON in markdown code blocks. The JSON array should contain objects matching the LiturgicalReading interface: { title: string; citation: string; content: string; summary?: string; }. Ensure 'content' contains the full text of the reading and 'summary' is a concise 1-2 sentence overview. "
        },
        {
            "role": "user",
            "content": f"Provide a summary for the following Catholic Mass reading:\\n{reading_text}.\\n            For the reading, include:\\n            - summary: A Brief, plain language 3-4 sentence statement of the importance of this passage to the Catholic faith. NEVER INCLUDE CHARACTER COUNTS IN YOUR JSON OUTPUT.\\n\\n            Format the entire response as a single, valid JSON array of objects, where each object represents one reading.\\n            Ensure the JSON is valid and contains only the array."
        }
    ]

    request_body = {
        "model": "magisterium-1",
        "messages": messages,
    }

    try:
        magisterium_response = requests.post(
            magisterium_api_endpoint,
            headers={
                "Authorization": f"Bearer {magisterium_api_key}",
                "Content-Type": "application/json",
            },
            json=request_body,
            timeout=60  # Increased timeout to 60 seconds
        )
        magisterium_response.raise_for_status()

        # Use ensure_serializable_response to get a JSON-serializable object
        response = ensure_serializable_response(magisterium_response)
        content_string = response.get('choices', [{}])[0].get('message', {}).get('content')

        if content_string and isinstance(content_string, str):
            start_index = content_string.find('[')
            if start_index == -1:
                logging.warning("Could not find starting character '[' in content.")
                return "Summary unavailable. Please check back later."
            balance = 0
            end_index = -1
            for i in range(start_index, len(content_string)):
                if content_string[i] == '[':
                    balance += 1
                elif content_string[i] == ']':
                    balance -= 1
                if balance == 0 and i >= start_index:
                    end_index = i
                    break
            if end_index == -1:
                logging.warning("Could not find matching end character ']' for structure.")
                return "Summary unavailable. Please check back later."
            json_substring = content_string[start_index : end_index + 1]
            parsed_readings = json.loads(json_substring)
        else:
            logging.warning("Received invalid or missing content from AI.")
            return "Summary unavailable. Please check back later."

        if not isinstance(parsed_readings, list) or not parsed_readings:
            logging.warning("Parsed data is not a valid array of LiturgicalReading.")
            return "Summary unavailable. Please check back later."
        summary = parsed_readings[0].get("summary")
        if not summary:
            logging.warning("Summary field not present in Magisterium API response")
            return "Summary unavailable. Please check back later."

        return summary
    except requests.exceptions.RequestException as e:
        error_message = f"Magisterium API request failed: {e}"
        logging.error(error_message)
        return "Summary unavailable due to connection issues. Please try again later."
    except ValueError as e:
        error_message = f"Error during response parsing: {e}"
        logging.error(error_message)
        return "Summary unavailable due to parsing issues. Please try again later."
    except Exception as e:
        error_message = f"An unexpected error occurred: {e}"
        logging.error(error_message)
        return "Summary unavailable due to an unexpected error. Please try again later."

# === 4. Reading Summary Function with Gemini ===
@https_fn.on_call(secrets=[GOOGLE_API_KEY])
def readingSummaryProxy(req: https_fn.CallableRequest) -> dict:
    """
    Callable function to get a summary for a Bible reading using Gemini.
    Expects request data: { "title": "Reading Title", "citation": "Bible Citation" }
    Returns: { "status": "success", "responseType": "text", "data": "Summary text" }
    """
    try:
        logging.info("Received callable request for reading summary")
        request_data = req.data
        logging.info(f"Request data: {request_data}")

        if not request_data or "title" not in request_data or "citation" not in request_data:
            logging.error("Invalid request: Missing title or citation")
            return {
                "status": "error",
                "responseType": "error",
                "data": "Invalid request: Missing 'title' or 'citation'"
            }

        title = request_data["title"]
        citation = request_data["citation"]
        
        # Reuse the same API key loading logic as in dailyReadingsProxy
        try:
            google_api_key_value = GOOGLE_API_KEY.value
            logging.info("Successfully retrieved Google API key")
        except Exception as e:
            error_message = f"Error retrieving Google API key: {e}"
            logging.error(f"{error_message}\n{traceback.format_exc()}")
            return {
                "status": "error",
                "responseType": "error",
                "data": f"Internal server error during Google API key retrieval: {e}"
            }

        try:
            # Get summary from Gemini
            # We'll use the same genai configuration that's already set up in get_daily_readings_from_gemini
            genai.configure(api_key=google_api_key_value)
            model = genai.GenerativeModel(model_name="gemini-2.5-pro-preview-03-25")
            
            prompt = f"""
            Generate TWO different summaries for the Bible passage {title}: {citation} that explain its importance to Catholics:

            1. CONCISE SUMMARY: A bullet-point list (5-6 points) of key theological themes and significance, followed by a concluding sentence. Format exactly like this:

            For Catholics, {citation} is significant because it:

            • [First key point about theological significance]
            • [Second key point]
            • [Third key point]
            • [Fourth key point]
            • [Fifth key point]
            • [Optional sixth point if needed]

            [One concluding sentence that ties the points together]

            2. DETAILED EXPLANATION: A longer, structured explanation with headings and bullet points explaining the passage's context, theological themes, and Catholic interpretation. Use Markdown formatting with bold headings and bullet points.

            Return BOTH summaries in a JSON object with these exact keys:
            {{"conciseSummary": "...", "detailedExplanation": "..."}}
            """
            
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            
            logging.info(f"Successfully generated summaries for {title} ({citation})")
            
            # Parse the JSON response
            try:
                # Extract JSON if wrapped in other text
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_string = response_text[json_start:json_end]
                    response_json = json.loads(json_string)
                else:
                    # If no JSON found, use the whole response as concise summary
                    response_json = {"conciseSummary": response_text}
                
                # Return both summaries
                return {
                    "status": "success",
                    "responseType": "json",
                    "data": {
                        "summary": response_json.get("conciseSummary", ""),
                        "detailedExplanation": response_json.get("detailedExplanation", "")
                    }
                }
            except json.JSONDecodeError:
                # If JSON parsing fails, return the whole response as concise summary
                logging.warning(f"Failed to parse JSON response, using text response instead")
                return {
                    "status": "success",
                    "responseType": "text",
                    "data": response_text
                }
        except Exception as e:
            error_message = f"Error generating summary: {e}"
            logging.error(f"{error_message}\n{traceback.format_exc()}")
            return {
                "status": "error",
                "responseType": "error",
                "data": f"Failed to generate summary: {e}"
            }

    except Exception as e:
        error_message = f"Unexpected error in readingSummaryProxy: {e}"
        logging.error(f"{error_message}\n{traceback.format_exc()}")
        return {
            "status": "error",
            "responseType": "error",
            "data": str(e)
        }

# === 5. Daily Readings Callable Function ===
@https_fn.on_call(secrets=[GOOGLE_API_KEY])
def dailyReadingsProxy(req: https_fn.CallableRequest) -> dict:
    """
    Callable function to get daily readings WITHOUT summaries.
    Expects request data: { "date": "YYYY-MM-DD" }
    Returns: { "status": "success", "responseType": "json", "data": [...] }
    """
    try:
        logging.info("Received callable request for daily readings")
        start_time = time.time()
        request_data = req.data
        logging.info(f"Request data: {request_data}")

        if not request_data or "date" not in request_data:
            logging.error("Invalid request: Missing date")
            return {
                "status": "error",
                "responseType": "error",
                "data": "Invalid request: Missing 'date' in YYYY-MM-DD format"
            }

        date_str = request_data["date"]
        if not validate_date(date_str):
            logging.error(f"Invalid date format: {date_str}")
            return {
                "status": "error",
                "responseType": "error",
                "data": "Invalid date format. Please use YYYY-MM-DD"
            }

        try:
            google_api_key_value = GOOGLE_API_KEY.value
            logging.info("Successfully retrieved Google API key")
        except Exception as e:
            error_message = f"Error retrieving Google API key: {e}"
            logging.error(f"{error_message}\n{traceback.format_exc()}")
            return {
                "status": "error",
                "responseType": "error",
                "data": f"Internal server error during Google API key retrieval: {e}"
            }

        try:
            # Get readings from Gemini (without summaries)
            readings = get_daily_readings_from_gemini(date_str, google_api_key_value)
            logging.info(f"Successfully fetched {len(readings)} readings from Gemini in {time.time() - start_time:.2f} seconds")
            
            # Return readings without summaries
            return {
                "status": "success",
                "responseType": "json",
                "data": readings
            }
        except Exception as e:
            error_message = f"Error processing readings: {e}"
            logging.error(f"{error_message}\n{traceback.format_exc()}")
            return {
                "status": "error",
                "responseType": "error",
                "data": f"Failed to get readings: {e}"
            }

    except Exception as e:
        error_message = f"Unexpected error in dailyReadingsProxy: {e}"
        logging.error(f"{error_message}\n{traceback.format_exc()}")
        return {
            "status": "error",
            "responseType": "error",
            "data": str(e)
        }
