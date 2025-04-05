const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./pos_database.db');

// إنشاء الجداول إذا لم تكن موجودة
const initDatabase = () => {
  // جدول المنتجات
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      category TEXT,
      image TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول العملاء
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول المبيعات
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'paid',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )
  `);

  // جدول تفاصيل المبيعات
  db.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    )
  `);

  // جدول المستخدمين
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول الإعدادات
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL DEFAULT 'نظام نقاط البيع',
      company_address TEXT,
      company_phone TEXT,
      company_email TEXT,
      company_logo TEXT,
      currency TEXT NOT NULL DEFAULT 'ر.س',
      tax_rate REAL DEFAULT 0,
      invoice_footer TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating tables:', err);
    } else {
      // إنشاء مستخدم افتراضي إذا لم يكن موجودًا
      db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, user) => {
        if (err) {
          console.error('Error checking for default user:', err);
        } else if (!user) {
          // إنشاء مستخدم افتراضي
          db.run(
            'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
            ['admin', 'admin123', 'المدير', 'admin'],
            (err) => {
              if (err) {
                console.error('Error creating default user:', err);
              } else {
                console.log('Default user created successfully!');
              }
            }
          );
        }
      });

      // إنشاء إعدادات افتراضية إذا لم تكن موجودة
      db.get('SELECT * FROM settings WHERE id = 1', (err, settings) => {
        if (err) {
          console.error('Error checking for default settings:', err);
        } else if (!settings) {
          // إنشاء إعدادات افتراضية
          db.run(
            `INSERT INTO settings (
              company_name, company_address, company_phone, company_email, currency, tax_rate, invoice_footer
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              'نظام نقاط البيع',
              'شارع الرئيسي، المدينة',
              '0123456789',
              'info@pos-system.com',
              'ر.س',
              15,
              'شكرًا لتعاملكم معنا. نتمنى لكم تجربة تسوق ممتعة.'
            ],
            (err) => {
              if (err) {
                console.error('Error creating default settings:', err);
              } else {
                console.log('Default settings created successfully!');
              }
            }
          );
        }
      });

      console.log('Database tables created successfully!');
    }
  });
};

// تنفيذ إنشاء الجداول
initDatabase();

module.exports = db;
