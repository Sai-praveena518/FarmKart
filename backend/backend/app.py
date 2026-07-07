import os
import sys
import time
import json
import csv
import io
import shutil
import traceback
from functools import wraps
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

import mysql.connector
import bcrypt
try:
    from dotenv import load_dotenv
except ImportError:  # Keeps local startup friendly until requirements are installed.
    load_dotenv = None
from mysql.connector import Error as MySQLError
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, decode_token, get_jwt_identity, jwt_required, verify_jwt_in_request
from itsdangerous import BadSignature, URLSafeTimedSerializer
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parents[1]
for env_path in (
    BASE_DIR / ".env",
    BASE_DIR.parent / ".env",
    PROJECT_DIR / ".env",
):
    if load_dotenv and env_path.exists():
        load_dotenv(env_path, override=False)

UPLOAD_FOLDER = BASE_DIR / "uploads"
ML_MODELS_DIR = BASE_DIR / "ml_models"
DATASET_UPLOAD_DIR = UPLOAD_FOLDER / "datasets"
DISEASE_MODEL_DIR = ML_MODELS_DIR / "disease"
UPLOAD_FOLDER.mkdir(exist_ok=True)
ML_MODELS_DIR.mkdir(exist_ok=True)
DATASET_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
DISEASE_MODEL_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
WEATHER_CACHE_SECONDS = 600
weather_cache = {}

CMS_SETTING_DEFAULTS = {
    "application_name": "FarmKart",
    "home_page_caption": "Your Farm. Your Market.",
    "home_page_description": "FarmKart connects farmers directly with buyers using smart technology, real-time orders, transport sharing, and AI-powered farming tools.",
    "footer_text": "Direct farmer-to-buyer commerce with orders, transport, AI farming tools, and verified users.",
    "copyright_text": "Copyright FarmKart. All rights reserved.",
    "contact_email": "saipraveenareddypothula518@gmail.com",
    "contact_phone": "",
    "whatsapp_number": "",
    "office_address": "Nandyal, Andhra Pradesh, India",
    "google_maps_location": "",
    "facebook_link": "",
    "instagram_link": "",
    "youtube_link": "",
    "linkedin_link": "",
    "commission_percent": "0",
    "platform_fee": "0",
    "delivery_fee": "0",
    "minimum_order": "1",
    "maximum_order": "100000",
    "payment_methods": "Pay Later,Cash on Delivery",
    "enable_razorpay": "false",
    "enable_phonepe": "false",
    "enable_cod": "true",
    "maintenance_mode": "false",
    "app_version": "1.0.0",
    "minimum_app_version": "1.0.0",
    "force_update": "false",
    "enable_registration": "true",
    "enable_buyer_registration": "true",
    "enable_farmer_registration": "true",
    "enable_ai_price_prediction": "true",
    "enable_ai": "true",
    "enable_disease_detection": "true",
    "enable_weather": "true",
    "weather_api_key": "",
    "maximum_sharing_distance": "25",
    "maximum_farmers_per_vehicle": "4",
    "default_transport_fee": "0",
    "push_notification": "false",
    "email_notification": "false",
    "sms_notification": "false",
}

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-this-secret-in-production")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", app.config["SECRET_KEY"])
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)
default_cors_origins = ["http://localhost:5173", "https://farm-kart-swart.vercel.app"]
configured_cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
cors_origins = configured_cors_origins + [origin for origin in default_cors_origins if origin not in configured_cors_origins]
if "*" in configured_cors_origins:
    cors_origins = "*"
CORS(app, resources={r"/*": {"origins": cors_origins}})
serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])
jwt = JWTManager(app)


@jwt.invalid_token_loader
def invalid_jwt(reason):
    return jsonify({"message": "Unauthorized", "error": reason}), 401


from urllib.parse import urlparse
import os

def db_config():
    public_url = os.getenv("MYSQL_PUBLIC_URL")

    if public_url:
        parsed = urlparse(public_url)

        config = {
            "host": parsed.hostname,
            "port": parsed.port or 3306,
            "user": parsed.username,
            "password": parsed.password,
            "database": parsed.path.lstrip("/"),
        }

        # Debug
        print("=" * 60)
        print("USING MYSQL_PUBLIC_URL")
        print("DB CONFIG:")
        print(f"HOST     : {config['host']}")
        print(f"PORT     : {config['port']}")
        print(f"USER     : {config['user']}")
        print(f"DATABASE : {config['database']}")
        print("=" * 60)

        return config

    config = {
        "host": os.getenv("MYSQLHOST") or "localhost",
        "port": int(os.getenv("MYSQLPORT") or 3306),
        "user": os.getenv("MYSQLUSER") or "root",
        "password": os.getenv("MYSQLPASSWORD") or "",
        "database": os.getenv("MYSQLDATABASE") or "farmers_market",
    }

    # Debug
    print("=" * 60)
    print("USING INDIVIDUAL MYSQL VARIABLES")
    print("DB CONFIG:")
    print(f"HOST     : {config['host']}")
    print(f"PORT     : {config['port']}")
    print(f"USER     : {config['user']}")
    print(f"DATABASE : {config['database']}")
    print("=" * 60)

    return config
def query(sql, params=None, fetch=False, one=False):
    connection = mysql.connector.connect(**db_config())
    cursor = connection.cursor(dictionary=True)
    cursor.execute(sql, params or ())
    result = cursor.fetchone() if one else cursor.fetchall() if fetch else None
    connection.commit()
    cursor.close()
    connection.close()
    return result


def request_data():
    if request.form:
        return request.form
    return request.get_json(silent=True) or {}


def number_or_none(value):
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def clean_phone(phone):
    return "".join(ch for ch in str(phone or "") if ch.isdigit())


def location_label(row):
    return ", ".join(str(row.get(key) or "") for key in ["village", "district", "state"] if row.get(key))


def nominatim_search(query_text):
    params = urlencode({
        "q": f"{query_text}, Andhra Pradesh, India",
        "format": "json",
        "addressdetails": 1,
        "limit": 10,
    })
    request_obj = Request(
        f"https://nominatim.openstreetmap.org/search?{params}",
        headers={"User-Agent": os.getenv("NOMINATIM_USER_AGENT", "FarmersMarketDirectAI/1.0")},
    )
    with urlopen(request_obj, timeout=8) as response:
        return json.loads(response.read().decode("utf-8"))


def clean_location_result(item):
    address = item.get("address") or {}
    village = (
        address.get("village")
        or address.get("town")
        or address.get("city")
        or address.get("municipality")
        or address.get("hamlet")
        or address.get("suburb")
    )
    district = address.get("state_district") or address.get("county") or address.get("district")
    state = address.get("state")
    if state and state.lower() != "andhra pradesh":
        return None
    if not village:
        return None
    display_parts = [village, district, state or "Andhra Pradesh"]
    return {
        "display_name": ", ".join(part for part in display_parts if part),
        "village": village,
        "district": district or "",
        "state": state or "Andhra Pradesh",
        "latitude": float(item["lat"]),
        "longitude": float(item["lon"]),
    }


def create_notification(user_id, title, message):
    if not user_id:
        return
    query(
        "INSERT INTO notifications (user_id, title, message) VALUES (%s, %s, %s)",
        (user_id, title, message),
    )


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(stored_hash, password):
    if not stored_hash:
        return False
    if stored_hash.startswith("$2"):
        return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
    return check_password_hash(stored_hash, password)


def trend_label(current, predicted):
    if predicted > current:
        return "Rising"
    if predicted < current:
        return "Falling"
    return "Stable"


def price_model_path():
    return ML_MODELS_DIR / "price_prediction.pkl"


def latest_price_dataset():
    files = sorted(DATASET_UPLOAD_DIR.glob("*.csv"), key=lambda path: path.stat().st_mtime, reverse=True)
    return files[0] if files else None


def db_current_market_price(crop_name):
    row = query(
        """
        SELECT AVG(price) AS current_price
        FROM products
        WHERE crop_name=%s AND status='Available' AND quantity > 0
        """,
        (crop_name,),
        fetch=True,
        one=True,
    )
    return number_or_none(row.get("current_price") if row else None)


