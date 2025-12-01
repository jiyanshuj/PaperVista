from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import json
import os
from typing import List, Optional

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

# Endpoints
@app.get("/")
async def root():
    return {"message": "Exam Paper Generator API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "api": "operational"}

@app.post("/api/generate-questions")
async def generate_questions(request: QuestionRequest):
    try:
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
        
        # Build the prompt
        prompt = f"""You are an expert exam paper setter for a university-level course. Generate examination questions based on the following:

Subject: {request.courseName}
Exam Type: {request.examType}
Exam Duration: {duration}
Topic Headings: {request.topicHeadings}

Rules:
- Create {num_questions} main questions
- Each question must have exactly 4 sub-parts (a, b, c, d)
- Sub-parts a and b should be {marks_ab} marks each - these are compulsory
- Sub-parts c and d should be {marks_cd} marks each - student can attempt EITHER c OR d (internal choice)
- Sub-parts should increase in difficulty: a = definition/basic, b = explanation, c/d = application/analysis
- Ensure questions cover different topics from the provided list
- Make c and d questions more analytical and application-based

Format your response as a JSON array with this EXACT structure:
[
  {{
    "questionNumber": 1,
    "parts": [
      {{"label": "a", "text": "question text here", "marks": {marks_ab}}},
      {{"label": "b", "text": "question text here", "marks": {marks_ab}}},
      {{"label": "c", "text": "question text here", "marks": {marks_cd}, "hasOR": true, "orText": "alternative d question text here"}}
    ]
  }}
]

IMPORTANT: 
- Only include parts a, b, and c in the array
- Part c should have "hasOR": true and "orText" containing the d option
- Provide ONLY the JSON array, no other text or markdown formatting
- Ensure all questions are unique and cover different aspects of the topics"""

        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash-lite')
        
        # Generate content
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                top_k=40,
                top_p=0.95,
                max_output_tokens=3048,
            )
        )
        
        # Extract and clean the response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        # Parse JSON
        try:
            questions_data = json.loads(response_text)
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                questions_data = json.loads(json_match.group(0))
            else:
                raise ValueError("Could not parse JSON from response")
        
        return {
            "success": True,
            "questions": questions_data,
            "message": "Questions generated successfully",
            "examInfo": {
                "duration": duration,
                "numQuestions": num_questions
            }
        }
        
    except Exception as e:
        error_msg = str(e)

        # Check for quota/rate limit errors
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="API quota exceeded. Please try again later or upgrade your plan."
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
    uvicorn.run(app, host="0.0.0.0", port=8000)