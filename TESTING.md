# Testing

## Backend
1) Install dependencies:
   - cd backend
   - npm install
2) Provide real service credentials in backend/.env:
   - MONGO_URL
   - GEMINI_API_KEY
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - DEEPGRAM_API_KEY
3) Run tests:
   - npm test

Notes:
- Tests use the real database and create data with the prefix jest_test_<RUN_ID>_.
- Data created by tests is cleaned up after each run.
- Socket tests start the server on a random port.
- Transcription tests are skipped if DEEPGRAM_API_KEY is missing.
- Summary and search tests call Gemini and can take longer.

## Frontend
1) Install dependencies:
   - cd frontend
   - npm install
2) Run tests:
   - npm test

Notes:
- Frontend unit tests mock browser media APIs. Real WebRTC media sessions require an end-to-end runner.