def validate_price_csv(path):
    required = {"crop_name", "market", "date", "price"}
    rows = []
    with open(path, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            return None, "CSV must contain crop_name, market, date, price columns."
        for index, row in enumerate(reader, start=2):
            try:
                parsed_date = datetime.strptime(row["date"], "%Y-%m-%d")
                price = float(row["price"])
            except (TypeError, ValueError):
                return None, f"Invalid date or price at row {index}."
            rows.append({
                "crop_name": row["crop_name"].strip(),
                "market": row["market"].strip(),
                "date": parsed_date,
                "price": price,
            })
    if len(rows) < 3:
        return None, "CSV needs at least 3 valid rows for training."
    return rows, None


def train_price_model(rows):
    try:
        import joblib
        import pandas as pd
        from sklearn.compose import ColumnTransformer
        from sklearn.linear_model import LinearRegression
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import OneHotEncoder
    except ImportError as error:
        return False, f"ML dependencies missing: {error}"

    features = []
    target = []
    for row in rows:
        features.append({
            "crop_name": row["crop_name"],
            "market": row["market"],
            "day_number": row["date"].toordinal(),
        })
        target.append(row["price"])
    pipeline = Pipeline([
        ("features", ColumnTransformer([
            ("category", OneHotEncoder(handle_unknown="ignore"), ["crop_name", "market"]),
            ("date", "passthrough", ["day_number"]),
        ])),
        ("model", LinearRegression()),
    ])
    pipeline.fit(pd.DataFrame(features), target)
    joblib.dump(pipeline, price_model_path())
    return True, None


def predict_with_model(crop_name, market, base_date):
    try:
        import joblib
        import pandas as pd
    except ImportError:
        return None
    if not price_model_path().exists():
        return None
    model = joblib.load(price_model_path())
    features = [
        {"crop_name": crop_name, "market": market, "day_number": base_date.toordinal()},
        {"crop_name": crop_name, "market": market, "day_number": (base_date + timedelta(days=3)).toordinal()},
        {"crop_name": crop_name, "market": market, "day_number": (base_date + timedelta(days=7)).toordinal()},
    ]
    values = model.predict(pd.DataFrame(features))
    return [round(max(float(value), 0), 2) for value in values]


def weather_suggestion(rain_probability, temperature):
    if rain_probability is not None and rain_probability >= 60:
        return "Rain expected. Avoid pesticide spraying."
    if temperature is not None and temperature >= 35:
        return "High temperature. Irrigation may be needed."
    return "Good weather for regular farming activities."


def unix_time_to_local(value):
    try:
        return datetime.fromtimestamp(int(value)).strftime("%I:%M %p")
    except (TypeError, ValueError, OSError):
        return None


def user_weather_city(user):
    return (
        user.get("village")
        or user.get("district")
        or user.get("state")
        or user.get("address")
        or ""
    ).strip()


def openweather_cache_key(lat=None, lng=None, city=None):
    if lat is not None and lng is not None:
        return f"coords:{round(float(lat), 4)}:{round(float(lng), 4)}"
    return f"city:{(city or '').strip().lower()}"


def parse_openweather_payload(payload, location):
    main = payload.get("main") or {}
    wind = payload.get("wind") or {}
    weather = (payload.get("weather") or [{}])[0]
    sys_data = payload.get("sys") or {}
    rain = payload.get("rain") or {}
    rain_probability = None
    if isinstance(rain, dict) and any(number_or_none(rain.get(key)) for key in ["1h", "3h"]):
        rain_probability = 100
    temperature = number_or_none(main.get("temp"))
    condition = (weather.get("description") or "Current Weather").title()
    return {
        "city": payload.get("name") or location or "Your location",
        "location": location or payload.get("name") or "Your location",
        "temperature": temperature,
        "feels_like": number_or_none(main.get("feels_like")),
        "humidity": int(main.get("humidity") or 0),
        "wind_speed": number_or_none(wind.get("speed")) or 0,
        "pressure": int(main.get("pressure") or 0),
        "visibility": payload.get("visibility"),
        "weather_condition": condition,
        "weather_icon": weather.get("icon"),
        "icon": weather.get("icon"),
        "sunrise": unix_time_to_local(sys_data.get("sunrise")),
        "sunset": unix_time_to_local(sys_data.get("sunset")),
        "rain_probability": rain_probability,
        "condition": condition,
        "suggestion": weather_suggestion(rain_probability, temperature),
        "source": "OpenWeather",
    }


ROLE_ALIASES = {
    "superadmin": "SuperAdmin",
    "super_admin": "SuperAdmin",
    "super admin": "SuperAdmin",
    "admin": "Admin",
    "farmer": "Farmer",
    "buyer": "Buyer",
}
VALID_ROLES = {"SuperAdmin", "Admin", "Farmer", "Buyer"}
ADMIN_ROLES = {"SuperAdmin", "Admin"}


def normalize_role(role):
    if role is None:
        return None
    value = str(role).strip()
    return ROLE_ALIASES.get(value.lower(), value if value in VALID_ROLES else value)


def db_role(role):
    normalized = normalize_role(role)
    return normalized if normalized in VALID_ROLES else None


def role_in(user_or_role, roles):
    role = user_or_role.get("role") if isinstance(user_or_role, dict) else user_or_role
    return normalize_role(role) in {normalize_role(item) for item in roles}


def role_sql_values(*roles):
    values = []
    for role in roles:
        normalized = normalize_role(role)
        values.extend([normalized, normalized.lower()])
    return tuple(dict.fromkeys(values))


def role_in_clause(column, roles):
    values = role_sql_values(*roles)
    return f"{column} IN ({', '.join(['%s'] * len(values))})", values


def count_users_by_role(*roles, extra_condition=""):
    clause, values = role_in_clause("role", roles)
    return query(
        f"SELECT COUNT(*) AS value FROM users WHERE {clause}{extra_condition}",
        values,
        fetch=True,
        one=True,
    )["value"]


def require_super_admin():
    if not role_in(request.user, ["SuperAdmin"]):
        return jsonify({"message": "403 Forbidden"}), 403
    return None


def log_activity(user_id, action, details=None):
    if not user_id:
        return
    query(
        "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
        (user_id, action, details),
    )


def revenue_summary(user=None):
    scope_clause = ""
    params = []
    payment_clause = ""
    payment_params = []
    if user and not role_in(user, ADMIN_ROLES):
        scope_clause = " AND farmer_id=%s"
        params.append(user["id"])
        payment_clause = " AND farmer_id=%s"
        payment_params.append(user["id"])
    actual = query(
        f"SELECT COALESCE(SUM(amount), 0) AS value FROM payments WHERE payment_status='Paid'{payment_clause}",
        tuple(payment_params),
        fetch=True,
        one=True,
    )["value"]
    estimated = query(
        f"""
        SELECT COALESCE(SUM(total_price), 0) AS value
        FROM orders
        WHERE status IN ('Accepted', 'Packed', 'Shipped', 'Delivered')
          AND payment_status <> 'Paid'{scope_clause}
        """,
        tuple(params),
        fetch=True,
        one=True,
    )["value"]
    pending = query(
        f"""
        SELECT COALESCE(SUM(total_price), 0) AS value
        FROM orders
        WHERE status IN ('Accepted', 'Packed', 'Shipped', 'Delivered')
          AND payment_status='Pending'{scope_clause}
        """,
        tuple(params),
        fetch=True,
        one=True,
    )["value"]
    counts = {}
    for key, condition in {
        "total_orders": "1=1",
        "accepted_orders": "status='Accepted'",
        "delivered_orders": "status='Delivered'",
        "cancelled_orders": "status IN ('Cancelled', 'Rejected')",
        "paid_orders": "payment_status='Paid'",
    }.items():
        counts[key] = query(
            f"SELECT COUNT(*) AS value FROM orders WHERE {condition}{scope_clause}",
            tuple(params),
            fetch=True,
            one=True,
        )["value"]
    return {
        "actual_revenue": actual,
        "estimated_revenue": estimated,
        "pending_payments": pending,
        **counts,
    }


def init_database():
    statements = [
        """
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          email VARCHAR(180) NOT NULL UNIQUE,
          phone VARCHAR(30),
          password_hash VARCHAR(255),
          role ENUM('SuperAdmin', 'Admin', 'Farmer', 'Buyer') NOT NULL,
          address VARCHAR(255),
          state VARCHAR(80),
          district VARCHAR(80),
          village VARCHAR(80),
          latitude DECIMAL(10,7),
          longitude DECIMAL(10,7),
          profile_image VARCHAR(255),
          is_verified BOOLEAN DEFAULT FALSE,
          account_status VARCHAR(30) DEFAULT 'Active',
          last_login_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          farmer_id INT,
          crop_name VARCHAR(120) NOT NULL,
          category VARCHAR(80),
          quantity INT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          unit VARCHAR(30) DEFAULT 'Kg',
          location VARCHAR(180) NOT NULL,
          description TEXT,
          image VARCHAR(255),
          status VARCHAR(40) DEFAULT 'Available',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS product_images (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          image_path VARCHAR(255) NOT NULL,
          is_primary BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_product_images_product_id (product_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          farmer_id INT,
          buyer_id INT,
          crop_name VARCHAR(120) NOT NULL,
          quantity INT NOT NULL,
          total_price DECIMAL(10,2) DEFAULT 0,
          status VARCHAR(40) DEFAULT 'Pending',
          payment_status VARCHAR(40) DEFAULT 'Pending',
          delivery_address TEXT,
          payment_method VARCHAR(60) DEFAULT 'Pay Later',
          accepted_at TIMESTAMP NULL,
          packed_at TIMESTAMP NULL,
          shipped_at TIMESTAMP NULL,
          delivered_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          product_id INT NOT NULL,
          farmer_id INT,
          crop_name VARCHAR(120) NOT NULL,
          quantity INT NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_order_items_order_id (order_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS cart (
          id INT AUTO_INCREMENT PRIMARY KEY,
          buyer_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_cart_item (buyer_id, product_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          buyer_id INT,
          rating INT NOT NULL,
          review TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS transport_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          farmer_id INT,
          origin_village VARCHAR(100),
          origin_district VARCHAR(100),
          destination VARCHAR(255) NOT NULL,
          crop_name VARCHAR(120),
          quantity INT,
          vehicle_type VARCHAR(100),
          travel_date DATE,
          estimated_total_cost DECIMAL(10,2) DEFAULT 0,
          max_farmers INT DEFAULT 4,
          status VARCHAR(40) DEFAULT 'Open',
          latitude DECIMAL(10,7),
          longitude DECIMAL(10,7),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS transport_members (
          id INT AUTO_INCREMENT PRIMARY KEY,
          transport_id INT NOT NULL,
          farmer_id INT NOT NULL,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_transport_farmer (transport_id, farmer_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS payments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT,
          buyer_id INT,
          farmer_id INT,
          amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(60) DEFAULT 'Pay Later',
          payment_status VARCHAR(40) DEFAULT 'Pending',
          transaction_id VARCHAR(180),
          paid_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          title VARCHAR(160) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS price_predictions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          farmer_id INT,
          crop_name VARCHAR(120) NOT NULL,
          market VARCHAR(150),
          current_price DECIMAL(10,2) NOT NULL,
          predicted_price_3_days DECIMAL(10,2),
          predicted_price_7_days DECIMAL(10,2),
          predicted_3_days DECIMAL(10,2),
          predicted_7_days DECIMAL(10,2),
          trend VARCHAR(40) NOT NULL,
          prediction_type VARCHAR(50),
          note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS disease_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          farmer_id INT,
          image_url VARCHAR(255),
          crop_name VARCHAR(100),
          disease_name VARCHAR(150),
          confidence DECIMAL(5,2),
          treatment TEXT,
          fertilizer_recommendation TEXT,
          prevention_tips TEXT,
          status VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS weather_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          temperature DECIMAL(5,2),
          humidity INT,
          wind_speed DECIMAL(6,2),
          rain_probability DECIMAL(5,2),
          condition_text VARCHAR(150),
          suggestion TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS complaints (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          subject VARCHAR(180) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(40) DEFAULT 'Open',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS ai_modules (
          id INT AUTO_INCREMENT PRIMARY KEY,
          module_key VARCHAR(80) NOT NULL UNIQUE,
          name VARCHAR(160) NOT NULL,
          is_enabled BOOLEAN DEFAULT TRUE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS system_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          setting_key VARCHAR(100) NOT NULL UNIQUE,
          setting_value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS cms_banners (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(180) NOT NULL,
          caption TEXT,
          image_url VARCHAR(255),
          target_url VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS crop_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(120) NOT NULL UNIQUE,
          description TEXT,
          is_enabled BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS media_library (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(180),
          file_url VARCHAR(255) NOT NULL,
          media_type VARCHAR(60) DEFAULT 'image',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS organic_certificates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          farmer_id INT,
          product_id INT,
          certificate_url VARCHAR(255),
          status VARCHAR(40) DEFAULT 'Pending',
          organic_badge BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS advertisements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(180) NOT NULL,
          image_url VARCHAR(255),
          target_url VARCHAR(255),
          status VARCHAR(40) DEFAULT 'Draft',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          action VARCHAR(120) NOT NULL,
          details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS ai_predictions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          prediction_type VARCHAR(80),
          crop_name VARCHAR(120),
          result TEXT,
          confidence DECIMAL(5,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS analytics (
          id INT AUTO_INCREMENT PRIMARY KEY,
          metric_key VARCHAR(120) NOT NULL,
          metric_value DECIMAL(12,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
    ]
    connection = mysql.connector.connect(**db_config())
    cursor = connection.cursor()
    for statement in statements:
        cursor.execute(statement)
    migrations = {
        "users": {
            "phone": "VARCHAR(30)",
            "password_hash": "VARCHAR(255)",
            "address": "VARCHAR(255)",
            "state": "VARCHAR(80)",
            "district": "VARCHAR(80)",
            "village": "VARCHAR(80)",
            "latitude": "DECIMAL(10,7)",
            "longitude": "DECIMAL(10,7)",
            "profile_image": "VARCHAR(255)",
            "is_verified": "BOOLEAN DEFAULT FALSE",
            "account_status": "VARCHAR(30) DEFAULT 'Active'",
            "last_login_at": "TIMESTAMP NULL",
            "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        },
        "products": {
            "farmer_id": "INT",
            "category": "VARCHAR(80)",
            "unit": "VARCHAR(30) DEFAULT 'Kg'",
            "description": "TEXT",
            "status": "VARCHAR(40) DEFAULT 'Available'",
            "is_featured": "BOOLEAN DEFAULT FALSE",
            "is_hidden": "BOOLEAN DEFAULT FALSE",
            "organic_badge": "BOOLEAN DEFAULT FALSE",
            "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        },
        "orders": {
            "farmer_id": "INT",
            "buyer_id": "INT",
            "total_price": "DECIMAL(10,2) DEFAULT 0",
            "payment_status": "VARCHAR(40) DEFAULT 'Pending'",
            "delivery_address": "TEXT",
            "payment_method": "VARCHAR(60) DEFAULT 'Pay Later'",
            "accepted_at": "TIMESTAMP NULL",
            "packed_at": "TIMESTAMP NULL",
            "shipped_at": "TIMESTAMP NULL",
            "delivered_at": "TIMESTAMP NULL",
            "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        },
        "order_items": {
            "farmer_id": "INT",
        },
        "reviews": {
            "buyer_id": "INT",
        },
        "transport_requests": {
            "origin_village": "VARCHAR(100)",
            "origin_district": "VARCHAR(100)",
            "vehicle_type": "VARCHAR(100)",
            "travel_date": "DATE",
            "estimated_total_cost": "DECIMAL(10,2) DEFAULT 0",
            "max_farmers": "INT DEFAULT 4",
            "latitude": "DECIMAL(10,7)",
            "longitude": "DECIMAL(10,7)",
            "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        },
        "notifications": {
            "is_read": "BOOLEAN DEFAULT FALSE",
            "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        },
        "price_predictions": {
            "farmer_id": "INT",
            "market": "VARCHAR(150)",
            "predicted_price_3_days": "DECIMAL(10,2)",
            "predicted_price_7_days": "DECIMAL(10,2)",
            "prediction_type": "VARCHAR(50)",
            "note": "TEXT",
        },
        "payments": {
            "order_id": "INT",
            "buyer_id": "INT",
            "farmer_id": "INT",
            "amount": "DECIMAL(10,2) DEFAULT 0",
            "payment_method": "VARCHAR(60) DEFAULT 'Pay Later'",
            "payment_status": "VARCHAR(40) DEFAULT 'Pending'",
            "transaction_id": "VARCHAR(255)",
            "paid_at": "TIMESTAMP NULL",
            "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        },
        "complaints": {
            "user_id": "INT",
            "status": "VARCHAR(40) DEFAULT 'Open'",
            "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        },
        "activity_logs": {
            "user_id": "INT",
            "details": "TEXT",
            "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        },
        "cms_banners": {
            "caption": "TEXT",
            "target_url": "VARCHAR(255)",
            "is_active": "BOOLEAN DEFAULT TRUE",
            "sort_order": "INT DEFAULT 0",
            "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        },
        "crop_categories": {
            "description": "TEXT",
            "is_enabled": "BOOLEAN DEFAULT TRUE",
            "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        },
        "media_library": {
            "title": "VARCHAR(180)",
            "media_type": "VARCHAR(60) DEFAULT 'image'",
        },
        "organic_certificates": {
            "farmer_id": "INT",
            "product_id": "INT",
            "certificate_url": "VARCHAR(255)",
            "status": "VARCHAR(40) DEFAULT 'Pending'",
            "organic_badge": "BOOLEAN DEFAULT FALSE",
            "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        },
    }
    for table, columns in migrations.items():
        cursor.execute(f"SHOW COLUMNS FROM {table}")
        existing = {row[0] for row in cursor.fetchall()}
        for column, ddl in columns.items():
            if column not in existing:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")
    cursor.execute("SHOW COLUMNS FROM users")
    user_columns = {row[0] for row in cursor.fetchall()}
    if "password" in user_columns:
        cursor.execute("ALTER TABLE users MODIFY password VARCHAR(255) NULL")
    cursor.execute("ALTER TABLE users MODIFY role VARCHAR(30) NOT NULL")
    cursor.execute("UPDATE users SET role='SuperAdmin' WHERE LOWER(role) IN ('superadmin', 'super_admin', 'super admin')")
    cursor.execute("UPDATE users SET role='Admin' WHERE LOWER(role)='admin'")
    cursor.execute("UPDATE users SET role='Farmer' WHERE LOWER(role)='farmer'")
    cursor.execute("UPDATE users SET role='Buyer' WHERE LOWER(role)='buyer'")
    cursor.execute("ALTER TABLE users MODIFY role ENUM('SuperAdmin', 'Admin', 'Farmer', 'Buyer') NOT NULL")
    cursor.execute("UPDATE users SET account_status='Active' WHERE account_status IS NULL")
    connection.commit()
    cursor.close()
    connection.close()


def db_error_response(error):
    message = str(error)
    if "Duplicate entry" in message and "email" in message:
        return jsonify({"message": "This email is already registered. Try login or use another email."}), 409
    if "Unknown column" in message or "doesn't exist" in message:
        return jsonify({"message": "Database tables are not updated. Run backend/schema.sql in MySQL, then try again.", "details": message}), 500
    return jsonify({"message": "Database error during registration.", "details": message}), 500


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_upload(field_name):
    file = request.files.get(field_name)
    if not file or not allowed_file(file.filename):
        return None
    filename = f"{int(time.time())}_{secure_filename(file.filename)}"
    file.save(UPLOAD_FOLDER / filename)
    return filename


def save_uploads(field_name):
    files = request.files.getlist(field_name)
    saved = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = f"{int(time.time())}_{len(saved)}_{secure_filename(file.filename)}"
            file.save(UPLOAD_FOLDER / filename)
            saved.append(filename)
    return saved


def setting_rows():
    rows = query("SELECT setting_key, setting_value, updated_at FROM system_settings", fetch=True)
    return rows or []


def settings_dict(include_defaults=True):
    values = dict(CMS_SETTING_DEFAULTS) if include_defaults else {}
    for row in setting_rows():
        values[row["setting_key"]] = row.get("setting_value") or ""
    return values


def get_setting(setting_key, default=""):
    return settings_dict().get(setting_key, default)


def upsert_setting(setting_key, value):
    query(
        """
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES (%s, %s)
        ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)
        """,
        (setting_key, "" if value is None else str(value)),
    )


def save_setting_upload(field_name):
    filename = save_upload(field_name)
    return f"uploads/{filename}" if filename else None


def parse_bool_setting(value):
    return str(value).strip().lower() in {"1", "true", "yes", "on", "enabled"}


def create_admin_log(action, details=None):
    user = getattr(request, "user", None) or {}
    try:
        log_activity(user.get("id"), action, details)
    except MySQLError:
        traceback.print_exc()


def attach_product_images(products):
    if not products:
        return products
    product_list = products if isinstance(products, list) else [products]
    ids = [item["id"] for item in product_list if item.get("id")]
    if not ids:
        return products
    placeholders = ", ".join(["%s"] * len(ids))
    images = query(
        f"SELECT product_id, image_path FROM product_images WHERE product_id IN ({placeholders}) ORDER BY is_primary DESC, id ASC",
        tuple(ids),
        fetch=True,
    )
    grouped = {}
    for image in images:
        grouped.setdefault(image["product_id"], []).append(image["image_path"])
    for product in product_list:
        product_images = grouped.get(product["id"], [])
        if product.get("image") and product["image"] not in product_images:
            product_images.insert(0, product["image"])
        product["images"] = product_images
        product["stock"] = product.get("quantity")
        product["unit"] = product.get("unit") or "Kg"
        product["rating"] = round(float(product.get("rating") or 0), 1) if product.get("rating") is not None else None
    return products


def create_token(user):
    normalized_role = normalize_role(user.get("role"))
    return create_access_token(
        identity=str(user.get("id")),
        additional_claims={"role": normalized_role},
    )


def get_current_user_role():
    user = getattr(request, "user", None) or current_user()
    return str(normalize_role(user.get("role")) or "").strip().lower() if user else ""


def current_user(optional=False):
    try:
        verify_jwt_in_request(optional=optional)
    except Exception:
        if optional:
            return None
        raise

    user_id = get_jwt_identity()
    if not user_id:
        return None

    user = query("SELECT * FROM users WHERE id=%s", (str(user_id),), fetch=True, one=True)
    if not user:
        return None

    user["role"] = normalize_role(user.get("role"))
    request.jwt_identity = str(user_id)
    request.jwt_role = str(user["role"] or "").strip().lower()
    request.user = user
    return user


def farmer_required(user=None):
    user = user or getattr(request, "user", None) or current_user()
    role = str(normalize_role(user.get("role")) or "").strip().lower() if user else ""

    if role != "farmer":
        return jsonify({
            "message": "Access denied. Please login as Farmer.",
            "identity": getattr(request, "jwt_identity", get_jwt_identity()),
            "role_received": role,
        }), 403
    return None


def auth_required(*roles):
    def decorator(handler):
        @wraps(handler)
        def wrapper(*args, **kwargs):
            try:
                user = current_user()
            except Exception:
                return jsonify({"message": "Unauthorized"}), 401
            if not user:
                return jsonify({"message": "Unauthorized"}), 401
            if user.get("account_status") == "Suspended":
                return jsonify({"message": "403 Forbidden"}), 403
            allowed_roles = {str(normalize_role(role) or "").strip().lower() for role in roles}
            user_role = str(normalize_role(user.get("role")) or "").strip().lower()
            if allowed_roles == {"farmer"}:
                denied = farmer_required(user)
                if denied:
                    return denied
            if allowed_roles and user_role not in allowed_roles:
                return jsonify({
                    "message": f"Access denied. Please login as {normalize_role(next(iter(roles), 'required role'))}.",
                    "identity": getattr(request, "jwt_identity", None),
                    "role_received": user_role,
                }), 403
            request.user = user
            return handler(*args, **kwargs)
        return wrapper
    return decorator


def public_user(user):
    keys = ["id", "name", "email", "phone", "role", "address", "state", "district", "village", "latitude", "longitude", "profile_image", "is_verified", "account_status", "created_at"]
    result = {key: user.get(key) for key in keys}
    result["role"] = normalize_role(result.get("role"))
    return result


def print_login_debug(user, token):
    payload = decode_token(token)
    jwt_role = normalize_role(payload.get("role"))
    print("Logged in user:")
    print(f"ID: {user.get('id')}")
    print(f"JWT Subject: {payload.get('sub')}")
    print(f"Role: {normalize_role(user.get('role'))}")
    print(f"JWT Role: {jwt_role}")


@app.get("/")
def health():
    return jsonify({"status": "ok", "service": "Farmers Market Direct AI API"})


@app.get("/api/location/search")
def location_search():
    q = (request.args.get("q") or "").strip()
    if len(q) < 3:
        return jsonify([])
    try:
        raw_results = nominatim_search(q)
        locations = []
        seen = set()
        for item in raw_results:
            cleaned = clean_location_result(item)
            if not cleaned:
                continue
            key = (cleaned["village"].lower(), cleaned["district"].lower(), cleaned["state"].lower())
            if key in seen:
                continue
            seen.add(key)
            locations.append(cleaned)
        return jsonify(locations)
    except (HTTPError, URLError, TimeoutError, ValueError) as error:
        return jsonify({"message": "Location not found. Please enter manually.", "details": str(error)}), 502


@app.get("/api/public/stats")
def public_stats():
    return jsonify({
        "farmers": count_users_by_role("Farmer"),
        "buyers": count_users_by_role("Buyer"),
        "products": query("SELECT COUNT(*) AS value FROM products", fetch=True, one=True)["value"],
        "orders": query("SELECT COUNT(*) AS value FROM orders", fetch=True, one=True)["value"],
    })


@app.get("/api/public/cms")
def public_cms():
    settings = settings_dict()
    banners = query(
        """
        SELECT id, title, caption, image_url, target_url, sort_order
        FROM cms_banners
        WHERE is_active=TRUE
        ORDER BY sort_order ASC, id DESC
        """,
        fetch=True,
    )
    categories = query(
        """
        SELECT id, name, description
        FROM crop_categories
        WHERE is_enabled=TRUE
        ORDER BY name ASC
        """,
        fetch=True,
    )
    public_keys = [
        "application_name", "logo", "splash_screen_image", "login_page_banner",
        "home_page_hero_image", "home_page_caption", "home_page_description",
        "footer_text", "copyright_text", "contact_email", "contact_phone",
        "whatsapp_number", "office_address", "google_maps_location",
        "facebook_link", "instagram_link", "youtube_link", "linkedin_link",
        "enable_registration", "enable_buyer_registration", "enable_farmer_registration",
        "maintenance_mode", "app_version", "minimum_app_version", "force_update",
    ]
    return jsonify({
        "settings": {key: settings.get(key, "") for key in public_keys},
        "banners": banners,
        "categories": categories,
    })


@app.get("/api/public/products")
def public_products():
    rows = query(
        """
        SELECT p.*, u.name AS farmer_name, u.village, u.district, u.state,
               COALESCE(AVG(r.rating), 0) AS rating,
               COUNT(DISTINCT o.id) AS orders_count
        FROM products p
        LEFT JOIN users u ON u.id=p.farmer_id
        LEFT JOIN reviews r ON r.product_id=p.id
        LEFT JOIN orders o ON o.product_id=p.id
        WHERE p.status='Available' AND p.quantity > 0 AND COALESCE(p.is_hidden, FALSE)=FALSE
        GROUP BY p.id, u.id
        ORDER BY p.id DESC
        """,
        fetch=True,
    )
    return jsonify(attach_product_images(rows))


@app.get("/api/public/products/<int:product_id>")
def public_product(product_id):
    product = query(
        """
        SELECT p.*, u.name AS farmer_name, u.phone AS farmer_phone, u.village, u.district, u.state
        FROM products p
        LEFT JOIN users u ON u.id=p.farmer_id
        WHERE p.id=%s AND COALESCE(p.is_hidden, FALSE)=FALSE
        """,
        (product_id,),
        fetch=True,
        one=True,
    )
    if not product:
        return jsonify({"message": "Product not found"}), 404
    reviews = query(
        """
        SELECT r.*, u.name AS reviewer_name
        FROM reviews r
        LEFT JOIN users u ON u.id=r.buyer_id
        WHERE r.product_id=%s
        ORDER BY r.id DESC
        """,
        (product_id,),
        fetch=True,
    )
    product["reviews"] = reviews
    attach_product_images(product)
    return jsonify(product)


@app.post("/api/auth/register")
@app.post("/auth/register")
@app.post("/register")
def register():
    data = request_data()
    required = ["name", "email", "phone", "password", "role"]
    cleaned = {field: str(data.get(field) or "").strip() for field in required}
    settings = settings_dict()
    if not parse_bool_setting(settings.get("enable_registration", "true")):
        return jsonify({"success": False, "message": "Registration is currently disabled."}), 403
    if any(not cleaned[field] for field in required):
        return jsonify({"success": False, "message": "Please fill all required fields."}), 400

    email = cleaned["email"].lower()
    phone = cleaned["phone"]
    if "@" not in email or "." not in email.rsplit("@", 1)[-1] or not phone.isdigit() or len(phone) != 10 or len(cleaned["password"]) < 8:
        return jsonify({"success": False, "message": "Invalid input."}), 400

    requested_role = db_role(cleaned["role"])
    if requested_role not in ["Farmer", "Buyer"]:
        return jsonify({"success": False, "message": "Invalid input."}), 400
    if requested_role == "Buyer" and not parse_bool_setting(settings.get("enable_buyer_registration", "true")):
        return jsonify({"success": False, "message": "Buyer registration is currently disabled."}), 403
    if requested_role == "Farmer" and not parse_bool_setting(settings.get("enable_farmer_registration", "true")):
        return jsonify({"success": False, "message": "Farmer registration is currently disabled."}), 403

    try:
        if query("SELECT id FROM users WHERE email=%s LIMIT 1", (email,), fetch=True, one=True):
            return jsonify({"success": False, "message": "Email already exists."}), 409
        if query("SELECT id FROM users WHERE phone=%s LIMIT 1", (phone,), fetch=True, one=True):
            return jsonify({"success": False, "message": "Phone number already exists."}), 409
    except MySQLError:
        traceback.print_exc()
        return jsonify({"success": False, "message": "Database connection failed."}), 500

    profile_image = save_upload("profile_image")
    password_hash = hash_password(cleaned["password"])
    try:
        query(
            """
            INSERT INTO users (name, email, phone, password_hash, role, address, state, district, village, latitude, longitude, profile_image, is_verified)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                cleaned["name"],
                email,
                phone,
                password_hash,
                requested_role,
                data.get("address"),
                data.get("state"),
                data.get("district"),
                data.get("village"),
                number_or_none(data.get("latitude")),
                number_or_none(data.get("longitude")),
                profile_image,
                False,
            ),
        )
    except MySQLError as error:
        traceback.print_exc()
        message = str(error).lower()
        if "duplicate entry" in message and "email" in message:
            return jsonify({"success": False, "message": "Email already exists."}), 409
        if "duplicate entry" in message and "phone" in message:
            return jsonify({"success": False, "message": "Phone number already exists."}), 409
        return jsonify({"success": False, "message": "Database connection failed."}), 500
    except (TypeError, ValueError):
        traceback.print_exc()
        return jsonify({"success": False, "message": "Invalid input."}), 400
    return jsonify({"success": True, "message": "Registration successful."}), 201


