import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-in-production")
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "root123")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "farmers_market")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    CLOUDINARY_URL = os.getenv("CLOUDINARY_URL", "")
