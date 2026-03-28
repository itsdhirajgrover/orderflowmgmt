import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Example MySQL connection string: "mysql+pymysql://user:password@localhost:3306/orderflow_db"
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://user:password@localhost:3306/orderflow_db")

# Azure MySQL Flexible Server requires SSL
connect_args = {}
if "azure" in DATABASE_URL or "mysql.database.azure.com" in DATABASE_URL:
    connect_args["ssl"] = {"ssl_mode": "REQUIRED"}

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