@app.post("/api/auth/login")
@app.post("/auth/login")
@app.post("/login")
def login():
    data = request_data()
    user = query("SELECT * FROM users WHERE email=%s", (data.get("email"),), fetch=True, one=True)
    if not user or not verify_password(user["password_hash"], data.get("password", "")):
        return jsonify({"message": "Invalid email or password"}), 401
    if user.get("account_status") == "Suspended":
        return jsonify({"message": "403 Forbidden"}), 403
    user["role"] = normalize_role(user.get("role"))
    if data.get("role") and normalize_role(data.get("role")) != user["role"]:
        return jsonify({"message": "Selected role does not match this account"}), 403
    query("UPDATE users SET last_login_at=NOW() WHERE id=%s", (user["id"],))
    log_activity(user["id"], "login", f"{user['role']} login")
    token = create_token(user)
    print_login_debug(user, token)
    return jsonify({"message": "Login successful", "token": token, "access_token": token, "user": public_user(user)})


@app.post("/api/admin/login")
@app.post("/admin/login")
def admin_login():
    data = request_data()
    user = query("SELECT * FROM users WHERE email=%s", (data.get("email"),), fetch=True, one=True)
    if not user:
        return jsonify({"message": "Invalid email or password"}), 401
    user["role"] = normalize_role(user.get("role"))
    superadmin_password = os.getenv("SUPERADMIN_PASSWORD")
    if user["role"] == "SuperAdmin" and superadmin_password:
        password_valid = data.get("password", "") == superadmin_password
    else:
        password_valid = verify_password(user["password_hash"], data.get("password", ""))
    if not password_valid:
        return jsonify({"message": "Invalid email or password"}), 401
    if user.get("account_status") == "Suspended":
        return jsonify({"message": "403 Forbidden"}), 403
    if user["role"] not in ADMIN_ROLES:
        return jsonify({"message": "403 Forbidden"}), 403
    query("UPDATE users SET last_login_at=NOW() WHERE id=%s", (user["id"],))
    log_activity(user["id"], "login", f"{user['role']} login")
    token = create_token(user)
    print_login_debug(user, token)
    return jsonify({"message": "Admin login successful", "token": token, "access_token": token, "user": public_user(user)})


@app.get("/api/auth/me")
@auth_required("Farmer", "Buyer", "Admin", "SuperAdmin")
def auth_me():
    return jsonify({"user": public_user(request.user)})


@app.get("/api/products")
@app.get("/products")
def get_products():
    user = None
    try:
        user = current_user(optional=True)
    except BadSignature:
        user = None
    scope = request.args.get("scope")
    if scope == "farmer" and user:
        rows = query(
            """
            SELECT p.*, u.name AS farmer_name, u.village, u.district, u.state,
                   COALESCE(AVG(r.rating), 0) AS rating,
                   COUNT(DISTINCT o.id) AS orders_count
            FROM products p JOIN users u ON u.id=p.farmer_id
            LEFT JOIN reviews r ON r.product_id=p.id
            LEFT JOIN orders o ON o.product_id=p.id
            WHERE p.farmer_id=%s
            GROUP BY p.id, u.id
            ORDER BY p.id DESC
            """,
            (user["id"],),
            fetch=True,
        )
    else:
        rows = query(
            """
            SELECT p.*, u.name AS farmer_name, u.village, u.district, u.state,
                   COALESCE(AVG(r.rating), 0) AS rating,
                   COUNT(DISTINCT o.id) AS orders_count
            FROM products p JOIN users u ON u.id=p.farmer_id
            LEFT JOIN reviews r ON r.product_id=p.id
            LEFT JOIN orders o ON o.product_id=p.id
            WHERE p.status='Available' AND p.quantity > 0
            GROUP BY p.id, u.id
            ORDER BY p.id DESC
            """,
            fetch=True,
        )
    return jsonify(attach_product_images(rows))


@app.get("/api/products/nearby")
@auth_required("Farmer", "Buyer", "Admin", "SuperAdmin")
def nearby_products():
    lat = number_or_none(request.args.get("lat")) or number_or_none(request.user.get("latitude"))
    lng = number_or_none(request.args.get("lng")) or number_or_none(request.user.get("longitude"))
    radius = number_or_none(request.args.get("radius")) or 50
    if lat is None or lng is None:
        return jsonify({"message": "Location required to find nearby products."}), 400
    rows = query(
        """
        SELECT
          p.*,
          u.name AS farmer_name,
          u.phone AS farmer_phone,
          u.village,
          u.district,
          u.state,
          u.latitude,
          u.longitude,
          COALESCE(AVG(r.rating), 0) AS rating,
          COUNT(DISTINCT o.id) AS orders_count,
          ROUND(6371 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(%s)) * COS(RADIANS(u.latitude)) *
              COS(RADIANS(u.longitude) - RADIANS(%s)) +
              SIN(RADIANS(%s)) * SIN(RADIANS(u.latitude))
            ))
          ), 2) AS distance_km
        FROM products p
        JOIN users u ON u.id=p.farmer_id
        LEFT JOIN reviews r ON r.product_id=p.id
        LEFT JOIN orders o ON o.product_id=p.id
        WHERE p.status='Available'
          AND p.quantity > 0
          AND u.latitude IS NOT NULL
          AND u.longitude IS NOT NULL
        GROUP BY p.id, u.id
        HAVING distance_km <= %s
        ORDER BY distance_km ASC, p.id DESC
        """,
        (lat, lng, lat, radius),
        fetch=True,
    )
    return jsonify(attach_product_images(rows))


@app.get("/api/products/my")
@jwt_required()
@auth_required("Farmer")
def my_products():
    rows = query(
        """
        SELECT p.*, u.name AS farmer_name, u.village, u.district, u.state,
               COALESCE(AVG(r.rating), 0) AS rating,
               COUNT(DISTINCT o.id) AS orders_count
        FROM products p JOIN users u ON u.id=p.farmer_id
        LEFT JOIN reviews r ON r.product_id=p.id
        LEFT JOIN orders o ON o.product_id=p.id
        WHERE p.farmer_id=%s
        GROUP BY p.id, u.id
        ORDER BY p.id DESC
        """,
        (request.user["id"],),
        fetch=True,
    )
    return jsonify(attach_product_images(rows))


@app.get("/api/products/<int:product_id>")
@app.get("/products/<int:product_id>")
def get_product(product_id):
    product = query(
        """
        SELECT p.*, u.name AS farmer_name, u.phone AS farmer_phone, u.village, u.district, u.state, u.latitude, u.longitude,
               COALESCE(AVG(r.rating), 0) AS rating,
               COUNT(DISTINCT o.id) AS orders_count
        FROM products p JOIN users u ON u.id=p.farmer_id
        LEFT JOIN reviews r ON r.product_id=p.id
        LEFT JOIN orders o ON o.product_id=p.id
        WHERE p.id=%s
        GROUP BY p.id, u.id
        """,
        (product_id,),
        fetch=True,
        one=True,
    )
    if not product:
        return jsonify({"message": "Product not found"}), 404
    return jsonify(attach_product_images(product))


