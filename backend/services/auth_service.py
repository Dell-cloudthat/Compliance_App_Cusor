"""
JWT Authentication Service
Handles user authentication, token generation, and validation
"""
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import hashlib
import os as _os
from pydantic import BaseModel
import sqlite3
from pathlib import Path

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing using PBKDF2 (no external dependencies, secure enough for most cases)
PBKDF2_ITERATIONS = 600000  # OWASP recommended minimum for SHA256

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"


# ============================================================================
# Models
# ============================================================================

class Token(BaseModel):
    """Token response model"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]


class TokenData(BaseModel):
    """Decoded token data"""
    user_id: int
    email: str
    role: str
    organization: Optional[str] = None
    exp: Optional[datetime] = None


class LoginRequest(BaseModel):
    """Login request model"""
    email: str
    password: str


class RegisterRequest(BaseModel):
    """Registration request model"""
    name: str
    email: str
    password: str
    organization: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        # Format: salt$hash
        parts = hashed_password.split('$')
        if len(parts) != 2:
            return False
        
        salt = bytes.fromhex(parts[0])
        stored_hash = parts[1]
        
        computed_hash = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt,
            PBKDF2_ITERATIONS
        ).hex()
        
        # Constant-time comparison to prevent timing attacks
        return secrets.compare_digest(computed_hash, stored_hash)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using PBKDF2"""
    salt = _os.urandom(32)
    hash_value = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        PBKDF2_ITERATIONS
    )
    return f"{salt.hex()}${hash_value.hex()}"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role")
        organization = payload.get("organization")
        
        if user_id is None or email is None:
            return None
        
        return TokenData(
            user_id=int(user_id),
            email=email,
            role=role or "viewer",
            organization=organization,
            exp=datetime.fromtimestamp(payload.get("exp", 0))
        )
    except JWTError:
        return None


# ============================================================================
# Database Functions
# ============================================================================

def ensure_auth_tables():
    """Ensure authentication tables exist"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Add password_hash column to users table if not exists
    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "password_hash" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
        conn.commit()
    
    # Create refresh tokens table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            revoked BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Create login attempts table for security
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            ip_address TEXT,
            success BOOLEAN NOT NULL,
            attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user by ID"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None


def create_user_with_password(name: str, email: str, password: str, organization: Optional[str] = None) -> Dict[str, Any]:
    """Create a new user with password"""
    conn = get_db()
    cursor = conn.cursor()
    
    password_hash = get_password_hash(password)
    
    cursor.execute("""
        INSERT INTO users (name, email, password_hash, organization, plan, role)
        VALUES (?, ?, ?, ?, 'free', 'viewer')
    """, (name, email, password_hash, organization))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "id": user_id,
        "name": name,
        "email": email,
        "organization": organization,
        "plan": "free",
        "role": "viewer"
    }


def update_user_password(user_id: int, password: str) -> bool:
    """Update user's password"""
    conn = get_db()
    cursor = conn.cursor()
    
    password_hash = get_password_hash(password)
    cursor.execute(
        "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
        (password_hash, datetime.now().isoformat(), user_id)
    )
    
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    return affected > 0


def store_refresh_token(user_id: int, token: str, expires_at: datetime) -> bool:
    """Store a refresh token hash"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Hash the token for storage
    import hashlib
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    cursor.execute("""
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
    """, (user_id, token_hash, expires_at.isoformat()))
    
    conn.commit()
    conn.close()
    return True


def validate_refresh_token(token: str) -> Optional[int]:
    """Validate a refresh token and return user_id"""
    import hashlib
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT user_id, expires_at, revoked FROM refresh_tokens
        WHERE token_hash = ?
    """, (token_hash,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
    
    if row['revoked']:
        return None
    
    if datetime.fromisoformat(row['expires_at']) < datetime.utcnow():
        return None
    
    return row['user_id']


def revoke_refresh_token(token: str) -> bool:
    """Revoke a refresh token"""
    import hashlib
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?",
        (token_hash,)
    )
    
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    return affected > 0


