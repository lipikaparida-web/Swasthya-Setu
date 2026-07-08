import requests
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

def extract_json(text: str) -> dict:
    """
    Robustly extract a JSON object from model output.

    sarvam-105b is a reasoning model: it emits chain-of-thought prose
    BEFORE the final JSON answer.  We therefore:
      1. Prefer any ```json ... ``` code fence.
      2. Otherwise, collect ALL top-level '{...}' candidates and try each
         from LAST to FIRST — the answer is always the last one.
      3. Fall back to truncation-repair if nothing parses cleanly.
    """
    # 1. Markdown code fence takes highest priority
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            chunk = part.lstrip()
            if chunk.startswith("json"):
                chunk = chunk[4:].strip()
            if chunk.startswith("{"):
                try:
                    return json.loads(chunk)
                except json.JSONDecodeError:
                    pass

    # 2. Find every top-level '{...}' block by tracking brace depth
    candidates = []
    depth = 0
    start_idx = None
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start_idx = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start_idx is not None:
                candidates.append(text[start_idx: i + 1])
                start_idx = None

    # Try candidates from LAST to FIRST (reasoning model puts answer last)
    for candidate in reversed(candidates):
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    # 3. Truncation recovery: take text from last '{' onward and repair
    last_open = text.rfind("{")
    if last_open == -1:
        raise ValueError(f"No JSON object found in model response: {text[:300]}")

    fragment = text[last_open:].strip()
    # Remove trailing partial key/value and dangling commas
    fragment = re.sub(r',\s*"[^"]*$', '', fragment)   # truncated key
    fragment = re.sub(r':\s*"[^"]*$', '', fragment)    # truncated string value
    fragment = re.sub(r':\s*[\w.]*$', '', fragment)    # truncated numeric/bool value
    fragment = re.sub(r',\s*$', '', fragment.rstrip()) # trailing comma
    # Close any still-open brackets/braces
    fragment += "]" * max(fragment.count("[") - fragment.count("]"), 0)
    fragment += "}" * max(fragment.count("{") - fragment.count("}"), 0)
    return json.loads(fragment)

def call_sarvam(prompt: str, max_tokens: int = 500) -> str:
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "model": "sarvam-105b",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.1
    }
    response = requests.post(
        "https://api.sarvam.ai/v1/chat/completions",
        headers=headers,
        json=payload
    )
    print(f"Sarvam status: {response.status_code}")
    response.raise_for_status()
    
    resp_json = response.json()
    message = resp_json["choices"][0]["message"]
    
    # Handle both content and reasoning_content
    text = message.get("content") or message.get("reasoning_content") or ""
    return text.strip()

def parse_health_report(raw_text: str) -> dict:
    prompt = (
        "Extract health center data from this report and return ONLY a JSON object. "
        "No explanation, no markdown, just the JSON.\n\n"
        f"Report: {raw_text}\n\n"
        "Return this exact JSON structure:\n"
        '{"doctor_present": true, "beds_total": 10, "beds_occupied": 5, '
        '"patient_count": 32, "stock_items": [{"item_name": "Paracetamol", '
        '"quantity": 200, "unit": "tablets"}], "notes": ""}'
    )
    text = call_sarvam(prompt, max_tokens=1000)
    print(f"Raw response ({len(text)} chars): {text[:500]}")
    return extract_json(text)

def generate_district_brief(district_data: dict) -> str:
    prompt = (
        "You are an AI health advisor for Indian district administrators. "
        "Write a 3-5 sentence brief in English about this district health data. "
        "Mention at-risk centers, low medicines, and recommendations.\n\n"
        f"Data: {json.dumps(district_data)}"
    )
    return call_sarvam(prompt, max_tokens=300)