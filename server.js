/**
 * AutoShop Backend API
 * Node.js + Express + SQL Server (MSSQL)
 * 
 * Cài đặt: npm install
 * Chạy:    node server.js
 */

const express = require('express');
const sql     = require('mssql');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'autoshop_secret_2026';

// ── MIDDLEWARE ────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── KẾT NỐI SQL SERVER ───────────────────────
const dbConfig = {
  server:   process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'autoshop',
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASS     || '',
  options: {
    encrypt:              false,
    trustServerCertificate: true,
    enableArithAbort:     true,
  },
  pool: {
    max: 10, min: 0, idleTimeoutMillis: 30000
  }
};

let pool;

async function connectDB() {
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Kết nối SQL Server thành công!');
    await seedDefaultData();
  } catch (err) {
    console.error('❌ Lỗi kết nối SQL Server:', err.message);
    console.error('   Kiểm tra file .env — DB_HOST, DB_USER, DB_PASS, DB_NAME');
    process.exit(1);
  }
}

// ── SEED DỮ LIỆU MẶC ĐỊNH ────────────────────
async function seedDefaultData() {
  try {
    // Tạo admin mặc định
    const adminCheck = await pool.request()
      .input('email', sql.NVarChar, 'admin@autoshop.vn')
      .query('SELECT id FROM users WHERE email = @email');

    if (!adminCheck.recordset.length) {
      const hash = await bcrypt.hash('AutoShop@Admin2026', 10);
      await pool.request()
        .input('name',     sql.NVarChar, 'Admin AutoShop')
        .input('email',    sql.NVarChar, 'admin@autoshop.vn')
        .input('phone',    sql.NVarChar, '0337484248')
        .input('city',     sql.NVarChar, 'Bình Dương')
        .input('password', sql.NVarChar, hash)
        .input('role',     sql.NVarChar, 'admin')
        .query('INSERT INTO users (name,email,phone,city,password,role) VALUES (@name,@email,@phone,@city,@password,@role)');
      console.log('✅ Tạo tài khoản admin: admin@autoshop.vn / AutoShop@Admin2026');
    }

    // Seed 4 xe mặc định
    const carCheck = await pool.request()
      .query("SELECT COUNT(*) as c FROM cars WHERE is_shop = 1");
    
    if (!carCheck.recordset[0].c) {
      const defaults = [
        ['DEFAULT-001','Toyota Vios 2023','Toyota','Vios','2023',15000,520,'Trắng','Xăng','Tự động','Xe đẹp, không tai nạn','Bình Dương','Toyota Vios 2023 màu trắng, số tự động, 15.000km.','AutoShop','0337484248'],
        ['DEFAULT-002','Honda City 2022','Honda','City','2022',22000,480,'Đỏ','Xăng','Tự động','Xe đẹp, không tai nạn','Bình Dương','Honda City 2022 màu đỏ, số tự động, 22.000km.','AutoShop','0337484248'],
        ['DEFAULT-003','Mazda CX-5 2023','Mazda','CX-5','2023',10000,820,'Đỏ','Xăng','Tự động','Xe đẹp, không tai nạn','Bình Dương','Mazda CX-5 2023 màu đỏ, tự động, 10.000km.','AutoShop','0337484248'],
        ['DEFAULT-004','Hyundai Accent 2022','Hyundai','Accent','2022',30000,420,'Bạc','Xăng','Số sàn','Xe đẹp, không tai nạn','Bình Dương','Hyundai Accent 2022 màu bạc, số sàn, 30.000km.','AutoShop','0337484248'],
      ];
      for (const d of defaults) {
        await pool.request()
          .input('id',        sql.NVarChar, d[0])
          .input('title',     sql.NVarChar, d[1])
          .input('brand',     sql.NVarChar, d[2])
          .input('model',     sql.NVarChar, d[3])
          .input('year',      sql.NVarChar, d[4])
          .input('km',        sql.Int,      d[5])
          .input('price',     sql.Int,      d[6])
          .input('color',     sql.NVarChar, d[7])
          .input('fuel',      sql.NVarChar, d[8])
          .input('trans',     sql.NVarChar, d[9])
          .input('cond',      sql.NVarChar, d[10])
          .input('prov',      sql.NVarChar, d[11])
          .input('desc',      sql.NVarChar, d[12])
          .input('sname',     sql.NVarChar, d[13])
          .input('sphone',    sql.NVarChar, d[14])
          .query(`IF NOT EXISTS (SELECT id FROM cars WHERE id=@id)
            INSERT INTO cars (id,title,brand,model,year,km,price,color,fuel,transmission,car_condition,province,description,seller_name,seller_phone,status,is_shop)
            VALUES (@id,@title,@brand,@model,@year,@km,@price,@color,@fuel,@trans,@cond,@prov,@desc,@sname,@sphone,'active',1)`);
      }
      console.log('✅ Seed 4 xe mặc định thành công');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

// ── AUTH MIDDLEWARE ───────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Không có quyền admin' });
    next();
  });
}

