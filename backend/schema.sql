CREATE DATABASE IF NOT EXISTS farmers_market;
USE farmers_market;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
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
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id INT NOT NULL,
  crop_name VARCHAR(120) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  location VARCHAR(180) NOT NULL,
  description TEXT,
  image VARCHAR(255),
  status ENUM('Available', 'Sold Out', 'Pending', 'Rejected') DEFAULT 'Available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  farmer_id INT NOT NULL,
  buyer_id INT NOT NULL,
  crop_name VARCHAR(120) NOT NULL,
  quantity INT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('Pending', 'Accepted', 'Rejected', 'Delivered', 'Cancelled') DEFAULT 'Pending',
  payment_status ENUM('Pending', 'Paid', 'Failed') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  buyer_id INT NOT NULL,
  rating INT NOT NULL,
  review TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transport_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id INT NOT NULL,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transport_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transport_id INT NOT NULL,
  farmer_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_transport_farmer (transport_id, farmer_id),
  FOREIGN KEY (transport_id) REFERENCES transport_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS village VARCHAR(100),
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

ALTER TABLE transport_requests
  ADD COLUMN IF NOT EXISTS origin_village VARCHAR(100),
  ADD COLUMN IF NOT EXISTS origin_district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS travel_date DATE,
  ADD COLUMN IF NOT EXISTS estimated_total_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_farmers INT DEFAULT 4,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS farmer_id INT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Available',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS farmer_id INT,
  ADD COLUMN IF NOT EXISTS buyer_id INT,
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  buyer_id INT NOT NULL,
  farmer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(60) DEFAULT 'Pay Later',
  payment_status ENUM('Pending', 'Paid', 'Failed') DEFAULT 'Pending',
  transaction_id VARCHAR(180),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS price_predictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id INT NULL,
  crop_name VARCHAR(100) NOT NULL,
  market VARCHAR(150),
  current_price DECIMAL(10,2) NOT NULL,
  predicted_price_3_days DECIMAL(10,2),
  predicted_price_7_days DECIMAL(10,2),
  predicted_3_days DECIMAL(10,2) NOT NULL,
  predicted_7_days DECIMAL(10,2) NOT NULL,
  trend VARCHAR(50) NOT NULL,
  prediction_type VARCHAR(50),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disease_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id INT NULL,
  image_url VARCHAR(255),
  crop_name VARCHAR(100),
  disease_name VARCHAR(150),
  confidence DECIMAL(5,2),
  treatment TEXT,
  fertilizer_recommendation TEXT,
  prevention_tips TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  subject VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(40) DEFAULT 'Open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_key VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS advertisements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  image_url VARCHAR(255),
  target_url VARCHAR(255),
  status VARCHAR(40) DEFAULT 'Draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(120) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE price_predictions
  ADD COLUMN IF NOT EXISTS farmer_id INT,
  ADD COLUMN IF NOT EXISTS market VARCHAR(150),
  ADD COLUMN IF NOT EXISTS predicted_price_3_days DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS predicted_price_7_days DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS prediction_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS note TEXT;
