-- This is the initialization script for your PostgreSQL database.
-- Run this in pgAdmin or via psql command line tool to create the tables.

CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  UNIQUE(session_id, product_id)
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  contact VARCHAR(20)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS contact VARCHAR(20);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(100) NOT NULL,
  address TEXT,
  items JSON NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  image TEXT NOT NULL,
  CONSTRAINT unique_product_name UNIQUE(name)
);

-- Seed initial products
INSERT INTO products (name, price, category, image) VALUES 
('Basmati Rice - 1kg', 120, 'Grains & Staples', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80'),
('Sona Masoori Rice - 5kg', 350, 'Grains & Staples', 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=400&q=80'),
('Wheat Atta - 5kg', 210, 'Grains & Staples', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80'),
('Besan (Gram Flour) - 500g', 60, 'Grains & Staples', 'https://images.unsplash.com/photo-1627485937980-221c88ce04ea?auto=format&fit=crop&w=400&q=80'),
('Poha (Thick) - 500g', 45, 'Grains & Staples', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80'),
('Toor Dal (Arhar) - 1kg', 160, 'Pulses', 'https://images.unsplash.com/photo-1585996082645-ec7e46e8c0e7?auto=format&fit=crop&w=400&q=80'),
('Moong Dal (Yellow) - 1kg', 140, 'Pulses', 'https://images.unsplash.com/photo-1621213442436-ce0187428c05?auto=format&fit=crop&w=400&q=80'),
('Kabuli Chole - 1kg', 150, 'Pulses', 'https://images.unsplash.com/photo-1515543904379-3d1eb360fc1e?auto=format&fit=crop&w=400&q=80'),
('Rajma (Kidney Beans) - 1kg', 180, 'Pulses', 'https://images.unsplash.com/photo-1551326844-4df70f78d0e9?auto=format&fit=crop&w=400&q=80'),
('Turmeric Powder - 200g', 50, 'Spices', 'https://images.unsplash.com/photo-1615486171448-4fdcbef58ebd?auto=format&fit=crop&w=400&q=80'),
('Red Chili Powder - 200g', 80, 'Spices', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80'),
('Garam Masala - 100g', 65, 'Spices', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80'),
('Mustard Seeds (Rai) - 100g', 20, 'Spices', 'https://images.unsplash.com/photo-1509358271058-acd26ccaf9ea?auto=format&fit=crop&w=400&q=80'),
('Sunflower Oil - 1L', 180, 'Edible Oils', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80'),
('Mustard Oil - 1L', 190, 'Edible Oils', 'https://images.unsplash.com/photo-1608836561138-0909c25f483c?auto=format&fit=crop&w=400&q=80'),
('Pure Ghee - 500ml', 320, 'Edible Oils', 'https://images.unsplash.com/photo-1600857321855-9b8e8f85f524?auto=format&fit=crop&w=400&q=80'),
('Potato Chips - Pack of 4', 80, 'Snacks & Bev', 'https://images.unsplash.com/photo-1566478989037-e924e526a8d0?auto=format&fit=crop&w=400&q=80'),
('Biscuit Muesli - 500g', 120, 'Snacks & Bev', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80'),
('Premium Tea Leaves - 250g', 150, 'Snacks & Bev', 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=400&q=80'),
('Instant Coffee - 100g', 180, 'Snacks & Bev', 'https://images.unsplash.com/photo-1558138838-762939b8bcbd?auto=format&fit=crop&w=400&q=80'),
('Bath Soap x 4', 140, 'Personal Care', 'https://images.unsplash.com/photo-1600857544200-b2f1665a3962?auto=format&fit=crop&w=400&q=80'),
('Toothpaste - 200g', 110, 'Personal Care', 'https://images.unsplash.com/photo-1559591410-b4860b2b8004?auto=format&fit=crop&w=400&q=80'),
('Hair Shampoo - 340ml', 210, 'Personal Care', 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=400&q=80'),
('Detergent Powder - 1kg', 130, 'Household', 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=400&q=80'),
('Dishwash Liquid - 500ml', 90, 'Household', 'https://images.unsplash.com/photo-1585833778536-e7eeb226d7f3?auto=format&fit=crop&w=400&q=80')
ON CONFLICT (name) DO NOTHING;

-- Note: You shouldn't need to manually insert data.
-- The Node.js API will automatically insert rows when users view store or register.
