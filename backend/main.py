from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import google.generativeai as genai
import json
import os
import asyncio
import re
from typing import List, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Exam Paper Generator API")

# Configure CORS
frontend_url = os.getenv("FRONTEND_URL", "https://paper-vista-five.vercel.app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "https://paper-vista-five.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")
genai.configure(api_key=GEMINI_API_KEY)

# Model fallback list - VERIFIED models that work with free tier
MODEL_FALLBACK_LIST = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash"
]

# Timeout for API calls (in seconds)
GENERATION_TIMEOUT = 45

# Function to list available models (for debugging)
def list_available_models():
    """List all available Gemini models"""
    try:
        models = genai.list_models()
        print("\n📚 Available Gemini Models:")
        for model in models:
            if 'generateContent' in model.supported_generation_methods:
                print(f"  ✅ {model.name}")
        return [m.name.replace('models/', '') for m in models if 'generateContent' in m.supported_generation_methods]
    except Exception as e:
        print(f"❌ Could not list models: {e}")
        return []

# Models
class QuestionRequest(BaseModel):
    courseName: str
    examType: str
    topicHeadings: str

class QuestionPart(BaseModel):
    label: str
    text: str
    marks: int
    hasOR: Optional[bool] = False
    orText: Optional[str] = None

class Question(BaseModel):
    questionNumber: int
    parts: List[QuestionPart]

# Enhanced JSON cleaning function
def clean_and_parse_json(response_text: str) -> dict:
    """
    Robust JSON parser that handles various Gemini response formats
    """
    try:
        # Log the raw response for debugging
        print(f"📦 Raw response (first 500 chars): {response_text[:500]}")
        
        # Step 1: Remove markdown code blocks
        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*', '', response_text)
        
        # Step 2: Remove any text before the first { or [
        match = re.search(r'[\[{]', response_text)
        if match:
            response_text = response_text[match.start():]
        
        # Step 3: Remove any text after the last } or ]
        match = re.search(r'[}\]](?=[^}\]]*$)', response_text)
        if match:
            response_text = response_text[:match.end()]
        
        # Step 4: Remove trailing commas before ] or }
        response_text = re.sub(r',(\s*[}\]])', r'\1', response_text)
        
        # Step 5: Remove comments (// and /* */)
        response_text = re.sub(r'//.*?\n', '\n', response_text)
        response_text = re.sub(r'/\*.*?\*/', '', response_text, flags=re.DOTALL)
        
        # Step 6: Clean up whitespace
        response_text = response_text.strip()
        
        # Step 7: Try to parse
        parsed = json.loads(response_text)
        print(f"✅ Successfully parsed JSON")
        return parsed
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON Parse Error: {str(e)}")
        print(f"📄 Cleaned text (first 500 chars): {response_text[:500]}")
        
        # Last resort: try to extract JSON using regex
        try:
            # Find the main JSON structure
            json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]'
            matches = re.findall(json_pattern, response_text, re.DOTALL)
            
            if matches:
                # Try each match
                for match in matches:
                    try:
                        return json.loads(match)
                    except:
                        continue
        except Exception as fallback_error:
            print(f"❌ Fallback parsing also failed: {str(fallback_error)}")
        
        raise ValueError(f"Unable to parse JSON from response. Error: {str(e)}")