def revoke_all_user_tokens(user_id: int) -> int:
    """Revoke all refresh tokens for a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?",
        (user_id,)
    )
    
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    return affected


def record_login_attempt(email: str, ip_address: Optional[str], success: bool):
    """Record a login attempt"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO login_attempts (email, ip_address, success)
        VALUES (?, ?, ?)
    """, (email, ip_address, success))
    
    conn.commit()
    conn.close()


def check_login_rate_limit(email: str, ip_address: Optional[str]) -> bool:
    """Check if login is rate limited (5 failed attempts in 15 minutes)"""
    conn = get_db()
    cursor = conn.cursor()
    
    fifteen_minutes_ago = (datetime.now() - timedelta(minutes=15)).isoformat()
    
    cursor.execute("""
        SELECT COUNT(*) as count FROM login_attempts
        WHERE (email = ? OR ip_address = ?)
        AND success = 0
        AND attempted_at > ?
    """, (email, ip_address, fifteen_minutes_ago))
    
    row = cursor.fetchone()
    conn.close()
    
    return row['count'] < 5


# ============================================================================
# Authentication Functions
# ============================================================================

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate a user with email and password"""
    user = get_user_by_email(email)
    
    if not user:
        return None
    
    # If user has no password_hash (legacy user), return None
    if not user.get('password_hash'):
        return None
    
    if not verify_password(password, user['password_hash']):
        return None
    
    return user


def login(email: str, password: str, ip_address: Optional[str] = None) -> Optional[Token]:
    """Login and return tokens"""
    # Check rate limit
    if not check_login_rate_limit(email, ip_address):
        return None
    
    # Authenticate
    user = authenticate_user(email, password)
    
    if not user:
        record_login_attempt(email, ip_address, False)
        return None
    
    # Record successful login
    record_login_attempt(email, ip_address, True)
    
    # Create tokens
    token_data = {
        "sub": str(user['id']),
        "email": user['email'],
        "role": user.get('role', 'viewer'),
        "organization": user.get('organization')
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Store refresh token
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    store_refresh_token(user['id'], refresh_token, expires_at)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "role": user.get('role', 'viewer'),
            "organization": user.get('organization')
        }
    )


def refresh_access_token(refresh_token: str) -> Optional[Token]:
    """Refresh access token using refresh token"""
    user_id = validate_refresh_token(refresh_token)
    
    if not user_id:
        return None
    
    user = get_user_by_id(user_id)
    
    if not user:
        return None
    
    # Create new access token
    token_data = {
        "sub": str(user['id']),
        "email": user['email'],
        "role": user.get('role', 'viewer'),
        "organization": user.get('organization')
    }
    
    access_token = create_access_token(token_data)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,  # Keep same refresh token
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "role": user.get('role', 'viewer'),
            "organization": user.get('organization')
        }
    )


def logout(refresh_token: str) -> bool:
    """Logout by revoking refresh token"""
    return revoke_refresh_token(refresh_token)


def register(name: str, email: str, password: str, organization: Optional[str] = None) -> Optional[Token]:
    """Register a new user and return tokens"""
    # Check if user exists
    existing = get_user_by_email(email)
    if existing:
        return None
    
    # Create user
    user = create_user_with_password(name, email, password, organization)
    
    # Create tokens
    token_data = {
        "sub": str(user['id']),
        "email": user['email'],
        "role": user.get('role', 'viewer'),
        "organization": user.get('organization')
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Store refresh token
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    store_refresh_token(user['id'], refresh_token, expires_at)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "role": user.get('role', 'viewer'),
            "organization": user.get('organization')
        }
    )


# Initialize tables on module load
try:
    ensure_auth_tables()
except Exception as e:
    print(f"Warning: Could not initialize auth tables: {e}")
