from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'expense-buddy-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    icon: str
    color: str

class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    category_id: str
    category_name: str
    description: str
    date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    amount: float
    category_id: str
    description: str
    date: datetime

class Budget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category_id: str
    category_name: str
    monthly_limit: float
    current_month: str  # YYYY-MM format
    spent_amount: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BudgetCreate(BaseModel):
    category_id: str
    monthly_limit: float

class DashboardData(BaseModel):
    total_expenses: float
    monthly_expenses: float
    categories_breakdown: List[dict]
    recent_expenses: List[Expense]
    budget_status: List[dict]

# Utility functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user: User) -> str:
    payload = {
        'user_id': user.id,
        'email': user.email,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_doc = await db.users.find_one({"id": user_id})
        if user_doc is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, dict):
                data[key] = prepare_for_mongo(value)
            elif isinstance(value, list):
                data[key] = [prepare_for_mongo(item) if isinstance(item, dict) else item for item in value]
    return data

def parse_from_mongo(item):
    """Parse datetime strings back from MongoDB"""
    if isinstance(item, dict):
        for key, value in item.items():
            if isinstance(value, str) and key in ['created_at', 'date']:
                try:
                    item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    pass
            elif isinstance(value, dict):
                item[key] = parse_from_mongo(value)
            elif isinstance(value, list):
                item[key] = [parse_from_mongo(i) if isinstance(i, dict) else i for i in value]
    return item

# Initialize default categories
async def initialize_categories():
    existing_categories = await db.categories.count_documents({})
    if existing_categories == 0:
        default_categories = [
            {"id": str(uuid.uuid4()), "name": "Food & Dining", "icon": "🍽️", "color": "#FF6B6B"},
            {"id": str(uuid.uuid4()), "name": "Transportation", "icon": "🚗", "color": "#4ECDC4"},
            {"id": str(uuid.uuid4()), "name": "Utilities", "icon": "⚡", "color": "#45B7D1"},
            {"id": str(uuid.uuid4()), "name": "Entertainment", "icon": "🎬", "color": "#FFA07A"},
            {"id": str(uuid.uuid4()), "name": "Healthcare", "icon": "🏥", "color": "#98D8C8"},
            {"id": str(uuid.uuid4()), "name": "Shopping", "icon": "🛍️", "color": "#F7DC6F"},
            {"id": str(uuid.uuid4()), "name": "Education", "icon": "📚", "color": "#BB8FCE"},
            {"id": str(uuid.uuid4()), "name": "Travel", "icon": "✈️", "color": "#85C1E9"},
            {"id": str(uuid.uuid4()), "name": "Other", "icon": "📝", "color": "#A5A5A5"}
        ]
        await db.categories.insert_many(default_categories)
        print("Default categories initialized")

