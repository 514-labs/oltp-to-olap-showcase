#!/usr/bin/env python3
"""
Database initialization script for SQLAlchemy example.

This script provides commands to:
- Check database connection
- Create tables (safe - only creates if they don't exist)
- Drop and recreate tables (destructive - use with caution)
"""

import argparse
import sys
from sqlmodel import SQLModel
from src.db.base import engine, check_db_connection


def create_tables():
    """Create all tables (safe - only creates if they don't exist)."""
    print("🔧 Creating database tables...")
    SQLModel.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")


def drop_tables():
    """Drop all tables (destructive!)."""
    print("⚠️  Dropping all tables...")
    SQLModel.metadata.drop_all(bind=engine)
    print("✅ All tables dropped!")


def recreate_tables():
    """Drop and recreate all tables (destructive!)."""
    print("🔄 Recreating database tables...")
    drop_tables()
    create_tables()
    print("✅ Database recreated successfully!")


def main():
    parser = argparse.ArgumentParser(
        description="Database initialization for SQLAlchemy example",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python init_db.py                  # Create tables (safe)
  python init_db.py --check          # Check database connection
  python init_db.py --drop           # Drop all tables (destructive!)
  python init_db.py --recreate       # Drop and recreate (destructive!)
        """
    )
    
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check database connection"
    )
    
    parser.add_argument(
        "--drop",
        action="store_true",
        help="Drop all tables (destructive!)"
    )
    
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Drop and recreate all tables (destructive!)"
    )
    
    args = parser.parse_args()
    
    # Check connection first
    if not check_db_connection():
        print("❌ Database connection failed!")
        print("Check your DATABASE_URL environment variable.")
        sys.exit(1)
    
    print("✅ Database connection successful!")
    
    if args.check:
        # Just checking connection - exit
        sys.exit(0)
    
    elif args.drop:
        # Confirm before dropping
        response = input("⚠️  This will DROP ALL TABLES. Are you sure? (yes/no): ")
        if response.lower() == "yes":
            drop_tables()
        else:
            print("❌ Operation cancelled")
            sys.exit(1)
    
    elif args.recreate:
        # Confirm before recreating
        response = input("⚠️  This will DROP and RECREATE all tables. Are you sure? (yes/no): ")
        if response.lower() == "yes":
            recreate_tables()
        else:
            print("❌ Operation cancelled")
            sys.exit(1)
    
    else:
        # Default: just create tables (safe)
        create_tables()


if __name__ == "__main__":
    main()
