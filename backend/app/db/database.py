import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("postgresql://smartpos_db_pcwj_user:WiO4Jm3dHbc3SjIag3tCtCOjAuIsWMns@dpg-d5savt15pdvs739ibpdg-a/smartpos_db_pcwj")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