@app.post("/api/products")
@app.post("/products")
@app.post("/add-product")
@jwt_required()
@auth_required("Farmer")
def add_product():
    data = request.form if request.form else request.get_json(force=True)
    images = save_uploads("images")
    single_image = save_upload("image")
    if single_image:
        images.insert(0, single_image)
    image = images[0] if images else None
    crop_name = (data.get("crop_name") or "").strip()
    location = (data.get("location") or "").strip()
    quantity = int(data.get("quantity", 0))
    price = float(data.get("price", 0))
    unit = data.get("unit") or "Kg"
    status = data.get("status") or ("Available" if quantity > 0 else "Sold Out")
    farmer_id = request.user.get("id")
    if not farmer_id:
        return jsonify({"message": "Unauthorized"}), 401
    if not crop_name or quantity < 0 or price < 0 or not location:
        return jsonify({"message": "Crop name, valid stock, price and location are required."}), 400
    app.logger.info(
        "Product insert requested: farmer_id=%s crop=%s quantity=%s price=%s",
        farmer_id,
        crop_name,
        quantity,
        price,
    )
    query(
        """
        INSERT INTO products (farmer_id, crop_name, category, quantity, price, unit, location, description, image, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (farmer_id, crop_name, data.get("category"), quantity, price, unit, location, data.get("description"), image, status),
    )
    product = query("SELECT * FROM products WHERE farmer_id=%s ORDER BY id DESC LIMIT 1", (farmer_id,), fetch=True, one=True)
    for index, image_path in enumerate(images):
        query(
            "INSERT INTO product_images (product_id, image_path, is_primary) VALUES (%s, %s, %s)",
            (product["id"], image_path, index == 0),
        )
    attach_product_images(product)
    app.logger.info("Product inserted: %s", product)
    return jsonify({"message": "Product added successfully", "product": product}), 201


@app.put("/api/products/<int:product_id>")
@app.put("/products/<int:product_id>")
@app.put("/update-product/<int:product_id>")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def update_product(product_id):
    data = request_data()
    product = query("SELECT * FROM products WHERE id=%s", (product_id,), fetch=True, one=True)
    if not product:
        return jsonify({"message": "Product not found"}), 404
    if not role_in(request.user, ADMIN_ROLES) and product["farmer_id"] != request.user["id"]:
        return jsonify({"message": "403 Forbidden"}), 403
    quantity = int(data.get("quantity", data.get("stock", product["quantity"])))
    price = float(data.get("price", product["price"]))
    unit = data.get("unit") or product.get("unit") or "Kg"
    status = data.get("status") or ("Available" if quantity > 0 else "Sold Out")
    crop_name = (data.get("crop_name", product["crop_name"]) or "").strip()
    location = (data.get("location", product["location"]) or "").strip()
    if not crop_name or not location:
        return jsonify({"message": "Crop name and location are required."}), 400
    images = save_uploads("images")
    single_image = save_upload("image")
    if single_image:
        images.insert(0, single_image)
    primary_image = images[0] if images else product.get("image")
    query(
        """
        UPDATE products
        SET crop_name=%s, category=%s, quantity=%s, price=%s, unit=%s, location=%s, description=%s, image=%s, status=%s
        WHERE id=%s
        """,
        (
            crop_name,
            data.get("category", product.get("category")),
            quantity,
            price,
            unit,
            location,
            data.get("description", product.get("description") or ""),
            primary_image,
            status,
            product_id,
        ),
    )
    if images:
        query("DELETE FROM product_images WHERE product_id=%s", (product_id,))
        for index, image_path in enumerate(images):
            query(
                "INSERT INTO product_images (product_id, image_path, is_primary) VALUES (%s, %s, %s)",
                (product_id, image_path, index == 0),
            )
    updated = query("SELECT * FROM products WHERE id=%s", (product_id,), fetch=True, one=True)
    return jsonify({"message": "Product updated successfully", "product": attach_product_images(updated)})


@app.delete("/api/products/<int:product_id>")
@app.delete("/products/<int:product_id>")
@app.delete("/delete-product/<int:product_id>")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def delete_product(product_id):
    product = query("SELECT * FROM products WHERE id=%s", (product_id,), fetch=True, one=True)
    if not product:
        return jsonify({"message": "Product not found"}), 404
    if not role_in(request.user, ADMIN_ROLES) and product["farmer_id"] != request.user["id"]:
        return jsonify({"message": "403 Forbidden"}), 403
    query("DELETE FROM product_images WHERE product_id=%s", (product_id,))
    query("DELETE FROM products WHERE id=%s", (product_id,))
    return jsonify({"message": "Product deleted successfully"})


@app.post("/api/orders")
@app.post("/orders")
@app.post("/place-order")
@jwt_required()
@auth_required("Buyer")
def place_order():
    data = request.get_json(force=True)
    product = query("SELECT * FROM products WHERE id=%s", (data["product_id"],), fetch=True, one=True)
    if not product:
        return jsonify({"message": "Product not found"}), 404
    quantity = int(data.get("quantity", 1))
    if quantity <= 0:
        return jsonify({"message": "Quantity must be greater than zero."}), 400
    if int(product["quantity"]) < quantity:
        return jsonify({"message": "Insufficient stock"}), 400
    total = float(product["price"]) * quantity
    payment_method = data.get("payment_method", "Pay Later")
    if payment_method not in {"Pay Later", "Cash on Delivery"}:
        return jsonify({"message": "Payment method must be Pay Later or Cash on Delivery."}), 400
    delivery_address = data.get("delivery_address") or location_label(request.user) or request.user.get("address")
    query(
        """
        INSERT INTO orders (product_id, farmer_id, buyer_id, crop_name, quantity, total_price, status, payment_status, delivery_address, payment_method)
        VALUES (%s, %s, %s, %s, %s, %s, 'Pending', 'Pending', %s, %s)
        """,
        (product["id"], product["farmer_id"], request.user["id"], product["crop_name"], quantity, total, delivery_address, payment_method),
    )
    order = query(
        """
        SELECT id FROM orders
        WHERE product_id=%s AND buyer_id=%s
        ORDER BY id DESC
        LIMIT 1
        """,
        (product["id"], request.user["id"]),
        fetch=True,
        one=True,
    )
    query(
        """
        INSERT INTO order_items (order_id, product_id, farmer_id, crop_name, quantity, unit_price, total_price)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (order["id"], product["id"], product["farmer_id"], product["crop_name"], quantity, product["price"], total),
    )
    query(
        """
        INSERT INTO payments (order_id, buyer_id, farmer_id, amount, payment_method, payment_status)
        VALUES (%s, %s, %s, %s, %s, 'Pending')
        """,
        (order["id"], request.user["id"], product["farmer_id"], total, payment_method),
    )
    query("UPDATE products SET quantity=quantity-%s, status=IF(quantity-%s<=0, 'Sold Out', 'Available') WHERE id=%s", (quantity, quantity, product["id"]))
    create_notification(
        product["farmer_id"],
        "New Order",
        f"{request.user['name']} ordered {quantity} Kg of {product['crop_name']}.",
    )
    return jsonify({"message": "Order placed successfully", "order_id": order["id"]}), 201


@app.get("/api/orders")
@app.get("/orders")
@jwt_required()
@auth_required("Farmer", "Buyer", "Admin", "SuperAdmin")
def get_orders():
    scope = request.args.get("scope")
    where = ""
    params = ()
    if scope == "farmer" and not role_in(request.user, ADMIN_ROLES):
        where = "WHERE o.farmer_id=%s"
        params = (request.user["id"],)
    elif scope == "buyer" and not role_in(request.user, ADMIN_ROLES):
        where = "WHERE o.buyer_id=%s"
        params = (request.user["id"],)
    rows = query(
        f"""
        SELECT o.*, buyer.name AS buyer_name, buyer.phone AS buyer_phone, farmer.name AS farmer_name
        FROM orders o
        JOIN users buyer ON buyer.id=o.buyer_id
        JOIN users farmer ON farmer.id=o.farmer_id
        {where}
        ORDER BY o.id DESC
        """,
        params,
        fetch=True,
    )
    return jsonify(rows)


@app.get("/api/orders/buyer")
@jwt_required()
@auth_required("Buyer", "Admin", "SuperAdmin")
def get_buyer_orders():
    rows = query(
        """
        SELECT o.*, buyer.name AS buyer_name, buyer.phone AS buyer_phone, farmer.name AS farmer_name
        FROM orders o
        JOIN users buyer ON buyer.id=o.buyer_id
        JOIN users farmer ON farmer.id=o.farmer_id
        WHERE o.buyer_id=%s OR %s
        ORDER BY o.id DESC
        """,
        (request.user["id"], role_in(request.user, ADMIN_ROLES)),
        fetch=True,
    )
    return jsonify(rows)


@app.get("/api/orders/farmer")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def get_farmer_orders():
    rows = query(
        """
        SELECT o.*, buyer.name AS buyer_name, buyer.phone AS buyer_phone, farmer.name AS farmer_name
        FROM orders o
        JOIN users buyer ON buyer.id=o.buyer_id
        JOIN users farmer ON farmer.id=o.farmer_id
        WHERE o.farmer_id=%s OR %s
        ORDER BY o.id DESC
        """,
        (request.user["id"], role_in(request.user, ADMIN_ROLES)),
        fetch=True,
    )
    return jsonify(rows)


@app.put("/api/orders/<int:order_id>/status")
@app.put("/orders/<int:order_id>")
@app.put("/update-order-status/<int:order_id>")
@jwt_required()
@auth_required("Farmer", "Buyer", "Admin", "SuperAdmin")
def update_order_status(order_id):
    data = request.get_json(force=True)
    next_status = data.get("status")
    allowed_statuses = {"Pending", "Accepted", "Rejected", "Packed", "Shipped", "Delivered", "Cancelled"}
    if next_status not in allowed_statuses:
        return jsonify({"message": "Invalid order status"}), 400
    order = query("SELECT * FROM orders WHERE id=%s", (order_id,), fetch=True, one=True)
    if not order:
        return jsonify({"message": "Order not found"}), 404
    is_buyer_cancel = role_in(request.user, ["Buyer"]) and order["buyer_id"] == request.user["id"] and next_status == "Cancelled"
    if is_buyer_cancel and order["status"] in ["Shipped", "Delivered"]:
        return jsonify({"message": "Order cannot be cancelled after shipping."}), 400
    if not is_buyer_cancel and not role_in(request.user, ADMIN_ROLES) and order["farmer_id"] != request.user["id"]:
        return jsonify({"message": "403 Forbidden"}), 403
    timestamp_column = {
        "Accepted": "accepted_at",
        "Packed": "packed_at",
        "Shipped": "shipped_at",
        "Delivered": "delivered_at",
    }.get(next_status)
    if timestamp_column:
        query(f"UPDATE orders SET status=%s, {timestamp_column}=NOW() WHERE id=%s", (next_status, order_id))
    else:
        query("UPDATE orders SET status=%s WHERE id=%s", (next_status, order_id))
    create_notification(
        order["buyer_id"],
        "Order Status Updated",
        f"Your {order['crop_name']} order is {next_status}.",
    )
    return jsonify({"message": "Order status updated successfully"})


@app.put("/api/payments/<int:order_id>/mark-paid")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def mark_payment_paid(order_id):
    order = query("SELECT * FROM orders WHERE id=%s", (order_id,), fetch=True, one=True)
    if not order:
        return jsonify({"message": "Order not found"}), 404
    if not role_in(request.user, ADMIN_ROLES) and order["farmer_id"] != request.user["id"]:
        return jsonify({"message": "403 Forbidden"}), 403
    if order["status"] in ["Pending", "Rejected", "Cancelled"]:
        return jsonify({"message": "Only accepted or delivered orders can be marked paid."}), 400
    if order.get("payment_method") == "Cash on Delivery" and order["status"] != "Delivered":
        return jsonify({"message": "Cash on Delivery can be collected only after delivery."}), 400

    transaction_id = f"COD-{order_id}" if order.get("payment_method") == "Cash on Delivery" else f"PAYLATER-{order_id}"
    query(
        """
        UPDATE orders
        SET payment_status='Paid'
        WHERE id=%s
        """,
        (order_id,),
    )
    query(
        """
        UPDATE payments
        SET payment_status='Paid', transaction_id=%s, paid_at=NOW()
        WHERE order_id=%s
        """,
        (transaction_id, order_id),
    )
    existing_payment = query("SELECT id FROM payments WHERE order_id=%s", (order_id,), fetch=True, one=True)
    if not existing_payment:
        query(
            """
            INSERT INTO payments (order_id, buyer_id, farmer_id, amount, payment_method, payment_status, transaction_id, paid_at)
            VALUES (%s, %s, %s, %s, %s, 'Paid', %s, NOW())
            """,
            (order_id, order["buyer_id"], order["farmer_id"], order["total_price"], order.get("payment_method") or "Pay Later", transaction_id),
        )
    create_notification(
        order["buyer_id"],
        "Payment Updated",
        f"Payment for your {order['crop_name']} order has been marked Paid.",
    )
    payment = query("SELECT * FROM payments WHERE order_id=%s", (order_id,), fetch=True, one=True)
    return jsonify({"message": "Payment marked as paid", "payment": payment})


@app.get("/api/payments")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def payments():
    status = request.args.get("status")
    where = []
    params = []
    if not role_in(request.user, ADMIN_ROLES):
        where.append("p.farmer_id=%s")
        params.append(request.user["id"])
    if status in ["Paid", "Pending"]:
        where.append("p.payment_status=%s")
        params.append(status)
    where_clause = f"WHERE {' AND '.join(where)}" if where else ""
    rows = query(
        f"""
        SELECT
          p.order_id, buyer.name AS buyer, farmer.name AS farmer,
          p.amount, p.payment_method, p.payment_status, p.transaction_id,
          o.status AS order_status, p.created_at
        FROM payments p
        LEFT JOIN orders o ON o.id=p.order_id
        LEFT JOIN users buyer ON buyer.id=p.buyer_id
        LEFT JOIN users farmer ON farmer.id=p.farmer_id
        {where_clause}
        ORDER BY p.id DESC
        """,
        tuple(params),
        fetch=True,
    )
    return jsonify(rows)


@app.post("/api/cart")
@jwt_required()
@auth_required("Buyer")
def add_to_cart():
    data = request.get_json(force=True)
    product_id = data.get("product_id")
    quantity = int(data.get("quantity", 1))
    product = query("SELECT id, quantity FROM products WHERE id=%s AND status='Available'", (product_id,), fetch=True, one=True)
    if not product:
        return jsonify({"message": "Product not available."}), 404
    if quantity <= 0 or quantity > int(product["quantity"]):
        return jsonify({"message": "Invalid quantity."}), 400
    query(
        """
        INSERT INTO cart (buyer_id, product_id, quantity)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)
        """,
        (request.user["id"], product_id, quantity),
    )
    return jsonify({"message": "Added to cart"})


@app.get("/api/cart")
@jwt_required()
@auth_required("Buyer")
def get_cart():
    rows = query(
        """
        SELECT c.id AS cart_id, c.quantity AS cart_quantity, p.*, u.name AS farmer_name, u.village, u.district
        FROM cart c
        JOIN products p ON p.id=c.product_id
        JOIN users u ON u.id=p.farmer_id
        WHERE c.buyer_id=%s
        ORDER BY c.updated_at DESC
        """,
        (request.user["id"],),
        fetch=True,
    )
    return jsonify(attach_product_images(rows))


@app.delete("/api/cart/<int:cart_id>")
@jwt_required()
@auth_required("Buyer")
def remove_cart_item(cart_id):
    query("DELETE FROM cart WHERE id=%s AND buyer_id=%s", (cart_id, request.user["id"]))
    return jsonify({"message": "Removed from cart"})


@app.post("/reviews")
@app.post("/add-review")
@auth_required("Buyer")
def add_review():
    data = request.get_json(force=True)
    query(
        "INSERT INTO reviews (product_id, buyer_id, rating, review) VALUES (%s, %s, %s, %s)",
        (data["product_id"], request.user["id"], data["rating"], data["review"]),
    )
    return jsonify({"message": "Review added successfully"}), 201


