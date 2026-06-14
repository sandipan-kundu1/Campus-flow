import threading
import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.routes import upload, schedule, deadlines, summarize, chat, alerts, auth_routes
from app.services.alert_service import generate_alerts

app = FastAPI(title="Campus Flow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://main.d19691dovsr02k.amplifyapp.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://13.200.19.188:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(FastAPIHTTPException)
async def http_exception_handler(request: Request, exc: FastAPIHTTPException):
    """Ensure CORS headers are present even on error responses (e.g. 401 Unauthorized).
    Without this, the browser reports a 'CORS' error instead of the real auth error."""
    origin = request.headers.get("origin", "")
    allowed_origins = [
        "https://main.d19691dovsr02k.amplifyapp.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://13.200.19.188:8000",
    ]
    headers = {"Content-Type": "application/json"}
    if origin in allowed_origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


app.include_router(upload.router)
app.include_router(schedule.router)
app.include_router(deadlines.router)
app.include_router(summarize.router)
app.include_router(chat.router)
app.include_router(alerts.router)
app.include_router(auth_routes.router)


def start_scheduler():
    def run_loop():
        # Wait a few seconds for the app to settle
        time.sleep(5)
        while True:
            try:
                generate_alerts("default_student")
            except Exception as e:
                print(f"Error in scheduler: {e}")
            time.sleep(60)

    thread = threading.Thread(target=run_loop, daemon=True)
    thread.start()


@app.on_event("startup")
def on_startup():
    start_scheduler()


@app.get("/health")
def health():
    return {"status": "ok", "service": "Campus Flow API"}
