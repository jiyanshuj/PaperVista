# PaperVista - Backend

PaperVista Backend is a FastAPI-based service that generates exam papers using Google's Gemini AI API. It provides endpoints for creating customized exam questions based on course information and topics.

## Project Overview

The backend service handles all exam paper generation logic by leveraging the Google Generative AI (Gemini) API. It features a two-phase generation process to ensure quality and structured exam paper creation.

## Tech Stack

- **FastAPI 0.115.0** - Modern Python web framework for building APIs
- **Uvicorn 0.32.0** - ASGI web server
- **Google Generative AI 0.8.3** - Integration with Gemini API
- **Pydantic 2.9.2** - Data validation and serialization
- **Python 3.x** - Programming language

## Getting Started

### Prerequisites

- Python 3.8 or higher
- Google API Key with Generative AI access (Gemini)
- pip (Python package manager)

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory with the required environment variables:
```
GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:5173
PORT=8000
```

### Running the Server

Start the development server:

```bash
python main.py
```

The API will be available at `http://localhost:8000`

### API Documentation

Once the server is running, interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### 1. Root Endpoint
**GET** `/`

Returns a health status message.

**Response:**
```json
{
  "message": "Exam Paper Generator API is running",
  "status": "healthy"
}
```

### 2. Health Check
**GET** `/health`

Checks API health and lists available Gemini models.

**Response:**
```json
{
  "status": "healthy",
  "api": "operational",
  "available_models": ["gemini-2.5-flash", "gemini-3-flash", ...]
}
```

### 3. Generate Questions
**POST** `/api/generate-questions`

Generates exam questions based on course details and exam type.

**Request Body:**
```json
{
  "courseName": "Data Structures",
  "examType": "MST-1",
  "topicHeadings": "Arrays, Linked Lists, Stacks, Queues"
}
```

**Parameters:**
- `courseName` (string, required) - Name of the course
- `examType` (string, required) - Type of exam (MST-1, MST-2, or End-Sem)
- `topicHeadings` (string, required) - Comma-separated list of topics

**Exam Type Details:**
- **MST-1/MST-2**: 2 questions, 1 hour duration
  - Part A: 3 marks
  - Part B: 3 marks
  - Part C: 4 marks
  
- **End-Sem**: 5 questions, 3 hours duration
  - Part A: 4 marks
  - Part B: 4 marks
  - Part C: 6 marks

**Response:**
```json
{
  "success": true,
  "questions": [
    {
      "questionNumber": 1,
      "parts": [
        {
          "label": "a",
          "text": "Define Arrays",
          "marks": 3
        },
        {
          "label": "b",
          "text": "Explain array operations",
          "marks": 3
        },
        {
          "label": "c",
          "text": "Apply arrays in sorting",
          "marks": 4,
          "hasOR": true,
          "orText": "Analyze array performance"
        }
      ]
    }
  ],
  "examInfo": {
    "duration": "1 Hour",
    "numQuestions": 2
  },
  "modelUsed": "gemini-2.5-flash"
}
```

## Project Structure

```
backend/
├── main.py                  # Main application file with all endpoints and logic
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables (not committed to repo)
└── __pycache__/            # Python cache directory
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Generative AI API key | Required |
| `FRONTEND_URL` | Frontend application URL | `https://paper-vista-five.vercel.app` |
| `PORT` | Server port | 8000 |

### CORS Configuration

The API is configured to accept requests from:
- Frontend production URL
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative local development)

## Features

### AI-Powered Question Generation

The backend uses Google's Gemini AI to generate high-quality exam questions with:
- Two-phase generation process for optimal results
- Structured question format with multiple parts
- Support for OR options in questions
- Topic-specific customization

### Robust Error Handling

- Model fallback mechanism with verified models
- Timeout protection (45 seconds)
- JSON parsing with markdown cleanup
- Retry logic for failed requests
- Graceful error responses

### Performance Optimization

- Asynchronous request handling
- Rate limit protection with delays
- Efficient API token usage
- Model-specific fallback list

## Development Notes

### Two-Phase Generation Process

1. **Phase 1: Outline Generation** - Creates question structure with minimal tokens
2. **Phase 2: Content Generation** - Generates detailed question content per question

### Error Handling

The API handles various error scenarios:
- **429 Quota Exceeded** - API quota limit reached
- **401 Invalid API Key** - Missing or invalid API configuration
- **504 Timeout** - Request took too long
- **500 Server Error** - Internal processing error

### Model Fallback Strategy

If the primary model fails, the API automatically tries:
1. `gemini-2.5-flash`
2. `gemini-2.5-flash-lite`
3. `gemini-3-flash`

## Deployment

The application is ready for deployment on platforms like:
- Render.com
- Heroku
- Azure
- Google Cloud Platform
- AWS

Ensure all environment variables are properly configured before deployment.

## Troubleshooting

### Invalid API Key Error
- Verify `GEMINI_API_KEY` in `.env` is correct
- Ensure your Google API key has Generative AI access enabled

### Quota Exceeded
- Wait before making another request
- Check your API quota limits in Google Cloud Console

### CORS Errors
- Verify `FRONTEND_URL` environment variable matches your frontend URL
- Check that the frontend URL is in the `allow_origins` list

### Timeout Issues
- The request may have taken too long
- Try again with simpler topics or fewer questions
- Check your internet connection

## License

Refer to the main project license file for more information.
