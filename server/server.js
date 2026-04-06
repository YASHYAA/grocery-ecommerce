const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS so our frontend can access the API
app.use(cors());
// Parse incoming JSON requests
app.use(express.json());

// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// PostgreSQL database connection
const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
} : {
  user: 'postgres',
  host: 'localhost',
  database: 'grocery', // default DB
  password: '1234', // REPLACE with your DB password
  port: 5432,
};
const pool = new Pool(poolConfig);

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack)
  }
  console.log('Successfully connected to PostgreSQL!');
  release();
});

// GET /api/cart/:sessionId
// Fetch all items in a user's cart
app.get('/api/cart/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const result = await pool.query(
      'SELECT product_id as id, quantity FROM carts WHERE session_id = $1',
      [sessionId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST /api/cart
// Add item or update quantity in cart
app.post('/api/cart', async (req, res) => {
  const { sessionId, productId, quantityChange } = req.body;
  if (!sessionId || !productId || !quantityChange) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if the item already exists in the cart
    const existing = await pool.query(
      'SELECT quantity FROM carts WHERE session_id = $1 AND product_id = $2',
      [sessionId, productId]
    );

    if (existing.rows.length > 0) {
      // Update existing
      const newQty = existing.rows[0].quantity + quantityChange;
      if (newQty <= 0) {
        // Remove item if quantity falls to 0 or below
        await pool.query(
          'DELETE FROM carts WHERE session_id = $1 AND product_id = $2',
          [sessionId, productId]
        );
      } else {
        // Update quantity
        await pool.query(
          'UPDATE carts SET quantity = $1 WHERE session_id = $2 AND product_id = $3',
          [newQty, sessionId, productId]
        );
      }
    } else {
      // Insert new item (only if adding positive quantity)
      if (quantityChange > 0) {
        await pool.query(
          'INSERT INTO carts (session_id, product_id, quantity) VALUES ($1, $2, $3)',
          [sessionId, productId, quantityChange]
        );
      }
    }

    // Return the updated cart items
    const updatedCart = await pool.query(
      'SELECT product_id as id, quantity FROM carts WHERE session_id = $1',
      [sessionId]
    );
    res.json(updatedCart.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// DELETE /api/cart/:sessionId/:productId
// Remove an item from the cart entirely
app.delete('/api/cart/:sessionId/:productId', async (req, res) => {
  const { sessionId, productId } = req.params;
  try {
    await pool.query(
      'DELETE FROM carts WHERE session_id = $1 AND product_id = $2',
      [sessionId, productId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Clear entirely (for checkout)
app.delete('/api/cart/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    await pool.query('DELETE FROM carts WHERE session_id = $1', [sessionId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, contact } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });

    await pool.query(
      'INSERT INTO users (name, email, password, contact) VALUES ($1, $2, $3, $4)',
      [name, email, password, contact || null]
    );
    res.json({ success: true, user: { name, email, contact } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error registering user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const result = await pool.query('SELECT name, email, password FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    if (user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });

    // Wait, let's just make it secure-ish logic
    res.json({ success: true, user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- ADMIN ROUTES ---
app.post('/api/auth/admin', (req, res) => {
  const { username, password } = req.body;
  if (username === 'yashwantk07' && password === 'YASHk@0099') {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid admin credentials' });
  }
});

// Create Order (Called from Frontend Checkout)
app.post('/api/orders', async (req, res) => {
  const { userEmail, items, totalAmount } = req.body;
  if (!userEmail || !items || totalAmount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO orders (user_email, items, total_amount, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [userEmail, JSON.stringify(items), totalAmount, 'Pending']
    );
    res.json({ success: true, orderId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error creating order' });
  }
});

// Get All Orders (Admin Dashboard)
app.get('/api/admin/orders', async (req, res) => {
  try {
    // Return newest orders first
    const result = await pool.query('SELECT * FROM orders ORDER BY order_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching orders' });
  }
});

// Update Order Status
app.put('/api/admin/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error updating order' });
  }
});

// --- PRODUCT APIS ---
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching products' });
  }
});

app.post('/api/admin/products', async (req, res) => {
  const { name, price, category, image } = req.body;
  try {
    await pool.query(
      'INSERT INTO products (name, price, category, image) VALUES ($1, $2, $3, $4)',
      [name, price, category, image]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.listen(port, () => {
  console.log(`Kirana API server listening at http://localhost:${port}`);
});