@app.get("/reviews/<int:product_id>")
def get_reviews(product_id):
    return jsonify(query(
        """
        SELECT r.*, u.name AS reviewer_name
        FROM reviews r JOIN users u ON u.id=r.buyer_id
        WHERE r.product_id=%s ORDER BY r.id DESC
        """,
        (product_id,),
        fetch=True,
    ))


@app.put("/api/auth/profile")
@app.put("/api/profile")
@app.put("/api/profile/update")
@app.put("/profile")
@jwt_required()
@auth_required("Farmer", "Buyer", "Admin", "SuperAdmin")
def update_profile():
    data = request_data()
    profile_image = (
        save_upload("profile_image")
        or save_upload("profile_photo")
        or data.get("profile_image")
        or data.get("profile_photo")
        or request.user.get("profile_image")
    )
    query(
        """
        UPDATE users
        SET name=%s, phone=%s, address=%s, village=%s, district=%s, state=%s, latitude=%s, longitude=%s, profile_image=%s
        WHERE id=%s
        """,
        (
            data.get("name") or request.user.get("name"),
            data.get("phone"),
            data.get("address"),
            data.get("village"),
            data.get("district"),
            data.get("state"),
            number_or_none(data.get("latitude")),
            number_or_none(data.get("longitude")),
            profile_image,
            request.user["id"],
        ),
    )
    user = query("SELECT * FROM users WHERE id=%s", (request.user["id"],), fetch=True, one=True)
    return jsonify({"user": public_user(user)})


@app.put("/api/auth/location")
@app.put("/api/users/location")
@app.put("/users/location")
@jwt_required()
@auth_required("Farmer", "Buyer", "Admin", "SuperAdmin")
def update_user_location():
    data = request.get_json(force=True)
    lat = number_or_none(data.get("latitude"))
    lng = number_or_none(data.get("longitude"))
    if lat is None or lng is None:
        return jsonify({"message": "Valid latitude and longitude are required."}), 400
    query(
        """
        UPDATE users
        SET latitude=%s, longitude=%s, village=COALESCE(%s, village), district=COALESCE(%s, district), state=COALESCE(%s, state)
        WHERE id=%s
        """,
        (lat, lng, data.get("village"), data.get("district"), data.get("state"), request.user["id"]),
    )
    user = query("SELECT * FROM users WHERE id=%s", (request.user["id"],), fetch=True, one=True)
    return jsonify({"message": "Location updated", "user": public_user(user)})


@app.get("/api/reports/profit")
@app.get("/reports/profit")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def profit_report():
    summary = revenue_summary(request.user)
    scope_clause = "" if role_in(request.user, ADMIN_ROLES) else " AND farmer_id=%s"
    params = () if role_in(request.user, ADMIN_ROLES) else (request.user["id"],)
    payment_clause = "" if role_in(request.user, ADMIN_ROLES) else " AND p.farmer_id=%s"
    payment_params = () if role_in(request.user, ADMIN_ROLES) else (request.user["id"],)
    sold = query(
        f"""
        SELECT COALESCE(SUM(quantity), 0) AS sold_quantity
        FROM orders WHERE status IN ('Accepted', 'Packed', 'Shipped', 'Delivered') {scope_clause}
        """,
        params,
        fetch=True,
        one=True,
    )
    monthly = query(
        f"""
        SELECT DATE_FORMAT(p.created_at, '%Y-%m') AS month, COALESCE(SUM(p.amount), 0) AS value
        FROM payments p
        WHERE p.payment_status='Paid' {payment_clause}
        GROUP BY DATE_FORMAT(p.created_at, '%Y-%m')
        ORDER BY month ASC
        """,
        tuple(payment_params),
        fetch=True,
    )
    crop_revenue = query(
        f"""
        SELECT o.crop_name, COALESCE(SUM(p.amount), 0) AS value
        FROM payments p
        JOIN orders o ON o.id=p.order_id
        WHERE p.payment_status='Paid' {payment_clause}
        GROUP BY o.crop_name
        ORDER BY value DESC
        LIMIT 8
        """,
        tuple(payment_params),
        fetch=True,
    )
    return jsonify({
        **summary,
        "sold_quantity": sold["sold_quantity"],
        "expenses": 0,
        "net_profit": float(summary["actual_revenue"] or 0),
        "monthly_sales": monthly,
        "crop_revenue": crop_revenue,
    })


@app.get("/api/revenue")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def revenue():
    return jsonify(revenue_summary(request.user))


