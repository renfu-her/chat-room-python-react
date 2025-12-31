from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

from database import engine, Base
from routers import auth, users, friends, groups, messages
from websocket.chat import router as websocket_router

load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chat Room API",
    description="Backend API for Chat Room application",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(friends.router, prefix="/api/friends", tags=["friends"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])

# Include WebSocket router
app.include_router(websocket_router)

@app.get("/")
async def root():
    return {"message": "Chat Room API", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