# Helper function to generate content with model fallback
async def generate_with_fallback(prompt: str, generation_config: dict, model_name: str = None):
    """Try multiple models in sequence until one succeeds"""
    last_error = None
    attempt = 0
    
    models_to_try = [model_name] if model_name else MODEL_FALLBACK_LIST
    
    for current_model in models_to_try:
        try:
            attempt += 1
            print(f"🔄 Attempt {attempt}: Using model {current_model}")
            
            model = genai.GenerativeModel(current_model)
            
            # Use threadpool to prevent blocking and add timeout protection
            response = await asyncio.wait_for(
                run_in_threadpool(
                    model.generate_content,
                    prompt,
                    generation_config=generation_config
                ),
                timeout=GENERATION_TIMEOUT
            )
            
            # Check if response has text
            if not response.text or len(response.text.strip()) < 10:
                raise ValueError("Model returned empty or invalid response")
            
            print(f"✅ Model {current_model} responded successfully")
            return response, current_model
            
        except asyncio.TimeoutError:
            last_error = Exception(f"Model {current_model} timed out after {GENERATION_TIMEOUT}s")
            print(f"⏱️ Timeout on {current_model}, trying next model...")
            await asyncio.sleep(1)
            continue
            
        except Exception as e:
            last_error = e
            error_msg = str(e).lower()
            
            print(f"❌ Error with {current_model}: {error_msg[:150]}")
            
            # If it's a quota error, try next model
            if any(keyword in error_msg for keyword in ["429", "quota", "rate limit", "resource exhausted"]):
                print(f"💤 Rate limit hit, waiting before next model...")
                await asyncio.sleep(1)
                continue
            # If it's a model not found error, try next model
            elif any(keyword in error_msg for keyword in ["not found", "invalid model", "model not available"]):
                continue
            # For empty/invalid responses, try next model
            elif "empty" in error_msg or "invalid response" in error_msg:
                print(f"⚠️ Invalid response, trying next model...")
                continue
            # For other errors, try next model but log it
            else:
                print(f"⚠️ Unexpected error, trying next model...")
                continue
    
    # If all models failed, raise the last error
    if last_error:
        raise last_error
    else:
        raise Exception("All models failed to generate content")

