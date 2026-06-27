const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_TOKEN = process.env.SESSION_TOKEN || 'chef-john-admin-session-token-12345';

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Serve static files from 'john' directory
app.use(express.static(path.join(__dirname, 'john')));

// Ensure uploads folder exists under john/images/uploads
const uploadsDir = path.join(__dirname, 'john', 'images', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer disk storage for local image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Database Connection
const DATA_FILE_PATH = path.join(__dirname, 'john', 'data.json');
let pool = null;

async function initDB() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (connectionString) {
    console.log("Connecting to PostgreSQL database...");
    pool = new Pool({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await pool.query("SELECT 1");
      console.log("PostgreSQL connected successfully.");
      await createTablesAndSeed();
    } catch (err) {
      console.warn("PostgreSQL connection failed. Falling back to local data.json:", err.message);
      pool = null;
    }
  } else {
    console.log("No DATABASE_URL found. Using local data.json file storage.");
  }
}

async function createTablesAndSeed() {
  const schema = `
    CREATE TABLE IF NOT EXISTS portfolio_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dishes (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS experience (
      id SERIAL PRIMARY KEY,
      date_period VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(255) NOT NULL,
      description TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gallery (
      id SERIAL PRIMARY KEY,
      image_url TEXT NOT NULL,
      alt VARCHAR(255) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      testimonial_text TEXT NOT NULL,
      author VARCHAR(255) NOT NULL,
      role VARCHAR(255) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(schema);

  // Migrate existing tables image_url columns to TEXT to support Base64 strings
  try {
    await pool.query("ALTER TABLE dishes ALTER COLUMN image_url TYPE TEXT;");
    await pool.query("ALTER TABLE gallery ALTER COLUMN image_url TYPE TEXT;");
  } catch (alterErr) {
    console.warn("Could not alter table columns:", alterErr.message);
  }

  // Seed data from local data.json if the portfolio_settings table is empty
  const countRes = await pool.query("SELECT COUNT(*) FROM portfolio_settings");
  if (parseInt(countRes.rows[0].count) === 0 && fs.existsSync(DATA_FILE_PATH)) {
    console.log("Seeding PostgreSQL tables from initial data.json...");
    try {
      const initialData = JSON.parse(fs.readFileSync(DATA_FILE_PATH, 'utf8'));

      // Seed settings
      const settingsKeys = ['hero', 'about', 'counters', 'sections', 'contact', 'socials', 'footer'];
      for (const k of settingsKeys) {
        if (initialData[k]) {
          await pool.query(
            "INSERT INTO portfolio_settings (key, value) VALUES ($1, $2)",
            [k, JSON.stringify(initialData[k])]
          );
        }
      }

      // Seed dishes
      if (initialData.dishes) {
        for (const item of initialData.dishes) {
          await pool.query(
            "INSERT INTO dishes (title, description, image_url) VALUES ($1, $2, $3)",
            [item.title, item.description, item.image_url]
          );
        }
      }

      // Seed experience
      if (initialData.experience) {
        for (const item of initialData.experience) {
          await pool.query(
            "INSERT INTO experience (date_period, title, subtitle, description) VALUES ($1, $2, $3, $4)",
            [item.date, item.title, item.subtitle, item.description]
          );
        }
      }

      // Seed gallery
      if (initialData.gallery) {
        for (const item of initialData.gallery) {
          await pool.query(
            "INSERT INTO gallery (image_url, alt) VALUES ($1, $2)",
            [item.image_url, item.alt]
          );
        }
      }

      // Seed testimonials
      if (initialData.testimonials) {
        for (const item of initialData.testimonials) {
          await pool.query(
            "INSERT INTO testimonials (testimonial_text, author, role) VALUES ($1, $2, $3)",
            [item.text, item.author, item.role]
          );
        }
      }

      console.log("Database seeded successfully.");
    } catch (err) {
      console.error("Failed to seed database from data.json:", err.message);
    }
  }
}

// Authentication Middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader === `Bearer ${SESSION_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Helper: read file data
function readLocalJson() {
  if (fs.existsSync(DATA_FILE_PATH)) {
    return JSON.parse(fs.readFileSync(DATA_FILE_PATH, 'utf8'));
  }
  return {};
}

// Helper: write file data
function writeLocalJson(data) {
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// API: Get portfolio data
app.get('/api/portfolio-data', async (req, res) => {
  try {
    if (pool) {
      const data = {};
      
      // Load Settings
      const settingsRes = await pool.query("SELECT * FROM portfolio_settings");
      settingsRes.rows.forEach(row => {
        data[row.key] = JSON.parse(row.value);
      });

      // Load Dishes
      const dishesRes = await pool.query("SELECT * FROM dishes ORDER BY id ASC");
      data.dishes = dishesRes.rows;

      // Load Experience
      const expRes = await pool.query("SELECT * FROM experience ORDER BY id ASC");
      data.experience = expRes.rows.map(row => ({
        id: row.id,
        date: row.date_period,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description
      }));

      // Load Gallery
      const galleryRes = await pool.query("SELECT * FROM gallery ORDER BY id ASC");
      data.gallery = galleryRes.rows;

      // Load Testimonials
      const testRes = await pool.query("SELECT * FROM testimonials ORDER BY id ASC");
      data.testimonials = testRes.rows.map(row => ({
        id: row.id,
        text: row.testimonial_text,
        author: row.author,
        role: row.role
      }));

      res.json(data);
    } else {
      res.json(readLocalJson());
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: SESSION_TOKEN });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// API: Save General Settings
app.put('/api/admin/save-general', authenticateAdmin, async (req, res) => {
  const { hero, about, counters, contact, socials, footer } = req.body;
  try {
    if (pool) {
      const updates = { hero, about, counters, contact, socials, footer };
      for (const [k, val] of Object.entries(updates)) {
        if (val) {
          await pool.query(
            "INSERT INTO portfolio_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
            [k, JSON.stringify(val)]
          );
        }
      }
      res.json({ message: 'General settings saved successfully' });
    } else {
      const data = readLocalJson();
      if (hero) data.hero = hero;
      if (about) data.about = about;
      if (counters) data.counters = counters;
      if (contact) data.contact = contact;
      if (socials) data.socials = socials;
      if (footer) data.footer = footer;
      writeLocalJson(data);
      res.json({ message: 'General settings saved to local JSON' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Save Sections Visibility
app.put('/api/admin/save-sections', authenticateAdmin, async (req, res) => {
  const { sections } = req.body;
  try {
    if (pool) {
      await pool.query(
        "INSERT INTO portfolio_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        ['sections', JSON.stringify(sections)]
      );
      res.json({ message: 'Sections visibility saved successfully' });
    } else {
      const data = readLocalJson();
      data.sections = sections;
      writeLocalJson(data);
      res.json({ message: 'Sections visibility saved to local JSON' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Dishes
app.post('/api/admin/dishes', authenticateAdmin, async (req, res) => {
  const { title, description, image_url } = req.body;
  try {
    if (pool) {
      const result = await pool.query(
        "INSERT INTO dishes (title, description, image_url) VALUES ($1, $2, $3) RETURNING *",
        [title, description, image_url]
      );
      res.status(201).json(result.rows[0]);
    } else {
      const data = readLocalJson();
      if (!data.dishes) data.dishes = [];
      const newId = data.dishes.length > 0 ? Math.max(...data.dishes.map(d => d.id)) + 1 : 1;
      const newDish = { id: newId, title, description, image_url };
      data.dishes.push(newDish);
      writeLocalJson(data);
      res.status(201).json(newDish);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/dishes/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, image_url } = req.body;
  try {
    if (pool) {
      const result = await pool.query(
        "UPDATE dishes SET title=$1, description=$2, image_url=$3 WHERE id=$4 RETURNING *",
        [title, description, image_url, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Dish not found' });
      res.json(result.rows[0]);
    } else {
      const data = readLocalJson();
      const dish = data.dishes.find(d => d.id === parseInt(id));
      if (!dish) return res.status(404).json({ error: 'Dish not found' });
      dish.title = title;
      dish.description = description;
      dish.image_url = image_url;
      writeLocalJson(data);
      res.json(dish);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/dishes/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    if (pool) {
      const result = await pool.query("DELETE FROM dishes WHERE id=$1 RETURNING *", [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Dish not found' });
      res.json({ message: 'Dish deleted successfully', dish: result.rows[0] });
    } else {
      const data = readLocalJson();
      const index = data.dishes.findIndex(d => d.id === parseInt(id));
      if (index === -1) return res.status(404).json({ error: 'Dish not found' });
      const deletedDish = data.dishes.splice(index, 1)[0];
      writeLocalJson(data);
      res.json({ message: 'Dish deleted successfully', dish: deletedDish });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Experience Timeline
app.post('/api/admin/experience', authenticateAdmin, async (req, res) => {
  const { date, title, subtitle, description } = req.body;
  try {
    if (pool) {
      const result = await pool.query(
        "INSERT INTO experience (date_period, title, subtitle, description) VALUES ($1, $2, $3, $4) RETURNING *",
        [date, title, subtitle, description]
      );
      res.status(201).json({
        id: result.rows[0].id,
        date: result.rows[0].date_period,
        title: result.rows[0].title,
        subtitle: result.rows[0].subtitle,
        description: result.rows[0].description
      });
    } else {
      const data = readLocalJson();
      if (!data.experience) data.experience = [];
      const newId = data.experience.length > 0 ? Math.max(...data.experience.map(e => e.id)) + 1 : 1;
      const newItem = { id: newId, date, title, subtitle, description };
      data.experience.push(newItem);
      writeLocalJson(data);
      res.status(201).json(newItem);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/experience/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { date, title, subtitle, description } = req.body;
  try {
    if (pool) {
      const result = await pool.query(
        "UPDATE experience SET date_period=$1, title=$2, subtitle=$3, description=$4 WHERE id=$5 RETURNING *",
        [date, title, subtitle, description, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Experience item not found' });
      res.json({
        id: result.rows[0].id,
        date: result.rows[0].date_period,
        title: result.rows[0].title,
        subtitle: result.rows[0].subtitle,
        description: result.rows[0].description
      });
    } else {
      const data = readLocalJson();
      const item = data.experience.find(e => e.id === parseInt(id));
      if (!item) return res.status(404).json({ error: 'Experience item not found' });
      item.date = date;
      item.title = title;
      item.subtitle = subtitle;
      item.description = description;
      writeLocalJson(data);
      res.json(item);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/experience/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    if (pool) {
      const result = await pool.query("DELETE FROM experience WHERE id=$1 RETURNING *", [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Experience item not found' });
      res.json({ message: 'Experience item deleted', item: result.rows[0] });
    } else {
      const data = readLocalJson();
      const index = data.experience.findIndex(e => e.id === parseInt(id));
      if (index === -1) return res.status(404).json({ error: 'Experience item not found' });
      const deletedItem = data.experience.splice(index, 1)[0];
      writeLocalJson(data);
      res.json({ message: 'Experience item deleted', item: deletedItem });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Gallery
app.post('/api/admin/gallery', authenticateAdmin, async (req, res) => {
  const { image_url, alt } = req.body;
  try {
    if (pool) {
      const result = await pool.query(
        "INSERT INTO gallery (image_url, alt) VALUES ($1, $2) RETURNING *",
        [image_url, alt]
      );
      res.status(201).json(result.rows[0]);
    } else {
      const data = readLocalJson();
      if (!data.gallery) data.gallery = [];
      const newId = data.gallery.length > 0 ? Math.max(...data.gallery.map(g => g.id)) + 1 : 1;
      const newImg = { id: newId, image_url, alt };
      data.gallery.push(newImg);
      writeLocalJson(data);
      res.status(201).json(newImg);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/gallery/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    if (pool) {
      const result = await pool.query("DELETE FROM gallery WHERE id=$1 RETURNING *", [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Gallery item not found' });
      res.json({ message: 'Gallery item deleted', item: result.rows[0] });
    } else {
      const data = readLocalJson();
      const index = data.gallery.findIndex(g => g.id === parseInt(id));
      if (index === -1) return res.status(404).json({ error: 'Gallery item not found' });
      const deletedItem = data.gallery.splice(index, 1)[0];
      writeLocalJson(data);
      res.json({ message: 'Gallery item deleted', item: deletedItem });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Testimonials
app.post('/api/admin/testimonials', authenticateAdmin, async (req, res) => {
  const { text, author, role } = req.body;
  try {
    if (pool) {
      const result = await pool.query(
        "INSERT INTO testimonials (testimonial_text, author, role) VALUES ($1, $2, $3) RETURNING *",
        [text, author, role]
      );
      res.status(201).json({
        id: result.rows[0].id,
        text: result.rows[0].testimonial_text,
        author: result.rows[0].author,
        role: result.rows[0].role
      });
    } else {
      const data = readLocalJson();
      if (!data.testimonials) data.testimonials = [];
      const newId = data.testimonials.length > 0 ? Math.max(...data.testimonials.map(t => t.id)) + 1 : 1;
      const newTest = { id: newId, text, author, role };
      data.testimonials.push(newTest);
      writeLocalJson(data);
      res.status(201).json(newTest);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/testimonials/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { text, author, role } = req.body;
  try {
    if (pool) {
      const result = await pool.query(
        "UPDATE testimonials SET testimonial_text=$1, author=$2, role=$3 WHERE id=$4 RETURNING *",
        [text, author, role, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Testimonial not found' });
      res.json({
        id: result.rows[0].id,
        text: result.rows[0].testimonial_text,
        author: result.rows[0].author,
        role: result.rows[0].role
      });
    } else {
      const data = readLocalJson();
      const test = data.testimonials.find(t => t.id === parseInt(id));
      if (!test) return res.status(404).json({ error: 'Testimonial not found' });
      test.text = text;
      test.author = author;
      test.role = role;
      writeLocalJson(data);
      res.json(test);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/testimonials/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    if (pool) {
      const result = await pool.query("DELETE FROM testimonials WHERE id=$1 RETURNING *", [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Testimonial not found' });
      res.json({ message: 'Testimonial deleted successfully', testimonial: result.rows[0] });
    } else {
      const data = readLocalJson();
      const index = data.testimonials.findIndex(t => t.id === parseInt(id));
      if (index === -1) return res.status(404).json({ error: 'Testimonial not found' });
      const deletedTest = data.testimonials.splice(index, 1)[0];
      writeLocalJson(data);
      res.json({ message: 'Testimonial deleted successfully', testimonial: deletedTest });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUBLIC: Submit Contact Message
app.post('/api/messages', async (req, res) => {
  const { name, email, subject, message } = req.body;
  try {
    if (pool) {
      const result = await pool.query(
        "INSERT INTO messages (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, email, subject, message]
      );
      res.status(201).json(result.rows[0]);
    } else {
      const data = readLocalJson();
      if (!data.messages) data.messages = [];
      const newId = data.messages.length > 0 ? Math.max(...data.messages.map(m => m.id)) + 1 : 1;
      const newMessage = {
        id: newId,
        name,
        email,
        subject,
        message,
        created_at: new Date().toISOString()
      };
      data.messages.push(newMessage);
      writeLocalJson(data);
      res.status(201).json(newMessage);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Get Messages
app.get('/api/admin/messages', authenticateAdmin, async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query("SELECT * FROM messages ORDER BY id DESC");
      res.json(result.rows);
    } else {
      const data = readLocalJson();
      res.json(data.messages || []);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Delete Message
app.delete('/api/admin/messages/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    if (pool) {
      const result = await pool.query("DELETE FROM messages WHERE id=$1 RETURNING *", [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Message not found' });
      res.json({ message: 'Message deleted successfully', message: result.rows[0] });
    } else {
      const data = readLocalJson();
      const index = data.messages.findIndex(m => m.id === parseInt(id));
      if (index === -1) return res.status(404).json({ error: 'Message not found' });
      const deletedMsg = data.messages.splice(index, 1)[0];
      writeLocalJson(data);
      res.json({ message: 'Message deleted successfully', message: deletedMsg });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Image Upload
app.post('/api/admin/upload', authenticateAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Check for ImgBB API Key
  const imgbbKey = process.env.IMGBB_API_KEY;
  if (imgbbKey) {
    console.log("Uploading to ImgBB cloud storage...");
    const https = require('https');
    try {
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${req.file.originalname}"\r\nContent-Type: ${req.file.mimetype}\r\n\r\n`);
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
      const bodyBuffer = Buffer.concat([header, req.file.buffer, footer]);

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length
        }
      };

      const fileUrl = await new Promise((resolve, reject) => {
        const imgbbReq = https.request(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, requestOptions, (imgbbRes) => {
          let responseData = '';
          imgbbRes.on('data', chunk => responseData += chunk);
          imgbbRes.on('end', () => {
            try {
              const parsed = JSON.parse(responseData);
              if (parsed.success) {
                resolve(parsed.data.url);
              } else {
                reject(new Error(parsed.error ? parsed.error.message : 'Unknown ImgBB error'));
              }
            } catch (e) {
              reject(e);
            }
          });
        });
        imgbbReq.on('error', reject);
        imgbbReq.write(bodyBuffer);
        imgbbReq.end();
      });

      // Cleanup local temp file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.json({ url: fileUrl });
    } catch (err) {
      console.error("ImgBB upload failed, falling back to base64 storage:", err.message);
    }
  }

  // Convert the uploaded file to a base64 Data URL so it is stored directly in DB/JSON.
  // This prevents images from disappearing on ephemeral serverless platforms like Vercel.
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64Image = fileBuffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;
    
    // Cleanup local temp file immediately to save disk space
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.json({ url: dataUrl });
  } catch (err) {
    console.error("Base64 conversion failed, returning relative path fallback:", err);
    const relativeUrl = `images/uploads/${req.file.filename}`;
    res.json({ url: relativeUrl });
  }
});

// Route everything else to the portfolio static site
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'john', 'index.html'));
});

// Initialize database connection, then start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