@app.get("/api/weather")
@app.get("/api/weather/current")
@jwt_required()
@auth_required("Farmer", "Buyer", "Admin", "SuperAdmin")
def current_weather():
    lat = number_or_none(request.args.get("lat")) or number_or_none(request.user.get("latitude"))
    lng = (
        number_or_none(request.args.get("lon"))
        or number_or_none(request.args.get("lng"))
        or number_or_none(request.user.get("longitude"))
    )
    city = (request.args.get("city") or "").strip() or user_weather_city(request.user)

    if (lat is None or lng is None) and not city:
        return jsonify({"message": "Please update profile location."}), 400

    api_key = os.getenv("WEATHER_API_KEY", "").strip()

    print("Weather API Loaded:", "YES" if api_key else "NO")
    print(
        "Weather Request:",
        "user=", request.user.get("name"),
        "lat=", lat,
        "lng=", lng,
        "city=", city
    )

    if not api_key:
        return jsonify({"message": "Weather API key not configured."}), 503

    cache_key = openweather_cache_key(lat, lng, city)
    cached = weather_cache.get(cache_key)
    if cached and time.time() - cached["created_at"] < WEATHER_CACHE_SECONDS:
        return jsonify({**cached["data"], "cached": True})

    params_data = {
        "appid": api_key,
        "units": "metric",
    }

    location = location_label(request.user)

    if lat is not None and lng is not None:
        params_data.update({
            "lat": lat,
            "lon": lng,
        })
    else:
        params_data["q"] = city
        location = city

    params = urlencode(params_data)

    try:
        req = Request(
            f"https://api.openweathermap.org/data/2.5/weather?{params}",
            headers={"User-Agent": "FarmersMarketDirectAI/1.0"},
        )

        with urlopen(req, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))

    except HTTPError as error:
        details = error.read().decode("utf-8", errors="ignore")
        print("OpenWeather HTTPError:", error.code, details)

        if error.code == 401:
            return jsonify({
                "message": "Weather API key is invalid or not active yet.",
                "details": details,
            }), 502

        if error.code == 404:
            return jsonify({
                "message": "Weather location not found. Please update profile location.",
                "details": details,
            }), 404

        return jsonify({
            "message": "Weather service returned an error. Please try again later.",
            "details": details,
        }), 502

    except (URLError, TimeoutError, ValueError) as error:
        print("OpenWeather Error:", str(error))
        return jsonify({
            "message": "Weather unavailable. Please try again later.",
            "details": str(error),
        }), 502

    weather_data = parse_openweather_payload(payload, location)
    weather_cache[cache_key] = {
        "created_at": time.time(),
        "data": weather_data,
    }

    query(
        """
        INSERT INTO weather_logs
        (user_id, temperature, humidity, wind_speed, rain_probability, condition_text, suggestion)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            request.user["id"],
            weather_data["temperature"],
            weather_data["humidity"],
            weather_data["wind_speed"],
            weather_data["rain_probability"],
            weather_data["weather_condition"],
            weather_data["suggestion"],
        ),
    )

    return jsonify({**weather_data, "cached": False})
@app.post("/api/transport/create")
@app.post("/transport-requests")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def create_transport_request():
    if not role_in(request.user, ["Farmer"]):
        return jsonify({"message": "403 Forbidden"}), 403
    data = request.get_json(force=True)
    required = ["destination", "crop_name", "quantity", "travel_date", "estimated_total_cost"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        return jsonify({"message": "Missing required fields", "missing": missing}), 400
    lat = number_or_none(data.get("latitude")) or number_or_none(request.user.get("latitude"))
    lng = number_or_none(data.get("longitude")) or number_or_none(request.user.get("longitude"))
    if lat is None or lng is None:
        return jsonify({"message": "Save your GPS location before creating transport sharing."}), 400
    query(
        """
        INSERT INTO transport_requests (
          farmer_id, origin_village, origin_district, destination, crop_name, quantity, vehicle_type,
          travel_date, estimated_total_cost, max_farmers, status, latitude, longitude
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Open', %s, %s)
        """,
        (
            request.user["id"],
            data.get("origin_village") or request.user.get("village"),
            data.get("origin_district") or request.user.get("district"),
            data.get("destination"),
            data.get("crop_name"),
            int(data.get("quantity", 0)),
            data.get("vehicle_type"),
            data.get("travel_date"),
            float(data.get("estimated_total_cost", 0)),
            int(data.get("max_farmers", 4)),
            lat,
            lng,
        ),
    )
    transport = query("SELECT id FROM transport_requests WHERE farmer_id=%s ORDER BY id DESC LIMIT 1", (request.user["id"],), fetch=True, one=True)
    query("INSERT IGNORE INTO transport_members (transport_id, farmer_id) VALUES (%s, %s)", (transport["id"], request.user["id"]))
    return jsonify({"message": "Transport request saved", "transport_id": transport["id"]}), 201


@app.get("/api/transport/nearby")
@app.get("/transport-requests")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def nearby_transport_requests():
    lat = number_or_none(request.args.get("lat")) or number_or_none(request.user.get("latitude"))
    lng = number_or_none(request.args.get("lng")) or number_or_none(request.user.get("longitude"))
    radius = number_or_none(request.args.get("radius")) or 25
    destination = (request.args.get("destination") or "").strip()
    travel_date = (request.args.get("date") or "").strip()
    if lat is None or lng is None:
        return jsonify({"message": "Location required to find nearby transport."}), 400
    filters = ["tr.status='Open'", "tr.latitude IS NOT NULL", "tr.longitude IS NOT NULL"]
    params = [lat, lng, lat]
    if destination:
        filters.append("tr.destination LIKE %s")
        params.append(f"%{destination}%")
    if travel_date:
        filters.append("ABS(DATEDIFF(tr.travel_date, %s)) <= 1")
        params.append(travel_date)
    params.append(radius)
    rows = query(
        f"""
        SELECT
          tr.*,
          u.name AS farmer_name,
          u.phone AS farmer_phone,
          u.profile_image,
          COUNT(tm.id) AS members_count,
          ROUND(tr.estimated_total_cost / GREATEST(COUNT(tm.id), 1), 2) AS cost_per_farmer,
          ROUND(6371 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(%s)) * COS(RADIANS(tr.latitude)) *
              COS(RADIANS(tr.longitude) - RADIANS(%s)) +
              SIN(RADIANS(%s)) * SIN(RADIANS(tr.latitude))
            ))
          ), 2) AS distance_km
        FROM transport_requests tr
        JOIN users u ON u.id=tr.farmer_id
        LEFT JOIN transport_members tm ON tm.transport_id=tr.id
        WHERE {" AND ".join(filters)}
        GROUP BY tr.id, u.id
        HAVING distance_km <= %s
        ORDER BY distance_km ASC, tr.travel_date ASC
        """,
        tuple(params),
        fetch=True,
    )
    return jsonify(rows)


@app.post("/api/transport/join/<int:transport_id>")
@jwt_required()
@auth_required("Farmer")
def join_transport(transport_id):
    transport = query(
        """
        SELECT tr.*, COUNT(tm.id) AS members_count
        FROM transport_requests tr
        LEFT JOIN transport_members tm ON tm.transport_id=tr.id
        WHERE tr.id=%s
        GROUP BY tr.id
        """,
        (transport_id,),
        fetch=True,
        one=True,
    )
    if not transport:
        return jsonify({"message": "Transport request not found."}), 404
    if transport["status"] != "Open":
        return jsonify({"message": "This transport request is closed."}), 400
    if int(transport["members_count"] or 0) >= int(transport.get("max_farmers") or 4):
        return jsonify({"message": "Transport sharing is full."}), 400
    existing = query("SELECT id FROM transport_members WHERE transport_id=%s AND farmer_id=%s", (transport_id, request.user["id"]), fetch=True, one=True)
    if existing:
        return jsonify({"message": "You already joined this transport."}), 409
    query("INSERT INTO transport_members (transport_id, farmer_id) VALUES (%s, %s)", (transport_id, request.user["id"]))
    if transport["farmer_id"] != request.user["id"]:
        create_notification(
            transport["farmer_id"],
            "Transport Joined",
            f"{request.user['name']} joined your transport to {transport['destination']}.",
        )
    return jsonify({"message": "Joined transport successfully."})


@app.get("/api/transport/my")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def my_transport_requests():
    rows = query(
        """
        SELECT
          tr.*,
          u.name AS farmer_name,
          u.phone AS farmer_phone,
          COUNT(tm_all.id) AS members_count,
          ROUND(tr.estimated_total_cost / GREATEST(COUNT(tm_all.id), 1), 2) AS cost_per_farmer,
          IF(tr.farmer_id=%s, 'created', 'joined') AS relation
        FROM transport_requests tr
        JOIN users u ON u.id=tr.farmer_id
        LEFT JOIN transport_members tm_all ON tm_all.transport_id=tr.id
        LEFT JOIN transport_members tm_me ON tm_me.transport_id=tr.id AND tm_me.farmer_id=%s
        WHERE tr.farmer_id=%s OR tm_me.id IS NOT NULL
        GROUP BY tr.id, u.id
        ORDER BY tr.travel_date DESC, tr.id DESC
        """,
        (request.user["id"], request.user["id"], request.user["id"]),
        fetch=True,
    )
    return jsonify(rows)


@app.get("/api/nearby-farmers")
@app.get("/farmers/nearby")
@jwt_required()
@auth_required("Farmer", "Buyer", "Admin", "SuperAdmin")
def nearby_farmers():
    lat = number_or_none(request.args.get("lat")) or number_or_none(request.user.get("latitude"))
    lng = number_or_none(request.args.get("lng")) or number_or_none(request.user.get("longitude"))
    radius = number_or_none(request.args.get("radius")) or 25
    if lat is None or lng is None:
        return jsonify({"message": "Location required to find nearby farmers."}), 400
    rows = query(
        """
        SELECT
          u.id AS farmer_id,
          u.name,
          u.phone,
          u.village,
          u.district,
          u.state,
          u.latitude,
          u.longitude,
          u.profile_image,
          GROUP_CONCAT(DISTINCT p.crop_name ORDER BY p.crop_name SEPARATOR ', ') AS crops,
          ROUND(6371 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(%s)) * COS(RADIANS(u.latitude)) *
              COS(RADIANS(u.longitude) - RADIANS(%s)) +
              SIN(RADIANS(%s)) * SIN(RADIANS(u.latitude))
            ))
          ), 2) AS distance_km
        FROM users u
        LEFT JOIN products p ON p.farmer_id=u.id AND p.status='Available' AND p.quantity > 0
        WHERE u.role IN ('Farmer', 'farmer') AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
        GROUP BY u.id
        HAVING distance_km <= %s
        ORDER BY distance_km ASC
        """,
        (lat, lng, lat, radius),
        fetch=True,
    )
    for row in rows:
        row["available_crops"] = [crop for crop in (row.get("crops") or "").split(", ") if crop]
        row["phone_digits"] = clean_phone(row.get("phone"))
    return jsonify(rows)


@app.get("/api/notifications")
@app.get("/notifications")
@auth_required("Farmer", "Buyer", "Admin", "SuperAdmin")
def notifications():
    return jsonify(query("SELECT * FROM notifications WHERE user_id=%s ORDER BY id DESC", (request.user["id"],), fetch=True))


@app.put("/api/notifications/<int:notification_id>/read")
@app.put("/notifications/<int:notification_id>/read")
@auth_required("Farmer", "Buyer", "Admin", "SuperAdmin")
def mark_notification_read(notification_id):
    query("UPDATE notifications SET is_read=TRUE WHERE id=%s AND user_id=%s", (notification_id, request.user["id"]))
    return jsonify({"message": "Notification marked as read"})


@app.get("/admin/stats")
@auth_required("Admin", "SuperAdmin")
def admin_stats():
    total_farmers = count_users_by_role("Farmer")
    total_buyers = count_users_by_role("Buyer")
    total_products = query("SELECT COUNT(*) AS value FROM products", fetch=True, one=True)["value"]
    total_orders = query("SELECT COUNT(*) AS value FROM orders", fetch=True, one=True)["value"]
    actual_revenue = query("SELECT COALESCE(SUM(amount), 0) AS value FROM payments WHERE payment_status='Paid'", fetch=True, one=True)["value"]
    estimated_revenue = query(
        """
        SELECT COALESCE(SUM(total_price), 0) AS value
        FROM orders
        WHERE status IN ('Accepted', 'Packed', 'Shipped', 'Delivered') AND payment_status <> 'Paid'
        """,
        fetch=True,
        one=True,
    )["value"]
    recent_orders = query(
        """
        SELECT o.*, buyer.name AS buyer_name, farmer.name AS farmer_name
        FROM orders o
        LEFT JOIN users buyer ON buyer.id=o.buyer_id
        LEFT JOIN users farmer ON farmer.id=o.farmer_id
        ORDER BY o.id DESC
        LIMIT 5
        """,
        fetch=True,
    )
    return jsonify({
        "total_farmers": total_farmers,
        "total_buyers": total_buyers,
        "total_products": total_products,
        "total_orders": total_orders,
        "actual_revenue": actual_revenue,
        "estimated_revenue": estimated_revenue,
        "recent_orders": recent_orders,
    })


def table_exists(table_name):
    try:
        return bool(query("SHOW TABLES LIKE %s", (table_name,), fetch=True, one=True))
    except Exception as e:
        print(f"admin dashboard table check failed for {table_name}: {e}")
        traceback.print_exc()
        return False


def safe_query(sql, params=(), default=None):
    try:
        result = query(sql, params or (), fetch=True)
        if result is None:
            return default
        return result
    except Exception as e:
        print(f"admin dashboard query failed: {e}")
        traceback.print_exc()
        return default


def safe_count(table_name, where_clause="", params=()):
    if not table_exists(table_name):
        print(f"safe_count skipped: missing table {table_name}")
        return 0
    try:
        sql = f"SELECT COUNT(*) AS total FROM {table_name}"
        if where_clause:
            sql += f" WHERE {where_clause}"
        result = query(sql, params or (), fetch=True, one=True)
        return result["total"] if result else 0
    except Exception as e:
        print(f"safe_count failed for {table_name}: {e}")
        traceback.print_exc()
        return 0


def safe_sum(table_name, column, where_clause="", params=()):
    if not table_exists(table_name):
        print(f"safe_sum skipped: missing table {table_name}")
        return 0
    try:
        sql = f"SELECT COALESCE(SUM({column}), 0) AS total FROM {table_name}"
        if where_clause:
            sql += f" WHERE {where_clause}"
        result = query(sql, params or (), fetch=True, one=True)
        return result["total"] if result else 0
    except Exception as e:
        print(f"safe_sum failed for {table_name}.{column}: {e}")
        traceback.print_exc()
        return 0


def safe_count_users_by_role(role, extra_condition=""):
    clause, values = role_in_clause("role", [role])
    return safe_count("users", f"{clause}{extra_condition}", values)


def admin_dashboard_fallback_payload():
    return {
        "actual_revenue": 0,
        "estimated_revenue": 0,
        "pending_payments": 0,
        "revenue": 0,
        "total_revenue": 0,
        "total_users": 0,
        "total_farmers": 0,
        "farmers": 0,
        "verified_farmers": 0,
        "verified_buyers": 0,
        "pending_farmers": 0,
        "pending_buyers": 0,
        "pending_verification": 0,
        "pending_verifications": 0,
        "total_buyers": 0,
        "buyers": 0,
        "total_admins": 0,
        "total_products": 0,
        "products": 0,
        "pending_products": 0,
        "total_orders": 0,
        "orders": 0,
        "payments": 0,
        "complaints": 0,
        "transport_requests": 0,
        "weather_requests": 0,
        "disease_detection_requests": 0,
        "price_predictions": 0,
        "ai_predictions": 0,
        "analytics": 0,
        "ai_usage": 0,
        "daily_active_users": 0,
        "total_ai_price_predictions": 0,
        "total_disease_detection_requests": 0,
        "pending_orders": 0,
        "approved_orders": 0,
        "completed_orders": 0,
        "rejected_orders": 0,
        "accepted_orders": 0,
        "delivered_orders": 0,
        "cancelled_orders": 0,
        "paid_orders": 0,
        "popular_crops": [],
        "most_predicted_crops": [],
        "most_requested_crop_disease_checks": [],
        "top_farmers": [],
        "top_buyers": [],
        "recent_users": [],
        "recent_registrations": [],
        "recent_farmers": [],
        "recent_buyers": [],
        "recent_orders": [],
        "recentOrders": [],
        "recentFarmers": [],
        "recentBuyers": [],
        "recent_products": [],
        "activity_logs": [],
    }


def safe_query(sql, params=(), fetch=True, one=False, default=None):
    try:
        result = query(sql, params, fetch=fetch, one=one)
        if result is None:
            return default if default is not None else ([] if not one else {})
        return result
    except Exception as e:
        print("SAFE_QUERY ERROR:", e)
        traceback.print_exc()
        return default if default is not None else ([] if not one else {})


def safe_count(table, where_clause="", params=()):
    try:
        sql = f"SELECT COUNT(*) AS value FROM {table}"
        if where_clause:
            sql += f" WHERE {where_clause}"
        row = query(sql, params, fetch=True, one=True)
        return row.get("value", 0) if row else 0
    except Exception as e:
        print(f"SAFE_COUNT ERROR {table}:", e)
        return 0


def safe_sum(table, column, where_clause="", params=()):
    try:
        sql = f"SELECT COALESCE(SUM({column}), 0) AS value FROM {table}"
        if where_clause:
            sql += f" WHERE {where_clause}"
        row = query(sql, params, fetch=True, one=True)
        return row.get("value", 0) if row else 0
    except Exception as e:
        print(f"SAFE_SUM ERROR {table}.{column}:", e)
        return 0


def safe_count_users_by_role(role, extra_condition=""):
    return safe_count("users", f"role=%s{extra_condition}", (role,))


def admin_dashboard_payload():
    actual_revenue = safe_sum("payments", "amount", "payment_status='Paid'")
    estimated_revenue = safe_sum("orders", "total_price")
    revenue = (actual_revenue or 0) + (estimated_revenue or 0)

    recent_orders = safe_query("""
        SELECT o.*, buyer.name AS buyer_name, farmer.name AS farmer_name
        FROM orders o
        LEFT JOIN users buyer ON buyer.id=o.buyer_id
        LEFT JOIN users farmer ON farmer.id=o.farmer_id
        ORDER BY o.id DESC
        LIMIT 5
    """, default=[])

    return {
        "total_users": safe_count("users"),
        "total_farmers": safe_count_users_by_role("Farmer"),
        "total_buyers": safe_count_users_by_role("Buyer"),
        "total_admins": safe_count_users_by_role("Admin"),

        "farmers": safe_count_users_by_role("Farmer"),
        "buyers": safe_count_users_by_role("Buyer"),

        "verified_farmers": safe_count_users_by_role("Farmer", " AND is_verified=TRUE"),
        "verified_buyers": safe_count_users_by_role("Buyer", " AND is_verified=TRUE"),
        "pending_farmers": safe_count_users_by_role("Farmer", " AND is_verified=FALSE"),
        "pending_buyers": safe_count_users_by_role("Buyer", " AND is_verified=FALSE"),

        "total_products": safe_count("products"),
        "products": safe_count("products"),
        "pending_products": safe_count("products", "status='Pending'"),

        "total_orders": safe_count("orders"),
        "orders": safe_count("orders"),
        "pending_orders": safe_count("orders", "status='Pending'"),
        "approved_orders": safe_count("orders", "status IN ('Accepted','Delivered')"),
        "completed_orders": safe_count("orders", "status IN ('Accepted','Delivered')"),
        "rejected_orders": safe_count("orders", "status IN ('Rejected','Cancelled')"),

        "actual_revenue": actual_revenue,
        "estimated_revenue": estimated_revenue,
        "pending_payments": safe_sum("orders", "total_price", "payment_status='Pending'"),
        "revenue": revenue,
        "total_revenue": revenue,

        "payments": safe_count("payments"),
        "complaints": safe_count("complaints"),
        "transport_requests": safe_count("transport_requests"),
        "weather_requests": safe_count("weather_logs"),

        "total_ai_price_predictions": safe_count("price_predictions"),
        "total_disease_detection_requests": safe_count("disease_history"),
        "price_predictions": safe_count("price_predictions"),
        "disease_detection_requests": safe_count("disease_history"),
        "ai_usage": safe_count("price_predictions") + safe_count("disease_history"),

        "daily_active_users": safe_count("users", "last_login_at >= NOW() - INTERVAL 1 DAY"),

        "popular_crops": safe_query("""
            SELECT crop_name, COUNT(*) AS value
            FROM products
            GROUP BY crop_name
            ORDER BY value DESC
            LIMIT 5
        """, default=[]),

        "most_predicted_crops": safe_query("""
            SELECT crop_name, COUNT(*) AS value
            FROM price_predictions
            GROUP BY crop_name
            ORDER BY value DESC
            LIMIT 5
        """, default=[]),

        "most_requested_crop_disease_checks": safe_query("""
            SELECT COALESCE(crop_name, 'Unknown') AS crop_name, COUNT(*) AS value
            FROM disease_history
            GROUP BY COALESCE(crop_name, 'Unknown')
            ORDER BY value DESC
            LIMIT 5
        """, default=[]),

        "recent_registrations": safe_query("""
            SELECT id, name, email, role, village, district, created_at
            FROM users
            ORDER BY id DESC
            LIMIT 5
        """, default=[]),

        "recent_orders": recent_orders,
        "recentOrders": recent_orders,
    }


@app.get("/api/admin/dashboard")
@app.get("/api/admin/dashboard-lite")
@app.get("/admin/dashboard")
@auth_required("Admin", "SuperAdmin")
def admin_dashboard_lite():
    return jsonify({
        "total_farmers": 0,
        "total_buyers": 0,
        "total_products": 0,
        "total_orders": 0,
        "revenue": 0,
        "actual_revenue": 0,
        "estimated_revenue": 0,
        "pending_orders": 0,
        "approved_orders": 0,
        "rejected_orders": 0,
        "pending_farmers": 0,
        "pending_products": 0,
        "complaints": 0,
        "transport_requests": 0,
        "total_ai_price_predictions": 0,
        "total_disease_detection_requests": 0,
        "verified_farmers": 0,
        "recent_registrations": [],
        "recent_orders": [],
        "popular_crops": [],
        "most_predicted_crops": [],
        "most_requested_crop_disease_checks": []
    }), 200
    
@app.get("/api/superadmin/users")
@app.get("/api/admin/users")
@auth_required("Admin", "SuperAdmin")
def superadmin_users():
    role = normalize_role(request.args.get("role"))
    params = ()
    where = ""
    if role in VALID_ROLES:
        where = "WHERE role=%s"
        params = (role,)
    return jsonify(query(
        f"""
        SELECT id, name, email, phone, role, account_status AS status, village, district, created_at
        FROM users
        {where}
        ORDER BY id DESC
        """,
        params,
        fetch=True,
    ))


@app.get("/api/superadmin/farmers")
@auth_required("Admin", "SuperAdmin")
def superadmin_farmers():
    clause, values = role_in_clause("u.role", ["Farmer"])
    return jsonify(query(
        f"""
        SELECT
          u.id, u.name, u.email, u.phone, u.village, u.district,
          u.is_verified AS verified_status, u.account_status AS status,
          COUNT(DISTINCT p.id) AS products_count,
          COUNT(DISTINCT o.id) AS orders_count
        FROM users u
        LEFT JOIN products p ON p.farmer_id=u.id
        LEFT JOIN orders o ON o.farmer_id=u.id
        WHERE {clause}
        GROUP BY u.id
        ORDER BY u.id DESC
        """,
        values,
        fetch=True,
    ))


@app.get("/api/superadmin/buyers")
@auth_required("Admin", "SuperAdmin")
def superadmin_buyers():
    clause, values = role_in_clause("u.role", ["Buyer"])
    return jsonify(query(
        f"""
        SELECT
          u.id, u.name, u.email, u.phone, u.village, u.district,
          u.account_status AS status, COUNT(DISTINCT o.id) AS total_orders, u.created_at
        FROM users u
        LEFT JOIN orders o ON o.buyer_id=u.id
        WHERE {clause}
        GROUP BY u.id
        ORDER BY u.id DESC
        """,
        values,
        fetch=True,
    ))


@app.get("/api/superadmin/admins")
@auth_required("Admin", "SuperAdmin")
def superadmin_admins():
    clause, values = role_in_clause("role", ["Admin"])
    return jsonify(query(
        f"""
        SELECT id, name, email, phone, role, account_status AS status, last_login_at, created_at
        FROM users
        WHERE {clause}
        ORDER BY id DESC
        """,
        values,
        fetch=True,
    ))


@app.get("/api/superadmin/verifications")
@auth_required("Admin", "SuperAdmin")
def superadmin_verifications():
    clause, values = role_in_clause("role", ["Farmer", "Buyer"])
    return jsonify(query(
        f"""
        SELECT id, name, email, phone, role, village, district, account_status AS status, created_at
        FROM users
        WHERE {clause} AND is_verified=FALSE
        ORDER BY created_at ASC
        """,
        values,
        fetch=True,
    ))


@app.get("/api/superadmin/products")
@auth_required("Admin", "SuperAdmin")
def superadmin_products():
    return jsonify(query(
        """
        SELECT p.id, p.crop_name, p.category, u.name AS farmer_name, p.price, p.quantity, p.unit,
               p.status, p.location, p.is_featured, p.is_hidden, p.organic_badge, p.created_at
        FROM products p
        LEFT JOIN users u ON u.id=p.farmer_id
        ORDER BY p.id DESC
        """,
        fetch=True,
    ))


@app.get("/api/superadmin/orders")
@auth_required("Admin", "SuperAdmin")
def superadmin_orders():
    return jsonify(query(
        """
        SELECT
          o.id AS order_id, buyer.name AS buyer_name, farmer.name AS farmer_name,
          o.crop_name, o.quantity, o.total_price, o.status, o.payment_status, o.created_at
        FROM orders o
        LEFT JOIN users buyer ON buyer.id=o.buyer_id
        LEFT JOIN users farmer ON farmer.id=o.farmer_id
        ORDER BY o.id DESC
        """,
        fetch=True,
    ))


@app.get("/api/superadmin/payments")
@auth_required("Admin", "SuperAdmin")
def superadmin_payments():
    return jsonify(query(
        """
        SELECT
          p.order_id, buyer.name AS buyer, farmer.name AS farmer,
          p.amount, p.payment_method, p.payment_status, p.transaction_id, o.status AS order_status, p.created_at
        FROM payments p
        LEFT JOIN orders o ON o.id=p.order_id
        LEFT JOIN users buyer ON buyer.id=p.buyer_id
        LEFT JOIN users farmer ON farmer.id=p.farmer_id
        ORDER BY p.id DESC
        """,
        fetch=True,
    ))


@app.get("/api/superadmin/transport")
@auth_required("Admin", "SuperAdmin")
def superadmin_transport():
    requests = query(
        """
        SELECT
          tr.id, creator.name AS farmer_name, tr.origin_village, tr.origin_district,
          tr.destination, tr.crop_name, tr.quantity, tr.vehicle_type, tr.travel_date,
          tr.estimated_total_cost, tr.max_farmers, tr.status, tr.created_at,
          COUNT(tm.id) AS joined_members
        FROM transport_requests tr
        LEFT JOIN users creator ON creator.id=tr.farmer_id
        LEFT JOIN transport_members tm ON tm.transport_id=tr.id
        GROUP BY tr.id, creator.id
        ORDER BY tr.id DESC
        """,
        fetch=True,
    )
    members = query(
        """
        SELECT tm.transport_id, u.name, u.phone, u.village, u.district, tm.joined_at
        FROM transport_members tm
        LEFT JOIN users u ON u.id=tm.farmer_id
        ORDER BY tm.transport_id DESC, tm.joined_at ASC
        """,
        fetch=True,
    )
    members_by_transport = {}
    for member in members:
        members_by_transport.setdefault(member["transport_id"], []).append(member)
    for item in requests:
        item["members"] = members_by_transport.get(item["id"], [])
    return jsonify(requests)


@app.get("/api/superadmin/complaints")
@auth_required("Admin", "SuperAdmin")
def superadmin_complaints():
    return jsonify(query(
        """
        SELECT c.id, u.name, u.email, u.role, c.subject, c.message, c.status, c.created_at
        FROM complaints c
        LEFT JOIN users u ON u.id=c.user_id
        ORDER BY c.id DESC
        """,
        fetch=True,
    ))


@app.get("/api/superadmin/ai-usage")
@auth_required("Admin", "SuperAdmin")
def superadmin_ai_usage():
    price_predictions = query(
        """
        SELECT pp.id, u.name AS user_name, pp.crop_name, pp.market, pp.current_price,
               pp.predicted_price_3_days, pp.predicted_price_7_days, pp.trend, pp.prediction_type, pp.created_at
        FROM price_predictions pp
        LEFT JOIN users u ON u.id=pp.farmer_id
        ORDER BY pp.id DESC
        """,
        fetch=True,
    )
    disease_detection_requests = query(
        """
        SELECT dh.id, u.name AS user_name, dh.crop_name, dh.disease_name, dh.confidence, dh.status, dh.created_at
        FROM disease_history dh
        LEFT JOIN users u ON u.id=dh.farmer_id
        ORDER BY dh.id DESC
        """,
        fetch=True,
    )
    weather_requests = query(
        """
        SELECT wl.id, u.name AS user_name, wl.temperature, wl.humidity, wl.condition_text, wl.suggestion, wl.created_at
        FROM weather_logs wl
        LEFT JOIN users u ON u.id=wl.user_id
        ORDER BY wl.id DESC
        """,
        fetch=True,
    )
    return jsonify({
        "price_predictions": price_predictions,
        "disease_detection_requests": disease_detection_requests,
        "weather_requests": weather_requests,
    })


@app.get("/api/superadmin/activity")
@auth_required("Admin", "SuperAdmin")
def superadmin_activity():
    return jsonify(query(
        """
        SELECT al.id, u.name, u.email, u.role, al.action, al.details, al.created_at
        FROM activity_logs al
        LEFT JOIN users u ON u.id=al.user_id
        ORDER BY al.id DESC
        LIMIT 200
        """,
        fetch=True,
    ))


@app.post("/api/superadmin/admins")
@app.post("/api/admin/create-admin")
@auth_required("Admin", "SuperAdmin")
def create_admin():
    data = request_data()
    required = ["name", "email", "password"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        return jsonify({"message": "Missing required fields", "missing": missing}), 400
    if count_users_by_role("Admin") >= 3:
        return jsonify({"message": "Maximum 3 admins are allowed initially."}), 409
    try:
        query(
            """
            INSERT INTO users (name, email, phone, password_hash, role, account_status, is_verified)
            VALUES (%s, %s, %s, %s, 'Admin', 'Active', TRUE)
            """,
            (data["name"], data["email"], data.get("phone"), hash_password(data["password"])),
        )
    except MySQLError as error:
        return db_error_response(error)
    return jsonify({"message": "Admin created successfully"}), 201


@app.put("/api/superadmin/admins/<int:user_id>/suspend")
@auth_required("Admin", "SuperAdmin")
def suspend_admin(user_id):
    user = query("SELECT * FROM users WHERE id=%s", (user_id,), fetch=True, one=True)
    if not user:
        return jsonify({"message": "User not found"}), 404
    if normalize_role(user.get("role")) != "Admin":
        return jsonify({"message": "Only Admin accounts can be suspended here."}), 400
    status = "Suspended" if user.get("account_status") != "Suspended" else "Active"
    query("UPDATE users SET account_status=%s WHERE id=%s", (status, user_id))
    return jsonify({"message": f"Admin {status.lower()}", "account_status": status})


@app.put("/api/superadmin/users/<int:user_id>/status")
@app.put("/api/admin/users/<int:user_id>/status")
@auth_required("Admin", "SuperAdmin")
def update_user_status(user_id):
    data = request_data()
    status = data.get("account_status") or data.get("status")
    if status not in ["Active", "Suspended"]:
        return jsonify({"message": "Invalid account status"}), 400
    user = query("SELECT * FROM users WHERE id=%s", (user_id,), fetch=True, one=True)
    if not user:
        return jsonify({"message": "User not found"}), 404
    if role_in(user, ["SuperAdmin"]):
        return jsonify({"message": "403 Forbidden"}), 403
    query("UPDATE users SET account_status=%s WHERE id=%s", (status, user_id))
    return jsonify({"message": "Account status updated", "account_status": status})


@app.put("/api/superadmin/users/<int:user_id>/role")
@auth_required("Admin", "SuperAdmin")
def change_user_role(user_id):
    data = request_data()
    target_role = db_role(data.get("role"))
    if target_role not in ["Admin", "Farmer"]:
        return jsonify({"message": "Role can only be changed between Admin and Farmer."}), 400
    user = query("SELECT * FROM users WHERE id=%s", (user_id,), fetch=True, one=True)
    if not user:
        return jsonify({"message": "User not found"}), 404
    current_role = normalize_role(user.get("role"))
    if role_in(current_role, ["SuperAdmin"]):
        return jsonify({"message": "403 Forbidden"}), 403
    if role_in(target_role, ["Admin"]) and not role_in(current_role, ["Admin"]) and count_users_by_role("Admin") >= 3:
        return jsonify({"message": "Maximum 3 admins are allowed initially."}), 409
    query("UPDATE users SET role=%s WHERE id=%s", (target_role, user_id))
    return jsonify({"message": "User role updated", "role": target_role})


@app.delete("/api/superadmin/users/<int:user_id>")
@app.delete("/api/admin/users/<int:user_id>")
@auth_required("Admin", "SuperAdmin")
def delete_user(user_id):
    user = query("SELECT * FROM users WHERE id=%s", (user_id,), fetch=True, one=True)
    if not user:
        return jsonify({"message": "User not found"}), 404
    if role_in(user, ["SuperAdmin"]):
        return jsonify({"message": "403 Forbidden"}), 403
    query("DELETE FROM users WHERE id=%s", (user_id,))
    return jsonify({"message": "User deleted"})


@app.put("/api/admin/users/<int:user_id>/verify")
@auth_required("Admin", "SuperAdmin")
def verify_user(user_id):
    user = query("SELECT * FROM users WHERE id=%s", (user_id,), fetch=True, one=True)
    if not user:
        return jsonify({"message": "User not found"}), 404
    if normalize_role(user.get("role")) not in ["Farmer", "Buyer"]:
        return jsonify({"message": "Only Farmer and Buyer accounts can be verified."}), 400
    data = request_data()
    is_verified = bool(data.get("is_verified", True))
    query("UPDATE users SET is_verified=%s WHERE id=%s", (is_verified, user_id))
    if is_verified:
        create_notification(
            user_id,
            "Account Verified",
            "Your FarmKart account has been verified by admin.",
        )
    return jsonify({"message": "User verification updated", "is_verified": is_verified})


@app.put("/api/admin/products/<int:product_id>/status")
@auth_required("Admin", "SuperAdmin")
def moderate_product(product_id):
    data = request_data()
    status = data.get("status")
    if status not in ["Available", "Rejected", "Pending", "Sold Out"]:
        return jsonify({"message": "Invalid product status"}), 400
    query("UPDATE products SET status=%s WHERE id=%s", (status, product_id))
    return jsonify({"message": "Product status updated", "status": status})


@app.delete("/api/admin/products/<int:product_id>/fake")
@auth_required("Admin", "SuperAdmin")
def delete_fake_product(product_id):
    query("DELETE FROM products WHERE id=%s", (product_id,))
    return jsonify({"message": "Fake product deleted"})


@app.get("/api/superadmin/system-settings")
@auth_required("SuperAdmin")
def get_system_settings():
    return jsonify({
        "settings": settings_dict(),
        "rows": query("SELECT setting_key, setting_value, updated_at FROM system_settings ORDER BY setting_key", fetch=True),
        "banners": query("SELECT * FROM cms_banners ORDER BY sort_order ASC, id DESC", fetch=True),
        "categories": query("SELECT * FROM crop_categories ORDER BY name ASC", fetch=True),
        "media": query("SELECT * FROM media_library ORDER BY id DESC LIMIT 200", fetch=True),
        "organic_certificates": query(
            """
            SELECT oc.*, u.name AS farmer_name, p.crop_name
            FROM organic_certificates oc
            LEFT JOIN users u ON u.id=oc.farmer_id
            LEFT JOIN products p ON p.id=oc.product_id
            ORDER BY oc.id DESC
            """,
            fetch=True,
        ),
        "ai_modules": query("SELECT * FROM ai_modules ORDER BY module_key", fetch=True),
    })


@app.put("/api/superadmin/system-settings/<setting_key>")
@auth_required("SuperAdmin")
def update_system_setting(setting_key):
    data = request_data()
    upsert_setting(setting_key, data.get("value"))
    create_admin_log("cms_setting_update", setting_key)
    return jsonify({"message": "System setting updated"})


@app.put("/api/superadmin/cms-settings")
@auth_required("SuperAdmin")
def update_cms_settings():
    data = request_data()
    values = data.get("settings", data)
    if isinstance(values, str):
        try:
            values = json.loads(values)
        except json.JSONDecodeError:
            values = {}
    if not isinstance(values, dict):
        return jsonify({"message": "Invalid settings payload."}), 400
    for key, value in values.items():
        if key not in {"settings"} and not isinstance(value, (dict, list)):
            upsert_setting(str(key), value)
    for field in ["logo", "splash_screen_image", "login_page_banner", "home_page_hero_image"]:
        uploaded = save_setting_upload(field)
        if uploaded:
            upsert_setting(field, uploaded)
            query(
                "INSERT INTO media_library (title, file_url, media_type) VALUES (%s, %s, 'image')",
                (field.replace("_", " ").title(), uploaded),
            )
    create_admin_log("cms_settings_bulk_update", "Owner CMS settings updated")
    return jsonify({"message": "CMS settings updated", "settings": settings_dict()})


@app.post("/api/superadmin/banners")
@auth_required("SuperAdmin")
def create_banner():
    data = request_data()
    title = (data.get("title") or "FarmKart Banner").strip()
    image_url = save_setting_upload("image") or data.get("image_url")
    query(
        """
        INSERT INTO cms_banners (title, caption, image_url, target_url, is_active, sort_order)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            title,
            data.get("caption"),
            image_url,
            data.get("target_url"),
            parse_bool_setting(data.get("is_active", "true")),
            int(data.get("sort_order") or 0),
        ),
    )
    if image_url:
        query("INSERT INTO media_library (title, file_url, media_type) VALUES (%s, %s, 'image')", (title, image_url))
    create_admin_log("cms_banner_create", title)
    return jsonify({"message": "Banner uploaded"}), 201


