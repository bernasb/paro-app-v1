import logging
import json
import google.generativeai as genai

def get_reading_summary(title, citation, google_api_key):
    try:
        genai.configure(api_key=google_api_key)
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
        try:
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_string = response_text[json_start:json_end]
                response_json = json.loads(json_string)
            else:
                response_json = {"conciseSummary": response_text}
            return {
                "status": "success",
                "responseType": "json",
                "data": {
                    "summary": response_json.get("conciseSummary", ""),
                    "detailedExplanation": response_json.get("detailedExplanation", "")
                }
            }
        except json.JSONDecodeError:
            logging.warning(f"Failed to parse JSON response, using text response instead")
            return {
                "status": "success",
                "responseType": "text",
                "data": response_text
            }
    except Exception as e:
        logging.error(f"Failed to generate summary: {e}")
        return {
            "status": "error",
            "responseType": "error",
            "data": f"Failed to generate summary: {e}"
        }
