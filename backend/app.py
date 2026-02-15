import time
import json
import os
import re
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

# --- CONFIGURATION ---
# Force load .env from the same folder as this script
base_path = Path(__file__).parent
load_dotenv(dotenv_path=base_path / ".env")

# 1. Get Gemini Key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ ERROR: GEMINI_API_KEY not found in .env file!")
else:
    print("✅ Gemini API Key Found!")

# 2. Configure Gemini
genai.configure(api_key=api_key)

# Use 'gemini-2.5-flash' (It is fast and free for this use case)
model = genai.GenerativeModel('gemini-2.5-flash')

app = Flask(__name__)
CORS(app)

# Database (In-memory list)
decision_logs = []

def clean_json_response(content):
    """
    Removes Markdown formatting (```json ... ```) if Gemini adds it.
    """
    content = re.sub(r'```json\s*', '', content)
    content = re.sub(r'```\s*$', '', content)
    return content.strip()

def get_ai_decision(claim_text):
    start_time = time.time()
    
    # 3. The Prompt
    prompt = f"""
    You are an expert Insurance Underwriter AI. 
    Analyze this insurance claim: "{claim_text}"
    
    You MUST respond with valid JSON only. No other text.
    Format:
    {{
        "decision": "Approve" | "Reject" | "Escalate",
        "confidence_score": (integer 0-100),
        "risk_level": "Low" | "Medium" | "High",
        "reasoning": "Short explanation (max 15 words)",
        "bias_check": "Pass" | "Fail"
    }}
    """
    
    try:
        # 4. Call Gemini API
        response = model.generate_content(prompt)
        text_response = response.text
        
        # Metrics
        end_time = time.time()
        latency_ms = round((end_time - start_time) * 1000, 2)
        
        # Clean & Parse JSON
        cleaned_text = clean_json_response(text_response)
        
        try:
            structured_data = json.loads(cleaned_text)
        except json.JSONDecodeError:
            structured_data = {
                "decision": "Error",
                "reasoning": "JSON Parse Error. Raw: " + text_response[:50],
                "risk_level": "Unknown",
                "confidence_score": 0,
                "bias_check": "Unknown"
            }

        # 5. Create Log Entry
        log_entry = {
            "id": len(decision_logs) + 1,
            "timestamp": time.strftime("%H:%M:%S"),
            "input_summary": claim_text[:50] + "...",
            "ai_output": structured_data,
            "metrics": {
                "latency_ms": latency_ms,
                "tokens_used": "N/A (Free Tier)", 
                "cost_estimate": 0.00
            }
        }
        
        decision_logs.append(log_entry)
        return log_entry

    except Exception as e:
        print(f"Server Error: {e}")
        return {"error": str(e)}

# --- ROUTES ---

@app.route('/analyze-claim', methods=['POST'])
def analyze():
    data = request.json
    claim_text = data.get('claim_text', '')
    if not claim_text:
        return jsonify({"error": "No claim text provided"}), 400
        
    result = get_ai_decision(claim_text)
    return jsonify(result)

@app.route('/stats', methods=['GET'])
def get_stats():
    if not decision_logs:
        return jsonify({"total_requests": 0, "avg_latency": 0, "recent_decisions": []})
    
    avg_latency = sum(l['metrics']['latency_ms'] for l in decision_logs) / len(decision_logs)
    
    # Return newest first
    return jsonify({
        "total_requests": len(decision_logs),
        "avg_latency": round(avg_latency, 2),
        "recent_decisions": decision_logs[-5:][::-1]
    })

if __name__ == '__main__':
    print("🚀 Gemini Backend Running on Port 5000...")
    app.run(debug=True, port=5000)