# Authentication Routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    user = User(email=user_data.email, name=user_data.name)
    
    user_dict = prepare_for_mongo(user.dict())
    user_dict["password_hash"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Generate JWT token
    token = create_jwt_token(user)
    
    return TokenResponse(access_token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(login_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = User(**parse_from_mongo(user_doc))
    token = create_jwt_token(user)
    
    return TokenResponse(access_token=token, user=user)

# Category Routes
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().to_list(length=None)
    return [Category(**category) for category in categories]

# Expense Routes
@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, current_user: User = Depends(get_current_user)):
    # Get category info
    category = await db.categories.find_one({"id": expense_data.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    expense = Expense(
        user_id=current_user.id,
        amount=expense_data.amount,
        category_id=expense_data.category_id,
        category_name=category["name"],
        description=expense_data.description,
        date=expense_data.date
    )
    
    expense_dict = prepare_for_mongo(expense.dict())
    await db.expenses.insert_one(expense_dict)
    
    return expense

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(
    current_user: User = Depends(get_current_user),
    category_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {"user_id": current_user.id}
    
    if category_id:
        query["category_id"] = category_id
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        query["date"] = date_query
    
    expenses = await db.expenses.find(query).sort("date", -1).to_list(length=None)
    return [Expense(**parse_from_mongo(expense)) for expense in expenses]

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(
    expense_id: str,
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user)
):
    # Check if expense exists and belongs to user
    existing_expense = await db.expenses.find_one({"id": expense_id, "user_id": current_user.id})
    if not existing_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Get category info
    category = await db.categories.find_one({"id": expense_data.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = prepare_for_mongo({
        "amount": expense_data.amount,
        "category_id": expense_data.category_id,
        "category_name": category["name"],
        "description": expense_data.description,
        "date": expense_data.date.isoformat()
    })
    
    await db.expenses.update_one({"id": expense_id}, {"$set": update_data})
    
    updated_expense = await db.expenses.find_one({"id": expense_id})
    return Expense(**parse_from_mongo(updated_expense))

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: User = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

# Budget Routes
@api_router.post("/budgets", response_model=Budget)
async def create_budget(budget_data: BudgetCreate, current_user: User = Depends(get_current_user)):
    # Get category info
    category = await db.categories.find_one({"id": budget_data.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Check if budget already exists for this category and month
    existing_budget = await db.budgets.find_one({
        "user_id": current_user.id,
        "category_id": budget_data.category_id,
        "current_month": current_month
    })
    
    if existing_budget:
        raise HTTPException(status_code=400, detail="Budget already exists for this category this month")
    
    budget = Budget(
        user_id=current_user.id,
        category_id=budget_data.category_id,
        category_name=category["name"],
        monthly_limit=budget_data.monthly_limit,
        current_month=current_month
    )
    
    budget_dict = prepare_for_mongo(budget.dict())
    await db.budgets.insert_one(budget_dict)
    
    return budget

@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(current_user: User = Depends(get_current_user)):
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    budgets = await db.budgets.find({
        "user_id": current_user.id,
        "current_month": current_month
    }).to_list(length=None)
    
    # Calculate spent amounts
    for budget in budgets:
        spent = await db.expenses.aggregate([
            {
                "$match": {
                    "user_id": current_user.id,
                    "category_id": budget["category_id"],
                    "date": {
                        "$gte": f"{current_month}-01T00:00:00.000Z",
                        "$lt": f"{current_month}-31T23:59:59.999Z"
                    }
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        budget["spent_amount"] = spent[0]["total"] if spent else 0.0
    
    return [Budget(**parse_from_mongo(budget)) for budget in budgets]

# Dashboard Route
@api_router.get("/dashboard", response_model=DashboardData)
async def get_dashboard(current_user: User = Depends(get_current_user)):
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Total expenses
    total_pipeline = [
        {"$match": {"user_id": current_user.id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    total_result = await db.expenses.aggregate(total_pipeline).to_list(1)
    total_expenses = total_result[0]["total"] if total_result else 0.0
    
    # Monthly expenses
    monthly_pipeline = [
        {
            "$match": {
                "user_id": current_user.id,
                "date": {
                    "$gte": f"{current_month}-01T00:00:00.000Z",
                    "$lt": f"{current_month}-31T23:59:59.999Z"
                }
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    monthly_result = await db.expenses.aggregate(monthly_pipeline).to_list(1)
    monthly_expenses = monthly_result[0]["total"] if monthly_result else 0.0
    
    # Categories breakdown
    categories_pipeline = [
        {
            "$match": {
                "user_id": current_user.id,
                "date": {
                    "$gte": f"{current_month}-01T00:00:00.000Z",
                    "$lt": f"{current_month}-31T23:59:59.999Z"
                }
            }
        },
        {"$group": {"_id": "$category_name", "amount": {"$sum": "$amount"}}},
        {"$sort": {"amount": -1}}
    ]
    categories_result = await db.expenses.aggregate(categories_pipeline).to_list(10)
    categories_breakdown = [{"name": cat["_id"], "amount": cat["amount"]} for cat in categories_result]
    
    # Recent expenses
    recent_expenses = await db.expenses.find({"user_id": current_user.id}).sort("date", -1).limit(5).to_list(5)
    recent_expenses_list = [Expense(**parse_from_mongo(expense)) for expense in recent_expenses]
    
    # Budget status
    budgets = await db.budgets.find({
        "user_id": current_user.id,
        "current_month": current_month
    }).to_list(length=None)
    
    budget_status = []
    for budget in budgets:
        spent = await db.expenses.aggregate([
            {
                "$match": {
                    "user_id": current_user.id,
                    "category_id": budget["category_id"],
                    "date": {
                        "$gte": f"{current_month}-01T00:00:00.000Z",
                        "$lt": f"{current_month}-31T23:59:59.999Z"
                    }
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        spent_amount = spent[0]["total"] if spent else 0.0
        budget_status.append({
            "category_name": budget["category_name"],
            "monthly_limit": budget["monthly_limit"],
            "spent_amount": spent_amount,
            "percentage": (spent_amount / budget["monthly_limit"]) * 100 if budget["monthly_limit"] > 0 else 0
        })
    
    return DashboardData(
        total_expenses=total_expenses,
        monthly_expenses=monthly_expenses,
        categories_breakdown=categories_breakdown,
        recent_expenses=recent_expenses_list,
        budget_status=budget_status
    )

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "message": "ExpenseBuddy API is running"}

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await initialize_categories()
    logger.info("ExpenseBuddy API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()