// ════════════════════════════════════════════
//  API AUTH
// ════════════════════════════════════════════

// Đăng ký
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, city, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });

    const exist = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM users WHERE email = @email');
    if (exist.recordset.length)
      return res.status(400).json({ error: 'Email đã được đăng ký' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.request()
      .input('name',     sql.NVarChar, name)
      .input('email',    sql.NVarChar, email)
      .input('phone',    sql.NVarChar, phone || '')
      .input('city',     sql.NVarChar, city  || '')
      .input('password', sql.NVarChar, hash)
      .query('INSERT INTO users (name,email,phone,city,password,role) OUTPUT INSERTED.id VALUES (@name,@email,@phone,@city,@password,\'user\')');

    const newId = result.recordset[0].id;
    const token = jwt.sign({ id: newId, name, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: newId, name, email, role: 'user' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Đăng nhập
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email OR phone = @email');

    if (!result.recordset.length)
      return res.status(400).json({ error: 'Email/SĐT không tồn tại' });

    const user = result.recordset[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Mật khẩu không đúng' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thông tin user hiện tại
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const result = await pool.request()
    .input('id', sql.Int, req.user.id)
    .query('SELECT id,name,email,phone,city,role,created_at FROM users WHERE id = @id');
  res.json(result.recordset[0] || null);
});

// ════════════════════════════════════════════
//  API CARS
// ════════════════════════════════════════════

// Lấy danh sách xe (public)
app.get('/api/cars', async (req, res) => {
  try {
    const { brand, year, fuel, transmission, maxPrice, search, status } = req.query;
    let q = 'SELECT * FROM cars WHERE 1=1';
    const request = pool.request();

    if (status) { q += ' AND status = @status'; request.input('status', sql.NVarChar, status); }
    else         { q += " AND status = 'active'"; }

    if (brand)  { q += ' AND brand = @brand';  request.input('brand', sql.NVarChar, brand); }
    if (year)   { q += ' AND year = @year';    request.input('year', sql.NVarChar, year); }
    if (fuel)   { q += ' AND fuel = @fuel';    request.input('fuel', sql.NVarChar, fuel); }
    if (transmission) { q += ' AND transmission = @trans'; request.input('trans', sql.NVarChar, transmission); }
    if (maxPrice) { q += ' AND price <= @maxPrice'; request.input('maxPrice', sql.Int, Number(maxPrice)); }
    if (search) {
      q += ' AND (title LIKE @search OR brand LIKE @search OR model LIKE @search)';
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    q += ' ORDER BY created_at DESC';

    const result = await request.query(q);
    const cars = result.recordset.map(r => ({
      ...r,
      photos: (() => { try { return JSON.parse(r.photos || '[]'); } catch { return []; } })()
    }));
    res.json({ success: true, data: cars, total: cars.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy 1 xe
app.get('/api/cars/:id', async (req, res) => {
  try {
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT * FROM cars WHERE id = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Không tìm thấy xe' });
    const car = { ...result.recordset[0], photos: (() => { try { return JSON.parse(result.recordset[0].photos || '[]'); } catch { return []; } })() };
    res.json({ success: true, data: car });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Đăng bán xe
app.post('/api/cars', authMiddleware, async (req, res) => {
  try {
    const {
      title, brand, model, year, km, price,
      color, fuel, transmission,
      car_condition, condition,       // chấp nhận cả 2 tên
      car_type, origin, engine, seats,
      sell_type, car_features,
      province, description,
      seller_name, seller_phone, seller_zalo,
      photos, plan
    } = req.body;

    if (!title || !brand || !price)
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (title, brand, price)' });

    // Xử lý ảnh — có thể là array hoặc JSON string
    let photosStr = '[]';
    try {
      const arr = Array.isArray(photos) ? photos : JSON.parse(photos || '[]');
      photosStr = JSON.stringify(arr);
    } catch { photosStr = '[]'; }

    const id = `CAR-${Date.now()}-${req.user.id}`;
    await pool.request()
      .input('id',       sql.NVarChar, id)
      .input('title',    sql.NVarChar, title)
      .input('brand',    sql.NVarChar, brand)
      .input('model',    sql.NVarChar, model           || '')
      .input('year',     sql.NVarChar, String(year     || ''))
      .input('km',       sql.Int,      Number(km)      || 0)
      .input('price',    sql.Int,      Number(price)   || 0)
      .input('color',    sql.NVarChar, color           || '')
      .input('fuel',     sql.NVarChar, fuel            || '')
      .input('trans',    sql.NVarChar, transmission    || '')
      .input('cond',     sql.NVarChar, car_condition   || condition || '')
      .input('carType',  sql.NVarChar, car_type        || '')
      .input('origin',   sql.NVarChar, origin          || '')
      .input('engine',   sql.NVarChar, engine          || '')
      .input('seats',    sql.Int,      Number(seats)   || 0)
      .input('sellType', sql.NVarChar, sell_type       || '')
      .input('features', sql.NVarChar, car_features    || '[]')
      .input('prov',     sql.NVarChar, province        || '')
      .input('desc',     sql.NVarChar, description     || '')
      .input('sname',    sql.NVarChar, seller_name     || req.user.name)
      .input('sphone',   sql.NVarChar, seller_phone    || '')
      .input('szalo',    sql.NVarChar, seller_zalo     || '')
      .input('photos',   sql.NVarChar, photosStr)
      .input('plan',     sql.NVarChar, plan            || 'free')
      .input('userId',   sql.Int,      req.user.id)
      .query(`
        INSERT INTO cars (
          id, title, brand, model, year, km, price,
          color, fuel, transmission, car_condition,
          car_type, origin, engine, seats,
          sell_type, car_features,
          province, description,
          seller_name, seller_phone, seller_zalo,
          photos, [plan], status, is_shop, user_id
        ) VALUES (
          @id, @title, @brand, @model, @year, @km, @price,
          @color, @fuel, @trans, @cond,
          @carType, @origin, @engine, @seats,
          @sellType, @features,
          @prov, @desc,
          @sname, @sphone, @szalo,
          @photos, @plan, 'pending', 0, @userId
        )
      `);

    res.json({ success: true, data: { id }, message: 'Đăng tin thành công! Chờ admin duyệt.' });
  } catch (err) {
    console.error('POST /api/cars error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Xóa xe
app.delete('/api/cars/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT user_id FROM cars WHERE id = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Không tìm thấy xe' });
    if (result.recordset[0].user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Không có quyền xóa' });
    await pool.request().input('id', sql.NVarChar, req.params.id).query('DELETE FROM cars WHERE id = @id');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sửa xe
app.put('/api/cars/:id', authMiddleware, async (req, res) => {
  try {
    const { status, title, price, km, description } = req.body;
    await pool.request()
      .input('id',     sql.NVarChar, req.params.id)
      .input('status', sql.NVarChar, status || 'pending')
      .input('title',  sql.NVarChar, title  || '')
      .input('price',  sql.Int,      Number(price) || 0)
      .input('km',     sql.Int,      Number(km)    || 0)
      .input('desc',   sql.NVarChar, description   || '')
      .query(`UPDATE cars SET
        status = CASE WHEN @status != '' THEN @status ELSE status END,
        title  = CASE WHEN @title  != '' THEN @title  ELSE title  END,
        price  = CASE WHEN @price  != 0  THEN @price  ELSE price  END,
        km     = CASE WHEN @km     != 0  THEN @km     ELSE km     END
        WHERE id = @id`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Xe của tôi
app.get('/api/my/cars', authMiddleware, async (req, res) => {
  try {
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query('SELECT * FROM cars WHERE user_id = @userId ORDER BY created_at DESC');
    res.json({ success: true, data: result.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════
//  API MESSAGES
// ════════════════════════════════════════════
app.post('/api/messages', async (req, res) => {
  try {
    const { name, phone, email, car_interest, budget, message, contact_time } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Cần tên và SĐT' });
    await pool.request()
      .input('name',   sql.NVarChar, name)
      .input('phone',  sql.NVarChar, phone)
      .input('email',  sql.NVarChar, email        || '')
      .input('car',    sql.NVarChar, car_interest  || '')
      .input('budget', sql.NVarChar, budget        || '')
      .input('msg',    sql.NVarChar, message       || '')
      .input('time',   sql.NVarChar, contact_time  || '')
      .query('INSERT INTO messages (name,phone,email,car_interest,budget,message,contact_time) VALUES (@name,@phone,@email,@car,@budget,@msg,@time)');
    res.json({ success: true, message: 'Đã gửi thông tin!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════
//  API ADMIN
// ════════════════════════════════════════════

// Stats
app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
  try {
    const r = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM cars)                       AS total_cars,
        (SELECT COUNT(*) FROM cars WHERE status='active') AS active,
        (SELECT COUNT(*) FROM cars WHERE status='pending')AS pending,
        (SELECT COUNT(*) FROM cars WHERE status='sold')   AS sold,
        (SELECT COUNT(*) FROM users WHERE role='user')    AS users,
        (SELECT COUNT(*) FROM messages)                   AS messages,
        (SELECT ISNULL(SUM(price),0) FROM cars WHERE status='active') AS total_value
    `);
    res.json(r.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tất cả xe (admin)
app.get('/api/admin/cars', adminMiddleware, async (req, res) => {
  try {
    const { search, status } = req.query;
    let q = 'SELECT c.*, u.name AS user_name FROM cars c LEFT JOIN users u ON c.user_id = u.id WHERE 1=1';
    const request = pool.request();
    if (status) { q += ' AND c.status = @status'; request.input('status', sql.NVarChar, status); }
    if (search) { q += ' AND (c.title LIKE @s OR c.brand LIKE @s OR c.seller_name LIKE @s)'; request.input('s', sql.NVarChar, `%${search}%`); }
    q += ' ORDER BY c.created_at DESC';
    const result = await request.query(q);
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Duyệt / thay đổi trạng thái xe
app.patch('/api/admin/cars/:id/status', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.request()
      .input('status', sql.NVarChar, status)
      .input('id',     sql.NVarChar, req.params.id)
      .query('UPDATE cars SET status = @status WHERE id = @id');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Xóa xe (admin)
app.delete('/api/admin/cars/:id', adminMiddleware, async (req, res) => {
  try {
    await pool.request().input('id', sql.NVarChar, req.params.id).query('DELETE FROM cars WHERE id = @id');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tất cả users (admin)
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    let q = "SELECT id,name,email,phone,city,role,created_at FROM users WHERE 1=1";
    const request = pool.request();
    if (search) { q += ' AND (name LIKE @s OR email LIKE @s OR phone LIKE @s)'; request.input('s', sql.NVarChar, `%${search}%`); }
    q += ' ORDER BY created_at DESC';
    const result = await request.query(q);
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Xóa user (admin)
app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
  try {
    await pool.request().input('id', sql.Int, req.params.id)
      .query("DELETE FROM users WHERE id = @id AND role != 'admin'");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tất cả tin nhắn
app.get('/api/admin/messages', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Xóa tin nhắn
app.delete('/api/admin/messages/:id', adminMiddleware, async (req, res) => {
  try {
    await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM messages WHERE id = @id');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Xóa tất cả tin nhắn
app.delete('/api/admin/messages', adminMiddleware, async (req, res) => {
  try {
    await pool.request().query('DELETE FROM messages');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', db: 'SQL Server', time: new Date() }));

// ── START ─────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 AutoShop API: http://localhost:${PORT}`);
    console.log(`\n📌 Admin: admin@autoshop.vn | AutoShop@Admin2026`);
  });
});
