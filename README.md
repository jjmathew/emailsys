# Email Assistant

An intelligent Gmail email assistant with a Trello-board style UI. Uses Claude AI to automatically categorize emails, generate action suggestions, and draft replies.

## Features

- **Trello-board layout**: Visual columns for Inbox, Follow Up Today, Follow Up Tomorrow, Follow Up Later, FYI, Waiting for Follow-up
- **AI-powered categorization**: Claude automatically analyzes each email and places it in the appropriate column
- **Smart suggestions**: AI-generated action recommendations for each email (e.g., "Reply confirming attendance by Wednesday")
- **Priority scoring**: High / Medium / Low priority labels
- **AI reply drafting**: Describe what you want to say; Claude drafts the email
- **Gmail OAuth**: Secure Google authentication — no password storage
- **Compose & Send**: Full email composition within the app
- **Real-time filtering**: Search/filter across all columns

## Architecture

```
emailsys/
├── backend/          # Node.js + Express
│   └── src/
│       ├── routes/   # auth, emails, ai
│       ├── services/ # gmail.ts, ai.ts (Claude)
│       └── middleware/
└── frontend/         # React + TypeScript + Vite
    └── src/
        ├── components/
        ├── pages/
        ├── hooks/
        └── utils/
```

## Setup

### 1. Google Cloud Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project and enable the **Gmail API**
3. Create OAuth 2.0 credentials (Web Application)
4. Add `http://localhost:3001/api/auth/callback` as an authorized redirect URI

### 2. Anthropic API Key

Get your API key from [console.anthropic.com](https://console.anthropic.com)

### 3. Environment Variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
SESSION_SECRET=a_long_random_secret_string
```

### 4. Install & Run

```bash
# Install all dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Run both frontend and backend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Usage

1. Open http://localhost:5173
2. Click **Continue with Google** to authenticate
3. Your emails will load and be automatically categorized by Claude AI
4. Click any email card to view details, generate AI replies, or move between columns
5. Drag the three-dot menu on any card to manually move it between columns
