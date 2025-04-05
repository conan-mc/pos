const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

// استخدام قاعدة بيانات SQLite
const db = require('./db-init');

// التأكد من وجود مجلدات الصور
const uploadDirs = [
  'public/uploads',
  'public/uploads/products',
  'public/uploads/logos'
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } catch (err) {
      console.error(`Error creating directory ${dir}:`, err);
    }
  }
});

// إنشاء تطبيق Express
const app = express();

// إعداد المحرك للقوالب
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// إعداد قوالب EJS
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// إعداد جلسات المستخدم
app.use(session({
  secret: 'pos_system_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // صلاحية لمدة يوم واحد
}));

// إعداد multer لرفع الملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'public/uploads/';

    // تحديد المجلد المناسب بناءً على نوع الملف
    if (req.originalUrl.includes('/products')) {
      uploadPath += 'products/';
    } else if (req.originalUrl.includes('/settings')) {
      uploadPath += 'logos/';
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // إنشاء اسم فريد للملف باستخدام الطابع الزمني والامتداد الأصلي
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// فلترة الملفات للسماح فقط بالصور
const fileFilter = (req, file, cb) => {
  // قبول الصور فقط
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('يسمح فقط برفع ملفات الصور'), false);
  }
};

// إنشاء متغير لرفع الملفات
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // الحد الأقصى لحجم الملف: 5 ميجابايت
  }
});

// تحميل إعدادات التطبيق
const loadSettings = require('./middleware/settings');
app.use(loadSettings);

// توفير اتصال قاعدة البيانات لجميع الطلبات
app.use((req, res, next) => {
  req.db = db;
  next();
});

// تضمين المسارات
const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const customerRoutes = require('./routes/customers');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');

// المسارات العامة
app.use('/auth', authRoutes);
app.use('/', dashboardRoutes);

// المسارات المحمية (تتطلب تسجيل الدخول)
const { isAuthenticated } = require('./middleware/auth');
app.use('/products', isAuthenticated, productRoutes);
app.use('/sales', isAuthenticated, salesRoutes);
app.use('/customers', isAuthenticated, customerRoutes);
app.use('/settings', isAuthenticated, settingsRoutes);

// معالج أخطاء multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(500).render('error', {
      title: 'خطأ في رفع الملف',
      message: `مشكلة في رفع الملف: ${err.message}`
    });
  }

  if (err) {
    console.error('General error:', err);
    return res.status(500).render('error', {
      title: 'خطأ',
      message: 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.'
    });
  }

  next();
});

// تعامل مع الأخطاء 404
app.use((req, res) => {
  res.status(404).render('404');
});

// تحديد المنفذ والاستماع للطلبات
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});