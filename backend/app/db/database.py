import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("postgresql://smartpos_db1_user:aEsj8slK8pPxKGoELnWn9se9Ssq0jCO7@dpg-d5sde2k9c44c73et6jv0-a/smartpos_db1")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
