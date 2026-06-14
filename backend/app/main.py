import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import upload, schedule, deadlines, summarize, chat, alerts, auth_routes
from app.services.alert_service import generate_alerts

app = FastAPI(title="Campus Flow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://main.d19691dovsr02k.amplifyapp.com","http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
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
