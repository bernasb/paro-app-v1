import logging
import json
from datetime import datetime, timedelta
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

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

    # For all other dates, use a simplified approach with Gemini
    logging.info("Preparing prompt for Gemini API")
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