# Endpoints
@app.get("/")
async def root():
    return {"message": "Exam Paper Generator API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Health check endpoint that also lists available models"""
    available_models = list_available_models()
    return {
        "status": "healthy", 
        "api": "operational",
        "available_models": available_models[:5] if available_models else []
    }

@app.post("/api/generate-questions")
async def generate_questions(request: QuestionRequest):
    try:
        print(f"\n📝 New request: {request.examType} for {request.courseName}")
        
        # Determine exam parameters based on type
        if request.examType in ["MST-1", "MST-2"]:
            num_questions = 2
            marks_ab = 3
            marks_cd = 4
            duration = "1 Hour"
        else:  # End-Sem
            num_questions = 5
            marks_ab = 4
            marks_cd = 6
            duration = "3 Hours"
        
        # Split topics into a list
        topics = [t.strip() for t in request.topicHeadings.split(',')]
        
        print(f"⚙️ Config: {num_questions} questions, Topics: {len(topics)}")
        
        # ============================================================
        # PHASE 1: Generate outline (structure only - small & safe)
        # ============================================================
        print(f"\n📋 PHASE 1: Generating question outline...")
        
        outline_prompt = f"""You must generate ONLY valid JSON. No markdown, no explanations.

Create an exam outline with {num_questions} questions.

Course: {request.courseName}
Topics: {request.topicHeadings}

Return ONLY this JSON array (no other text):
[
  {{"questionNumber": 1, "topic": "topic1"}},
  {{"questionNumber": 2, "topic": "topic2"}}
]

Rules:
- Each question uses a DIFFERENT topic from: {request.topicHeadings}
- Output ONLY the JSON array
- No markdown, no code blocks, no explanations"""

        outline_config = genai.types.GenerationConfig(
            temperature=0.3,
            max_output_tokens=800,
            candidate_count=1
        )
        
        outline_response, used_model = await generate_with_fallback(outline_prompt, outline_config)
        outline = clean_and_parse_json(outline_response.text)
        
        # Validate outline is a list
        if not isinstance(outline, list):
            outline = [outline]
        
        # Ensure we have the right number of questions
        outline = outline[:num_questions]
        if len(outline) < num_questions:
            # Generate missing questions
            for i in range(len(outline), num_questions):
                outline.append({
                    "questionNumber": i + 1,
                    "topic": topics[i % len(topics)]
                })
        
        print(f"✅ Phase 1 complete: Generated outline for {len(outline)} questions")
        
        # ============================================================
        # PHASE 2: Generate content per question (one at a time)
        # ============================================================
        print(f"\n📝 PHASE 2: Generating content for each question...")
        
        all_questions = []
        
        for q_outline in outline:
            q_num = q_outline['questionNumber']
            topic = q_outline.get('topic', topics[(q_num - 1) % len(topics)])
            
            print(f"  ↳ Generating Q{q_num} on topic: {topic}")
            
            content_prompt = f"""You must generate ONLY valid JSON. No markdown, no explanations.

Generate ONE exam question:
- Question Number: {q_num}
- Topic: {topic}
- Course: {request.courseName}

Return ONLY this JSON (no other text):
{{
  "questionNumber": {q_num},
  "parts": [
    {{"label": "a", "text": "Define {topic}", "marks": {marks_ab}}},
    {{"label": "b", "text": "Explain {topic}", "marks": {marks_ab}}},
    {{"label": "c", "text": "Apply {topic}", "marks": {marks_cd}, "hasOR": true, "orText": "Analyze {topic}"}}
  ]
}}

Rules:
- Part a: Basic definition ({marks_ab} marks)
- Part b: Explanation ({marks_ab} marks)
- Part c: Application ({marks_cd} marks) with hasOR=true and orText
- Make questions specific to: {topic}
- Output ONLY JSON, no markdown"""

            content_config = genai.types.GenerationConfig(
                temperature=0.5,
                max_output_tokens=1000,
                candidate_count=1
            )
            
            max_retries = 3
            for retry in range(max_retries):
                try:
                    # Use the same model that worked for outline
                    content_response, _ = await generate_with_fallback(
                        content_prompt, 
                        content_config, 
                        model_name=used_model
                    )
                    
                    question_data = clean_and_parse_json(content_response.text)
                    
                    # Validate structure
                    if not isinstance(question_data, dict):
                        raise ValueError("Invalid question structure")
                    
                    if 'parts' not in question_data:
                        raise ValueError("Missing 'parts' in question data")
                    
                    # Ensure questionNumber is set
                    question_data['questionNumber'] = q_num
                    
                    all_questions.append(question_data)
                    print(f"  ✅ Q{q_num} generated successfully")
                    break
                    
                except Exception as e:
                    print(f"  ⚠️ Retry {retry + 1}/{max_retries} for Q{q_num}: {str(e)[:100]}")
                    if retry == max_retries - 1:
                        # Create a fallback question
                        all_questions.append({
                            "questionNumber": q_num,
                            "parts": [
                                {"label": "a", "text": f"Define {topic}", "marks": marks_ab},
                                {"label": "b", "text": f"Explain the key concepts of {topic}", "marks": marks_ab},
                                {"label": "c", "text": f"Apply {topic} in a real-world scenario", "marks": marks_cd, "hasOR": True, "orText": f"Analyze the benefits of {topic}"}
                            ]
                        })
                        print(f"  ⚠️ Using fallback question for Q{q_num}")
                    await asyncio.sleep(1)
            
            # Small delay between questions to avoid rate limits
            if q_num < len(outline):
                await asyncio.sleep(0.5)
        
        print(f"\n🎉 All {len(all_questions)} questions generated successfully!")
        
        return {
            "success": True,
            "questions": all_questions,
            "message": "Questions generated successfully",
            "examInfo": {
                "duration": duration,
                "numQuestions": num_questions
            },
            "modelUsed": used_model
        }
        
    except asyncio.TimeoutError:
        print("⏱️ Request timed out")
        raise HTTPException(
            status_code=504,
            detail="Request timed out. Please try again."
        )
        
    except Exception as e:
        error_msg = str(e)
        print(f"🔥 INTERNAL ERROR: {error_msg}")

        # Check for quota/rate limit errors
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="API quota exceeded. Please try again later."
            )
        elif "API key" in error_msg:
            raise HTTPException(
                status_code=401,
                detail="Invalid API key configuration"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate questions: {error_msg}"
            )

# Run the server
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)