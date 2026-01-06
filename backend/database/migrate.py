#!/usr/bin/env python3
"""
Database Migration Runner
Manages schema versioning and applies migrations in order
"""
import sqlite3
import os
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent / "compliance.db"
MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def get_db_connection():
    """Get database connection with row factory"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def ensure_migrations_table(conn):
    """Ensure schema_migrations table exists"""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()


def get_applied_migrations(conn):
    """Get list of applied migration versions"""
    cursor = conn.execute("SELECT version FROM schema_migrations ORDER BY version")
    return {row['version'] for row in cursor.fetchall()}


def get_pending_migrations():
    """Get list of migration files that haven't been applied"""
    if not MIGRATIONS_DIR.exists():
        return []
    
    migrations = []
    for file in sorted(MIGRATIONS_DIR.glob("*.sql")):
        # Parse version from filename (e.g., 001_initial_schema.sql -> 1)
        try:
            version = int(file.stem.split('_')[0])
            migrations.append((version, file.stem, file))
        except (ValueError, IndexError):
            print(f"Warning: Skipping invalid migration filename: {file.name}")
    
    return migrations


def apply_migration(conn, version, name, filepath):
    """Apply a single migration file"""
    print(f"Applying migration {version}: {name}...")
    
    with open(filepath, 'r') as f:
        sql = f.read()
    
    # Split by semicolons and execute each statement
    # (sqlite3 executescript doesn't work well with some statements)
    statements = sql.split(';')
    
    for statement in statements:
        statement = statement.strip()
        if statement and not statement.startswith('--'):
            try:
                conn.execute(statement)
            except sqlite3.Error as e:
                # Ignore "table already exists" errors for IF NOT EXISTS
                if "already exists" not in str(e).lower():
                    print(f"  Warning: {e}")
    
    # Record migration as applied
    conn.execute(
        "INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
        (version, name, datetime.now().isoformat())
    )
    conn.commit()
    print(f"  ✓ Migration {version} applied successfully")


def migrate():
    """Run all pending migrations"""
    print("=" * 60)
    print("Database Migration Runner")
    print("=" * 60)
    print(f"Database: {DB_PATH}")
    print(f"Migrations directory: {MIGRATIONS_DIR}")
    print("-" * 60)
    
    conn = get_db_connection()
    
    try:
        # Ensure migrations table exists
        ensure_migrations_table(conn)
        
        # Get applied and pending migrations
        applied = get_applied_migrations(conn)
        pending = get_pending_migrations()
        
        print(f"Applied migrations: {len(applied)}")
        print(f"Available migrations: {len(pending)}")
        
        # Filter to only pending ones
        to_apply = [(v, n, f) for v, n, f in pending if v not in applied]
        
        if not to_apply:
            print("\n✓ Database is up to date. No migrations to apply.")
            return True
        
        print(f"\nMigrations to apply: {len(to_apply)}")
        print("-" * 60)
        
        # Apply each migration in order
        for version, name, filepath in sorted(to_apply):
            apply_migration(conn, version, name, filepath)
        
        print("-" * 60)
        print(f"✓ Successfully applied {len(to_apply)} migration(s)")
        return True
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def rollback(target_version=None):
    """Rollback to a specific version (not implemented - would require down migrations)"""
    print("Warning: Rollback not implemented. Please restore from backup.")
    return False


def status():
    """Show current migration status"""
    print("=" * 60)
    print("Migration Status")
    print("=" * 60)
    
    conn = get_db_connection()
    
    try:
        ensure_migrations_table(conn)
        applied = get_applied_migrations(conn)
        pending = get_pending_migrations()
        
        print(f"\nApplied migrations ({len(applied)}):")
        cursor = conn.execute(
            "SELECT version, name, applied_at FROM schema_migrations ORDER BY version"
        )
        for row in cursor.fetchall():
            print(f"  {row['version']:03d} - {row['name']} (applied: {row['applied_at']})")
        
        to_apply = [(v, n, f) for v, n, f in pending if v not in applied]
        if to_apply:
            print(f"\nPending migrations ({len(to_apply)}):")
            for version, name, _ in sorted(to_apply):
                print(f"  {version:03d} - {name}")
        else:
            print("\n✓ All migrations applied")
            
    finally:
        conn.close()


def init_db():
    """Initialize database with all migrations"""
    print("Initializing database...")
    
    # Create migrations directory if it doesn't exist
    MIGRATIONS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Run all migrations
    return migrate()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python migrate.py [migrate|status|init]")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "migrate":
        success = migrate()
        sys.exit(0 if success else 1)
    elif command == "status":
        status()
    elif command == "init":
        success = init_db()
        sys.exit(0 if success else 1)
    else:
        print(f"Unknown command: {command}")
        print("Available commands: migrate, status, init")
        sys.exit(1)
