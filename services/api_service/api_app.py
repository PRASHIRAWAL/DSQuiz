import httpx
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware # <--- IMPORT THIS
from pydantic import BaseModel
from typing import List, Dict, Any, Annotated
from sqlalchemy import create_engine, Column, String, JSON, ForeignKey, Integer
from sqlalchemy.orm import sessionmaker, Session, declarative_base, relationship

from jose import JWTError, jwt
from argon2 import PasswordHasher

# --- 1. Security & Auth Setup ---
SECRET_KEY = "your-super-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

# --- 2. Configuration & Database Setup ---
ANALYTICS_SERVICE_URL = "http://127.0.0.1:8000/events"
DATABASE_URL = "sqlite:///./api.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 3. Database Models (Tables) ---
class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, index=True)
    description = Column(String)
    time_limit_seconds = Column(Integer, default=600) # <--- ADD THIS LINE (default 10 mins)
    questions = relationship("Question", back_populates="quiz")

class Question(Base):
    __tablename__ = "questions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_text = Column(String, nullable=False)
    options = Column(JSON)
    correct_answer = Column(String)
    quiz_id = Column(String, ForeignKey("quizzes.id"))
    quiz = relationship("Quiz", back_populates="questions")

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user") 

# --- 4. Pydantic Schemas ---
class QuestionBase(BaseModel):
    question_text: str
    options: Dict[str, str]
    correct_answer: str

class QuestionCreate(QuestionBase):
    pass

class QuestionSchema(QuestionBase):
    id: str
    class Config: from_attributes = True

class QuizBase(BaseModel):
    title: str
    description: str | None = None
    time_limit_seconds: int | None = 600 # <--- ADD THIS LINE

class QuizCreate(QuizBase):
    questions: List[QuestionCreate]

class QuizSchema(QuizBase):
    id: str
    questions: List[QuestionSchema] = []
    class Config: from_attributes = True

class SubmissionSchema(BaseModel):
    userId: str
    answers: Dict[str, str]
    score: float #

class UserSchema(BaseModel):
    username: str
    class Config: from_attributes = True

class UserCreate(UserSchema):
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

# --- 5. Auth Helper Functions ---
ph = PasswordHasher()

def verify_password(plain_password, hashed_password):
    try:
        return ph.verify(hashed_password, plain_password)
    except Exception:
        return False

def get_password_hash(password):
    return ph.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- 6. CRUD Functions ---
def get_quiz(db: Session, quiz_id: str):
    return db.query(Quiz).filter(Quiz.id == quiz_id).first()

def get_quizzes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Quiz).offset(skip).limit(limit).all()

def create_quiz(db: Session, quiz: QuizCreate):
    # Step 1: Create the main Quiz entry
    db_quiz = Quiz(title=quiz.title, description=quiz.description)
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz) # Refresh to get the new quiz ID

    # Step 2: Loop through the incoming questions and add them to the database
    for question_data in quiz.questions:
        db_question = Question(
            **question_data.model_dump(), # Unpack question_text, options, etc.
            quiz_id=db_quiz.id # Link to the quiz we just created
        )
        db.add(db_question)
    
    db.commit() # Commit all the new questions at once
    db.refresh(db_quiz) # Refresh again to load the questions into the quiz object
    return db_quiz