@app.put("/api/superadmin/banners/<int:banner_id>")
@auth_required("SuperAdmin")
def update_banner(banner_id):
    data = request_data()
    banner = query("SELECT * FROM cms_banners WHERE id=%s", (banner_id,), fetch=True, one=True)
    if not banner:
        return jsonify({"message": "Banner not found"}), 404
    image_url = save_setting_upload("image") or data.get("image_url", banner.get("image_url"))
    query(
        """
        UPDATE cms_banners
        SET title=%s, caption=%s, image_url=%s, target_url=%s, is_active=%s, sort_order=%s
        WHERE id=%s
        """,
        (
            data.get("title", banner.get("title")),
            data.get("caption", banner.get("caption")),
            image_url,
            data.get("target_url", banner.get("target_url")),
            parse_bool_setting(data.get("is_active", banner.get("is_active"))),
            int(data.get("sort_order", banner.get("sort_order") or 0) or 0),
            banner_id,
        ),
    )
    create_admin_log("cms_banner_update", str(banner_id))
    return jsonify({"message": "Banner updated"})


@app.put("/api/superadmin/banners/<int:banner_id>/status")
@auth_required("SuperAdmin")
def update_banner_status(banner_id):
    data = request_data()
    query("UPDATE cms_banners SET is_active=%s WHERE id=%s", (parse_bool_setting(data.get("is_active", True)), banner_id))
    create_admin_log("cms_banner_status", str(banner_id))
    return jsonify({"message": "Banner status updated"})


@app.delete("/api/superadmin/banners/<int:banner_id>")
@auth_required("SuperAdmin")
def delete_banner(banner_id):
    query("DELETE FROM cms_banners WHERE id=%s", (banner_id,))
    create_admin_log("cms_banner_delete", str(banner_id))
    return jsonify({"message": "Banner deleted"})


@app.post("/api/superadmin/categories")
@auth_required("SuperAdmin")
def create_category():
    data = request_data()
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"message": "Category name is required."}), 400
    query(
        """
        INSERT INTO crop_categories (name, description, is_enabled)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE description=VALUES(description), is_enabled=VALUES(is_enabled)
        """,
        (name, data.get("description"), parse_bool_setting(data.get("is_enabled", True))),
    )
    create_admin_log("cms_category_save", name)
    return jsonify({"message": "Category saved"}), 201


@app.put("/api/superadmin/categories/<int:category_id>")
@auth_required("SuperAdmin")
def update_category(category_id):
    data = request_data()
    category = query("SELECT * FROM crop_categories WHERE id=%s", (category_id,), fetch=True, one=True)
    if not category:
        return jsonify({"message": "Category not found"}), 404
    query(
        "UPDATE crop_categories SET name=%s, description=%s, is_enabled=%s WHERE id=%s",
        (
            data.get("name", category.get("name")),
            data.get("description", category.get("description")),
            parse_bool_setting(data.get("is_enabled", category.get("is_enabled"))),
            category_id,
        ),
    )
    create_admin_log("cms_category_update", str(category_id))
    return jsonify({"message": "Category updated"})


@app.delete("/api/superadmin/categories/<int:category_id>")
@auth_required("SuperAdmin")
def delete_category(category_id):
    query("DELETE FROM crop_categories WHERE id=%s", (category_id,))
    create_admin_log("cms_category_delete", str(category_id))
    return jsonify({"message": "Category deleted"})


@app.post("/api/superadmin/media")
@auth_required("SuperAdmin")
def upload_media():
    filename = save_upload("file") or save_upload("image")
    if not filename:
        return jsonify({"message": "Upload a valid image file."}), 400
    file_url = f"uploads/{filename}"
    query(
        "INSERT INTO media_library (title, file_url, media_type) VALUES (%s, %s, %s)",
        (request.form.get("title") or filename, file_url, request.form.get("media_type") or "image"),
    )
    create_admin_log("cms_media_upload", file_url)
    return jsonify({"message": "Media uploaded", "file_url": file_url}), 201


