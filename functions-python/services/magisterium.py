import logging
import json
import requests

def get_magisterium_chat_response(messages, magisterium_api_key, return_related_questions=False):
    magisterium_api_endpoint = "https://www.magisterium.com/api/v1/chat/completions"
    request_body = {
        "model": "magisterium-1",
        "messages": messages,
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
            timeout=60,
        )
        magisterium_response.raise_for_status()
        return magisterium_response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Magisterium API request failed: {e}")
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
        logging.error(f"An unexpected error occurred: {e}")
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
    magisterium_api_endpoint = "https://www.magisterium.com/api/v1/chat/completions"
    messages = [
        {
            "role": "system",
            "content": "You are a Catholic API endpoint that returns JSON. Respond ONLY with the valid JSON array requested. ABSOLUTELY NO introductory text, explanations, markdown formatting, character or word counts, or anything other than the JSON itself. Your entire response MUST start with '[' and end with ']'. Do not wrap the JSON in markdown code blocks. The JSON array should contain objects matching the LiturgicalReading interface: { title: string; citation: string; content: string; summary?: string; }. Ensure 'content' contains the full text of the reading and 'summary' is a concise 1-2 sentence overview. "
        },
        {
            "role": "user",
            "content": f"Provide a summary for the following Catholic Mass reading:\n{reading_text}.\n            For the reading, include:\n            - summary: A Brief, plain language 3-4 sentence statement of the importance of this passage to the Catholic faith. NEVER INCLUDE CHARACTER COUNTS IN YOUR JSON OUTPUT.\n\n            Format the entire response as a single, valid JSON array of objects, where each object represents one reading.\n            Ensure the JSON is valid and contains only the array."
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
            timeout=60
        )
        magisterium_response.raise_for_status()
        response = magisterium_response.json()
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
        logging.error(f"Magisterium API request failed: {e}")
        return "Summary unavailable due to connection issues. Please try again later."
    except ValueError as e:
        logging.error(f"Error during response parsing: {e}")
        return "Summary unavailable due to parsing issues. Please try again later."
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        return "Summary unavailable due to an unexpected error. Please try again later."
