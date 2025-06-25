-- Initialize sample data for Visual SQL Query Builder
-- This creates the basic tables and sample data for testing

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and gadgets'),
('Books', 'Books and educational materials'),
('Clothing', 'Apparel and accessories'),
('Home & Garden', 'Home improvement and gardening supplies'),
('Sports', 'Sports equipment and accessories');

-- Insert sample users
INSERT INTO users (name, email, status) VALUES
('John Doe', 'john.doe@example.com', 'active'),
('Jane Smith', 'jane.smith@example.com', 'active'),
('Bob Johnson', 'bob.johnson@example.com', 'inactive'),
('Alice Brown', 'alice.brown@example.com', 'active'),
('Charlie Wilson', 'charlie.wilson@example.com', 'pending');

-- Insert sample products
INSERT INTO products (name, price, category_id) VALUES
('Laptop Computer', 999.99, 1),
('Smartphone', 699.99, 1),
('Programming Book', 49.99, 2),
('T-Shirt', 19.99, 3),
('Garden Tools Set', 89.99, 4),
('Basketball', 29.99, 5),
('Wireless Headphones', 199.99, 1),
('Cookbook', 24.99, 2),
('Running Shoes', 79.99, 3),
('Plant Pots', 15.99, 4);

-- Insert sample orders
INSERT INTO orders (user_id, total, status) VALUES
(1, 1049.98, 'completed'),
(2, 249.98, 'pending'),
(3, 79.99, 'shipped'),
(4, 199.99, 'completed'),
(5, 44.98, 'cancelled');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 999.99),
(1, 3, 1, 49.99),
(2, 7, 1, 199.99),
(2, 8, 2, 24.99),
(3, 9, 1, 79.99),
(4, 7, 1, 199.99),
(5, 6, 1, 29.99),
(5, 10, 1, 15.99);