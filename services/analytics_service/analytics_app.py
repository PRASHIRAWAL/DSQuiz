import uuid
from typing import List, Dict, Any
from fastapi import FastAPI, Depends
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, String, JSON, func, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from fastapi.middleware.cors import CORSMiddleware

# --- 1. FastAPI Application & Middleware ---
app = FastAPI(
    title="Lightweight Analytics Service",
    description="A simple, single-file analytics service."
)

origins = [
    "http://localhost:5173",  # The address of your React frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. Database Setup ---
DATABASE_URL = "sqlite:///./analytics.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# --- 3. Database Model & Schemas ---
class Event(Base):
    __tablename__ = "events"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String, index=True)
    payload = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EventSchema(BaseModel):
    event_type: str = Field(..., description="e.g., 'quiz_completed'")
    payload: Dict[str, Any]


class EventResponseSchema(EventSchema):
    id: uuid.UUID
    created_at: Any

    class Config:
        from_attributes = True


# --- 4. Database Session & Startup ---
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- 5. API Endpoints ---
@app.post("/events", response_model=EventResponseSchema, status_code=201)
def record_event(event_data: EventSchema, db: Session = Depends(get_db)):
    db_event = Event(
        event_type=event_data.event_type,
        payload=event_data.payload
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


@app.get("/events", response_model=List[EventResponseSchema])
def get_all_events(db: Session = Depends(get_db), limit: int = 100):
    return db.query(Event).order_by(Event.created_at.desc()).limit(limit).all()


@app.get("/")
def root():
    return {"message": "Analytics service is running. Post events to /events"}