@app.delete("/api/superadmin/media/<int:media_id>")
@auth_required("SuperAdmin")
def delete_media(media_id):
    query("DELETE FROM media_library WHERE id=%s", (media_id,))
    create_admin_log("cms_media_delete", str(media_id))
    return jsonify({"message": "Media deleted"})


@app.put("/api/superadmin/products/<int:product_id>")
@auth_required("SuperAdmin")
def cms_edit_product(product_id):
    data = request_data()
    product = query("SELECT * FROM products WHERE id=%s", (product_id,), fetch=True, one=True)
    if not product:
        return jsonify({"message": "Product not found"}), 404
    fields = {
        "crop_name": data.get("crop_name", product.get("crop_name")),
        "category": data.get("category", product.get("category")),
        "quantity": int(data.get("quantity", product.get("quantity") or 0)),
        "price": float(data.get("price", product.get("price") or 0)),
        "unit": data.get("unit", product.get("unit") or "Kg"),
        "location": data.get("location", product.get("location")),
        "description": data.get("description", product.get("description")),
        "status": data.get("status", product.get("status")),
    }
    query(
        """
        UPDATE products
        SET crop_name=%s, category=%s, quantity=%s, price=%s, unit=%s, location=%s, description=%s, status=%s
        WHERE id=%s
        """,
        (*fields.values(), product_id),
    )
    create_admin_log("cms_product_edit", str(product_id))
    return jsonify({"message": "Product updated"})


@app.put("/api/superadmin/products/<int:product_id>/flags")
@auth_required("SuperAdmin")
def update_product_flags(product_id):
    data = request_data()
    query(
        "UPDATE products SET is_featured=%s, is_hidden=%s, organic_badge=%s WHERE id=%s",
        (
            parse_bool_setting(data.get("is_featured", False)),
            parse_bool_setting(data.get("is_hidden", False)),
            parse_bool_setting(data.get("organic_badge", False)),
            product_id,
        ),
    )
    create_admin_log("cms_product_flags", str(product_id))
    return jsonify({"message": "Product flags updated"})


@app.delete("/api/admin/products/<int:product_id>")
@auth_required("Admin", "SuperAdmin")
def delete_product_admin(product_id):
    query("DELETE FROM product_images WHERE product_id=%s", (product_id,))
    query("DELETE FROM products WHERE id=%s", (product_id,))
    create_admin_log("cms_product_delete", str(product_id))
    return jsonify({"message": "Product deleted"})


@app.put("/api/superadmin/organic/<int:certificate_id>")
@auth_required("SuperAdmin")
def update_organic_certificate(certificate_id):
    data = request_data()
    status = data.get("status") or "Pending"
    if status not in ["Pending", "Approved", "Rejected"]:
        return jsonify({"message": "Invalid certificate status."}), 400
    query(
        "UPDATE organic_certificates SET status=%s, organic_badge=%s WHERE id=%s",
        (status, parse_bool_setting(data.get("organic_badge", status == "Approved")), certificate_id),
    )
    certificate = query("SELECT product_id, organic_badge FROM organic_certificates WHERE id=%s", (certificate_id,), fetch=True, one=True)
    if certificate and certificate.get("product_id"):
        query("UPDATE products SET organic_badge=%s WHERE id=%s", (certificate.get("organic_badge"), certificate.get("product_id")))
    create_admin_log("cms_organic_update", str(certificate_id))
    return jsonify({"message": "Organic certificate updated"})


@app.post("/api/superadmin/notifications/broadcast")
@auth_required("SuperAdmin")
def send_broadcast_notification():
    data = request_data()
    title = data.get("title") or "FarmKart Update"
    message = data.get("message") or ""
    role = normalize_role(data.get("role"))
    if not message:
        return jsonify({"message": "Notification message is required."}), 400
    params = ()
    where = "WHERE account_status='Active'"
    if role in ["Farmer", "Buyer", "Admin"]:
        where += " AND role=%s"
        params = (role,)
    users = query(f"SELECT id FROM users {where}", params, fetch=True)
    for user in users:
        create_notification(user["id"], title, message)
    create_admin_log("cms_broadcast", f"{title} to {role or 'all'}")
    return jsonify({"message": "Broadcast notification sent", "count": len(users)})


@app.post("/api/superadmin/ai-models/upload")
@auth_required("SuperAdmin")
def cms_upload_ai_model():
    file = request.files.get("file") or request.files.get("model")
    if not file:
        return jsonify({"message": "AI model file is required."}), 400
    filename = f"{int(time.time())}_{secure_filename(file.filename)}"
    destination = DISEASE_MODEL_DIR / filename
    file.save(destination)
    create_admin_log("cms_ai_model_upload", filename)
    return jsonify({"message": "AI model uploaded", "file": filename}), 201


@app.delete("/api/superadmin/ai-models/<filename>")
@auth_required("SuperAdmin")
def cms_delete_ai_model(filename):
    safe_name = secure_filename(filename)
    target = DISEASE_MODEL_DIR / safe_name
    if target.exists():
        target.unlink()
    create_admin_log("cms_ai_model_delete", safe_name)
    return jsonify({"message": "AI model deleted"})


@app.post("/api/superadmin/ai-models/retrain")
@auth_required("SuperAdmin")
def cms_retrain_ai():
    create_admin_log("cms_ai_retrain", "Retrain requested from owner CMS")
    return jsonify({"message": "AI retrain request recorded. Training runs when dataset support is available."})


@app.post("/api/superadmin/database/backup")
@auth_required("SuperAdmin")
def cms_database_backup():
    backup_name = f"farmkart-backup-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.json"
    payload = {
        "created_at": datetime.utcnow().isoformat(),
        "settings": settings_dict(False),
        "counts": {
            "users": query("SELECT COUNT(*) AS value FROM users", fetch=True, one=True)["value"],
            "products": query("SELECT COUNT(*) AS value FROM products", fetch=True, one=True)["value"],
            "orders": query("SELECT COUNT(*) AS value FROM orders", fetch=True, one=True)["value"],
        },
    }
    create_admin_log("cms_database_backup", backup_name)
    return jsonify({"message": "Database backup prepared", "filename": backup_name, "backup": payload})


@app.post("/api/superadmin/database/restore")
@auth_required("SuperAdmin")
def cms_database_restore():
    create_admin_log("cms_database_restore", "Restore requested")
    return jsonify({"message": "Restore request recorded. Upload-safe restore can be connected to your hosting backup policy."})


@app.put("/api/superadmin/ai-modules/<module_key>")
@auth_required("SuperAdmin")
def update_ai_module(module_key):
    data = request_data()
    name = data.get("name") or module_key.replace("_", " ").title()
    enabled = bool(data.get("is_enabled", True))
    query(
        """
        INSERT INTO ai_modules (module_key, name, is_enabled)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE name=VALUES(name), is_enabled=VALUES(is_enabled)
        """,
        (module_key, name, enabled),
    )
    return jsonify({"message": "AI module updated"})


@app.post("/api/superadmin/advertisements")
@auth_required("Admin", "SuperAdmin")
def create_advertisement():
    data = request_data()
    if not data.get("title"):
        return jsonify({"message": "Advertisement title is required."}), 400
    query(
        "INSERT INTO advertisements (title, image_url, target_url, status) VALUES (%s, %s, %s, %s)",
        (data.get("title"), data.get("image_url"), data.get("target_url"), data.get("status", "Draft")),
    )
    return jsonify({"message": "Advertisement created"}), 201


@app.get("/api/reports/export")
@auth_required("Admin", "SuperAdmin")
def export_reports():
    report_rows = query(
        """
        SELECT o.id, o.crop_name, o.quantity, o.total_price, o.status, o.payment_status, o.created_at,
               buyer.name AS buyer_name, farmer.name AS farmer_name
        FROM orders o
        JOIN users buyer ON buyer.id=o.buyer_id
        JOIN users farmer ON farmer.id=o.farmer_id
        ORDER BY o.id DESC
        """,
        fetch=True,
    )
    export_format = (request.args.get("format") or "excel").lower()
    if export_format == "pdf":
        lines = ["FarmKart Platform Report", ""]
        lines.extend([f"Order #{row['id']} - {row['crop_name']} - Rs {row['total_price']} - {row['status']}" for row in report_rows])
        content = "\n".join(lines).encode("utf-8")
        return app.response_class(content, mimetype="application/pdf", headers={"Content-Disposition": "attachment; filename=farmkart-report.pdf"})
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["id", "crop_name", "quantity", "total_price", "status", "payment_status", "buyer_name", "farmer_name", "created_at"])
    writer.writeheader()
    writer.writerows(report_rows)
    if export_format == "csv":
        return app.response_class(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=farmkart-report.csv"})
    return app.response_class(output.getvalue(), mimetype="application/vnd.ms-excel", headers={"Content-Disposition": "attachment; filename=farmkart-report.xls"})


@app.post("/api/ai/upload-price-history")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def upload_price_history():
    file = request.files.get("file")
    if not file or not file.filename.lower().endswith(".csv"):
        return jsonify({"message": "Upload a valid CSV file."}), 400
    filename = f"{int(time.time())}_{secure_filename(file.filename)}"
    destination = DATASET_UPLOAD_DIR / filename
    file.save(destination)
    rows, error = validate_price_csv(destination)
    if error:
        destination.unlink(missing_ok=True)
        return jsonify({"message": error}), 400
    ok, train_error = train_price_model(rows)
    if train_error:
        return jsonify({"message": train_error}), 500
    return jsonify({"message": "Price history uploaded and model trained.", "rows": len(rows), "model_trained": ok})


@app.get("/api/ai/price-history")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def price_history():
    dataset = latest_price_dataset()
    if not dataset:
        return jsonify({"rows": [], "message": "No historical price dataset uploaded yet."})
    rows, error = validate_price_csv(dataset)
    if error:
        return jsonify({"rows": [], "message": error}), 400
    return jsonify({
        "rows": [
            {"crop_name": row["crop_name"], "market": row["market"], "date": row["date"].strftime("%Y-%m-%d"), "price": row["price"]}
            for row in rows[-50:]
        ]
    })


@app.post("/api/ai/price-predict")
@app.post("/ai/price-prediction")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def price_prediction():
    data = request.get_json(force=True)
    crop = (data.get("crop_name") or data.get("crop") or "").strip()
    market = (data.get("market") or request.user.get("district") or request.user.get("village") or "Local Market").strip()
    if not crop:
        return jsonify({"message": "Crop name is required."}), 400
    today = datetime.utcnow()
    prediction_type = "RULE_BASED"
    note = "Prediction generated using current market estimation. ML model can be trained after historical dataset upload."
    model_values = predict_with_model(crop, market, today)
    if model_values:
        current, three_days, seven_days = model_values
        prediction_type = "ML"
        note = "Prediction generated using uploaded historical CSV and Linear Regression model."
    else:
        current = db_current_market_price(crop)
        if current is None:
            return jsonify({"message": "No current market price found for this crop. Add products or upload historical CSV first."}), 400
        three_days = round(current, 2)
        seven_days = round(current, 2)
    trend = trend_label(current, seven_days)
    query(
        """
        INSERT INTO price_predictions (
          farmer_id, crop_name, market, current_price, predicted_price_3_days, predicted_price_7_days,
          predicted_3_days, predicted_7_days, trend, prediction_type, note
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (request.user["id"], crop, market, current, three_days, seven_days, three_days, seven_days, trend, prediction_type, note),
    )
    confidence = 0.85 if prediction_type == "ML" else None
    return jsonify({
        "crop_name": crop,
        "market": market,
        "current_price": current,
        "predicted_price_3_days": three_days,
        "predicted_price_7_days": seven_days,
        "trend": trend,
        "prediction_type": prediction_type,
        "confidence": confidence,
        "note": note,
        "chart": [
            {"label": "Today", "price": current},
            {"label": "3 Days", "price": three_days},
            {"label": "7 Days", "price": seven_days},
        ],
    })


@app.post("/api/ai/disease-detect")
@app.post("/ai/disease-detection")
@jwt_required()
@auth_required("Farmer", "Admin", "SuperAdmin")
def disease_detection():
    image_name = save_upload("image")
    crop_name = request.form.get("crop_name") or request.form.get("crop") or None
    model_files = list(DISEASE_MODEL_DIR.glob("*.pt")) + list(DISEASE_MODEL_DIR.glob("*.pth")) + list(DISEASE_MODEL_DIR.glob("*.h5"))
    if not model_files:
        query(
            """
            INSERT INTO disease_history (farmer_id, image_url, crop_name, status)
            VALUES (%s, %s, %s, 'MODEL_NOT_TRAINED')
            """,
            (request.user["id"], image_name, crop_name),
        )
        return jsonify({
            "status": "MODEL_NOT_TRAINED",
            "model_ready": False,
            "message": "AI disease model is not trained yet. Please upload/train a model to enable detection.",
            "crop_name": crop_name,
            "disease_name": None,
            "result": "MODEL_NOT_TRAINED",
            "disease": None,
            "confidence": None,
            "treatment": None,
            "prevention": None,
            "fertilizer_recommendation": None,
            "prevention_tips": None,
        })
    return jsonify({
        "status": "MODEL_AVAILABLE_NOT_CONNECTED",
        "model_ready": False,
        "message": "Disease model file found, but prediction runtime is not configured yet.",
        "crop_name": crop_name,
        "disease_name": None,
        "result": "MODEL_AVAILABLE_NOT_CONNECTED",
        "disease": None,
        "confidence": None,
        "treatment": None,
        "prevention": None,
        "fertilizer_recommendation": None,
        "prevention_tips": None,
    }), 501


@app.get("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


def create_superadmin_from_command():
    if len(sys.argv) < 4 or sys.argv[1] != "create-superadmin":
        return False
    init_database()
    if count_users_by_role("SuperAdmin") >= 1:
        print("SuperAdmin already exists. Refusing to create another account.")
        return True
    email = sys.argv[2]
    name = sys.argv[3]
    password = os.getenv("SUPERADMIN_PASSWORD") or (sys.argv[4] if len(sys.argv) > 4 else None)
    if not password:
        print("Set SUPERADMIN_PASSWORD or pass a password as the final argument.")
        return True
    try:
        query(
            """
            INSERT INTO users (name, email, password_hash, role, account_status, is_verified)
            VALUES (%s, %s, %s, 'SuperAdmin', 'Active', TRUE)
            """,
            (name, email, hash_password(password)),
        )
    except MySQLError as error:
        print(f"Unable to create SuperAdmin: {error}")
        return True
    print("SuperAdmin created successfully.")
    return True


def seed_superadmin_from_env():
    email = (os.getenv("SUPERADMIN_EMAIL") or "").strip().lower()
    password = os.getenv("SUPERADMIN_PASSWORD") or ""
    name = (os.getenv("SUPERADMIN_NAME") or "").strip()

    if not email or not password or not name:
        return

    existing = query(
        "SELECT id FROM users WHERE LOWER(email)=LOWER(%s) LIMIT 1",
        (email,),
        fetch=True,
        one=True,
    )
    if existing:
        print("SuperAdmin seed skipped: user already exists.")
        return

    query(
        """
        INSERT INTO users (name, email, password_hash, role, is_verified, account_status)
        VALUES (%s, %s, %s, 'SuperAdmin', TRUE, 'Active')
        """,
        (name, email, hash_password(password)),
    )
    print("SuperAdmin seed user created.")


def initialize_database_on_startup():
    try:
        with app.app_context():
            init_database()
            seed_superadmin_from_env()
            print("Database initialized successfully")
    except Exception as e:
        print("Database initialization failed")
        traceback.print_exc()


initialize_database_on_startup()


if __name__ == "__main__":
    if create_superadmin_from_command():
        sys.exit(0)
    app.run(host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