def get_user(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- 7. FastAPI Application & Endpoints ---
app = FastAPI(title="API Service")

# vvv ADD THIS MIDDLEWARE CONFIG vvv
origins = [
    "http://localhost:5173", # The address of your React frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ^^^ ADD THIS MIDDLEWARE CONFIG ^^^

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# Dependency to get current user
async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# User and Auth Endpoints
@app.post("/users/register", response_model=UserSchema)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    if user.username.lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot register with the username 'admin'.",
        )
    
    db_user = get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return create_user(db=db, user=user)

@app.post("/users/login", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(get_db)
):
    user = get_user(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {"sub": user.username, "role": user.role}
    access_token = create_access_token(
        data=token_data, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me/profile")
async def read_user_profile(
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    try:
        # Make a network request to the analytics service
        async with httpx.AsyncClient() as client:
            response = await client.get(ANALYTICS_SERVICE_URL)
            response.raise_for_status()
            all_events = response.json()

        # Filter events for the current user
        user_events = [
            event for event in all_events 
            if event["event_type"] == "quiz_completed" and event["payload"]["userId"] == current_user.username
        ]

        if not user_events:
            return {
                "username": current_user.username,
                "quizzes_taken": 0,
                "average_score": 0,
                "achievements": []
            }

        # Calculate stats
        quizzes_taken = len(user_events)
        total_score = sum(event["payload"]["score"] for event in user_events)
        average_score = total_score / quizzes_taken

        # Placeholder for achievements logic
        achievements = ["First Quiz!"] if quizzes_taken > 0 else []

        return {
            "username": current_user.username,
            "quizzes_taken": quizzes_taken,
            "average_score": average_score,
            "achievements": achievements
        }

    except httpx.RequestError as e:
        print(f"Could not connect to analytics service: {e}")
        raise HTTPException(status_code=503, detail="Analytics service is unavailable.")
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred while fetching profile data.")

# Quiz Endpoints
@app.post("/quizzes", response_model=QuizSchema, status_code=201)
def create_new_quiz(
    quiz: QuizCreate,
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    print(f"Quiz created by: {current_user.username}")
    return create_quiz(db=db, quiz=quiz)

@app.get("/quizzes", response_model=List[QuizSchema])
def read_quizzes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_quizzes(db, skip=skip, limit=limit)

@app.get("/quizzes/{quiz_id}", response_model=QuizSchema)
def read_quiz(quiz_id: str, db: Session = Depends(get_db)):
    db_quiz = get_quiz(db, quiz_id=quiz_id)
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return db_quiz

@app.post("/quizzes/{quiz_id}/submit")
async def submit_quiz(quiz_id: str, submission: SubmissionSchema, db: Session = Depends(get_db)):
    # The scoring logic is now on the frontend. We just trust the score sent.
    # In a real-world app, you might want to re-validate the score here for security.

    event_data = {
        "event_type": "quiz_completed",
        "payload": {
            "quizId": str(quiz_id),
            "userId": submission.userId,
            "score": submission.score, # <--- USE THE SCORE FROM THE SUBMISSION
            "answers": submission.answers
        }
    }
    try:
        async with httpx.AsyncClient() as client:
            await client.post(ANALYTICS_SERVICE_URL, json=event_data)
    except httpx.RequestError as e:
        print(f"Could not send event to analytics service: {e}")

    return {
        "message": "Submission received successfully!",
        "quiz_id": quiz_id,
        "score": submission.score
    }

@app.post("/create-admin-user-once")
def create_admin_user(db: Session = Depends(get_db)):
    admin_username = "admin"
    admin_password = "password" # Choose a strong password here

    # Check if admin already exists
    db_user = get_user(db, username=admin_username)
    if db_user:
        raise HTTPException(status_code=400, detail="Admin user already exists.")

    hashed_password = get_password_hash(admin_password)
    db_user = User(
        username=admin_username,
        hashed_password=hashed_password,
        role="admin" # Set the role to 'admin'
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": f"Admin user '{admin_username}' created successfully."}

# ... (all your other code)

# --- Quiz Endpoints ---

@app.put("/quizzes/{quiz_id}", response_model=QuizSchema)
def update_quiz(
    quiz_id: str,
    quiz_update: QuizCreate, # Reuse the create schema for updates
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    db_quiz = get_quiz(db, quiz_id=quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    # Update quiz title and description
    db_quiz.title = quiz_update.title
    db_quiz.description = quiz_update.description
    
    # Delete old questions
    for question in db_quiz.questions:
        db.delete(question)
        
    # Add new questions
    for question_data in quiz_update.questions:
        db_question = Question(**question_data.model_dump(), quiz_id=db_quiz.id)
        db.add(db_question)
        
    db.commit()
    db.refresh(db_quiz)
    return db_quiz
@app.post("/quizzes/{quiz_id}/questions", response_model=QuestionSchema)
def create_question_for_quiz(
    quiz_id: str,
    question: QuestionCreate,
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    db_quiz = get_quiz(db, quiz_id=quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    db_question = Question(**question.model_dump(), quiz_id=quiz_id)
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question