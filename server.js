import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = 'school-management-secret-key';

console.log('🚀 Starting Fresh School Management System...');

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const publicDir = path.join(__dirname, 'public');
const templatesDir = path.join(__dirname, 'templates');

[uploadsDir, publicDir, templatesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Database setup
const dbPath = path.join(__dirname, 'school_management.db');
console.log('📁 Database path:', dbPath);

// Check if database exists
let isNewDatabase = false;
if (!fs.existsSync(dbPath)) {
    isNewDatabase = true;
    console.log('📊 Creating new database...');
} else {
    console.log('📊 Using existing database...');
}

const db = new sqlite3.Database(dbPath);

// Initialize database only if new
if (isNewDatabase) {
    db.serialize(() => {
        console.log('📊 Creating database tables...');
        
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'teacher',
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Classes table
        db.run(`CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Sections table
        db.run(`CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Subjects table
        db.run(`CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_name TEXT NOT NULL,
            subject_code TEXT,
            class_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (class_id) REFERENCES classes (id)
        )`);

        // Students table with all required fields
        db.run(`CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            roll_number TEXT UNIQUE NOT NULL,
            class_id INTEGER NOT NULL,
            section_id INTEGER NOT NULL,
            father_name TEXT,
            mother_name TEXT,
            dob DATE,
            phone TEXT,
            address TEXT,
            gender TEXT,
            blood_group TEXT,
            guardian_name TEXT,
            height TEXT,
            weight TEXT,
            divyang_status TEXT DEFAULT 'No',
            photo TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (class_id) REFERENCES classes (id),
            FOREIGN KEY (section_id) REFERENCES sections (id)
        )`);

        // Marks table
        db.run(`CREATE TABLE IF NOT EXISTS marks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            marks_obtained INTEGER NOT NULL,
            max_marks INTEGER DEFAULT 100,
            formative_20 INTEGER,
            summative_80 INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id),
            UNIQUE(student_id, subject_id)
        )`);

        // Create default admin user
        const adminPassword = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT INTO users (username, email, password, role, name) 
                VALUES ('admin', 'admin@school.com', ?, 'admin', 'System Administrator')`, 
                [adminPassword]);

        // Insert sample data
        db.run(`INSERT INTO classes (class_name) VALUES ('Class 10'), ('Class 9'), ('Class 8')`);
        db.run(`INSERT INTO sections (section_name) VALUES ('A'), ('B'), ('C')`);
        db.run(`INSERT INTO subjects (subject_name, subject_code, class_id) VALUES 
                ('Mathematics', 'MATH', 1),
                ('Science', 'SCI', 1),
                ('English', 'ENG', 1),
                ('Hindi', 'HIN', 1),
                ('Social Science', 'SST', 1)`);
        
        db.run(`INSERT INTO students (name, roll_number, class_id, section_id, father_name, mother_name, dob, gender) VALUES 
                ('Rahul Kumar', '001', 1, 1, 'Suresh Kumar', 'Sunita Devi', '2008-05-15', 'Male'),
                ('Priya Sharma', '002', 1, 1, 'Rajesh Sharma', 'Meera Sharma', '2008-07-20', 'Female'),
                ('Amit Singh', '003', 1, 1, 'Vikram Singh', 'Kavita Singh', '2008-03-10', 'Male')`);
        
        db.run(`INSERT INTO marks (student_id, subject_id, marks_obtained, formative_20, summative_80) VALUES 
                (1, 1, 85, 18, 67),
            (1, 2, 78, 16, 62),
            (1, 3, 92, 19, 73),
            (2, 1, 88, 17, 71),
            (2, 2, 82, 18, 64),
            (2, 3, 95, 20, 75),
            (3, 1, 76, 15, 61),
            (3, 2, 80, 17, 63),
            (3, 3, 87, 18, 69)`);

    console.log('✅ Database initialized with sample data');
    });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadsDir));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `student_${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 }, // 1MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin only middleware
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Login route
app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    let query = 'SELECT * FROM users WHERE username = ?';
    let params = [username];

    if (role) {
        query += ' AND role = ?';
        params.push(role);
    }

    db.get(query, params, (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Password comparison error:', err);
                return res.status(500).json({ error: 'Server error' });
            }

            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { 
                    id: user.id, 
                    username: user.username, 
                    role: user.role,
                    name: user.name 
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role
                }
            });
        });
    });
});

// Teachers routes
app.get('/api/teachers', authenticateToken, adminOnly, (req, res) => {
    db.all('SELECT id, username, email, name, role, created_at FROM users WHERE role = "teacher" ORDER BY name', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/teachers', authenticateToken, adminOnly, (req, res) => {
    const { username, email, password, name } = req.body;
    
    if (!username || !email || !password || !name) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Password hashing error:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        
        db.run('INSERT INTO users (username, email, password, role, name) VALUES (?, ?, ?, ?, ?)', 
               [username, email, hashedPassword, 'teacher', name], function(err) {
            if (err) {
                console.error('Database error:', err);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username or email already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ id: this.lastID, username, email, name, role: 'teacher', message: 'Teacher added successfully' });
        });
    });
});

// Classes routes
app.get('/api/classes', authenticateToken, (req, res) => {
    db.all('SELECT * FROM classes ORDER BY class_name', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/classes', authenticateToken, adminOnly, (req, res) => {
    const { class_name } = req.body;
    
    if (!class_name || class_name.trim() === '') {
        return res.status(400).json({ error: 'Class name is required' });
    }
    
    db.run('INSERT INTO classes (class_name) VALUES (?)', [class_name.trim()], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, class_name: class_name.trim(), message: 'Class added successfully' });
    });
});

// Sections routes
app.get('/api/sections', authenticateToken, (req, res) => {
    db.all('SELECT * FROM sections ORDER BY section_name', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/sections', authenticateToken, adminOnly, (req, res) => {
    const { section_name } = req.body;
    
    if (!section_name || section_name.trim() === '') {
        return res.status(400).json({ error: 'Section name is required' });
    }
    
    db.run('INSERT INTO sections (section_name) VALUES (?)', [section_name.trim()], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, section_name: section_name.trim(), message: 'Section added successfully' });
    });
});

// Subjects routes
app.get('/api/subjects', authenticateToken, (req, res) => {
    const query = `
        SELECT s.*, c.class_name 
        FROM subjects s
        LEFT JOIN classes c ON s.class_id = c.id
        ORDER BY s.subject_name
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/subjects', authenticateToken, adminOnly, (req, res) => {
    const { subject_name, subject_code, class_id } = req.body;
    
    if (!subject_name || subject_name.trim() === '') {
        return res.status(400).json({ error: 'Subject name is required' });
    }
    
    db.run('INSERT INTO subjects (subject_name, subject_code, class_id) VALUES (?, ?, ?)', 
           [subject_name.trim(), subject_code, class_id], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, subject_name: subject_name.trim(), subject_code, class_id, message: 'Subject added successfully' });
    });
});

// Students routes
app.get('/api/students', authenticateToken, (req, res) => {
    const query = `
        SELECT s.*, c.class_name, sec.section_name 
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        ORDER BY s.roll_number
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/students', authenticateToken, adminOnly, upload.single('photo'), (req, res) => {
    const { 
        name, roll_number, class_id, section_id, father_name, mother_name, 
        dob, phone, address, gender, blood_group, guardian_name, 
        height, weight, divyang_status 
    } = req.body;
    
    if (!name || !roll_number || !class_id || !section_id) {
        return res.status(400).json({ error: 'Name, roll number, class, and section are required' });
    }
    
    const photoPath = req.file ? req.file.filename : null;
    
    db.run(`INSERT INTO students (
        name, roll_number, class_id, section_id, father_name, mother_name, 
        dob, phone, address, gender, blood_group, guardian_name, 
        height, weight, divyang_status, photo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [name, roll_number, class_id, section_id, father_name, mother_name, 
     dob, phone, address, gender, blood_group, guardian_name, 
     height, weight, divyang_status || 'No', photoPath], function(err) {
        if (err) {
            console.error('Database error:', err);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Roll number already exists' });
            }
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Student added successfully' });
    });
});

// Marks routes
app.get('/api/marks', authenticateToken, (req, res) => {
    const query = `
        SELECT m.*, s.name as student_name, s.roll_number, 
               sub.subject_name, c.class_name, sec.section_name
        FROM marks m
        JOIN students s ON m.student_id = s.id
        JOIN subjects sub ON m.subject_id = sub.id
        JOIN classes c ON s.class_id = c.id
        JOIN sections sec ON s.section_id = sec.id
        ORDER BY s.roll_number, sub.subject_name
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/marks', authenticateToken, (req, res) => {
    const { student_id, subject_id, formative_20, summative_80 } = req.body;
    
    if (!student_id || !subject_id || formative_20 === undefined || summative_80 === undefined) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    const marks_obtained = parseInt(formative_20) + parseInt(summative_80);
    
    db.run(`INSERT OR REPLACE INTO marks (student_id, subject_id, marks_obtained, formative_20, summative_80) 
            VALUES (?, ?, ?, ?, ?)`, 
           [student_id, subject_id, marks_obtained, formative_20, summative_80], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Marks saved successfully' });
    });
});

// PDF Generation Function with Student Photo
async function generateMarksheetPDF(student, marks) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Calculate grades
    const getGrade = (marks) => {
        if (marks >= 90) return { grade: 'A+', remark: 'অসাধারণ' };
        if (marks >= 80) return { grade: 'A', remark: 'খুব ভাল' };
        if (marks >= 70) return { grade: 'B+', remark: 'ভাল' };
        if (marks >= 60) return { grade: 'B', remark: 'মোটামুটি' };
        if (marks >= 50) return { grade: 'C', remark: 'উত্তীর্ণ' };
        return { grade: 'F', remark: 'অকৃতকার্য' };
    };

    // Convert photo to base64 if exists
    let photoBase64 = '';
    if (student.photo) {
        try {
            const photoPath = path.join(__dirname, 'uploads', student.photo);
            if (fs.existsSync(photoPath)) {
                const photoBuffer = fs.readFileSync(photoPath);
                const photoExt = path.extname(student.photo).toLowerCase();
                const mimeType = photoExt === '.png' ? 'image/png' : 'image/jpeg';
                photoBase64 = `data:${mimeType};base64,${photoBuffer.toString('base64')}`;
            }
        } catch (error) {
            console.log('Photo loading error:', error);
        }
    }
    
    // Generate HTML content with student photo and all details - Exact format from images
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>সার্বিক প্রগতি নির্দেশনা পত্র</title>
        <style>
            body { font-family: 'SolaimanLipi', Arial, sans-serif; margin: 0; padding: 10px; font-size: 11px; background: #f0f8ff; }
            .marksheet { max-width: 800px; margin: 0 auto; border: 3px solid #4169E1; background: white; }
            
            /* Header with logo and school info */
            .header { background: linear-gradient(135deg, #87CEEB, #4169E1); color: white; text-align: center; padding: 12px; position: relative; }
            .logo { width: 50px; height: 50px; background: white; border-radius: 50%; position: absolute; left: 20px; top: 10px; display: flex; align-items: center; justify-content: center; color: #4169E1; font-weight: bold; font-size: 16px; }
            .school-info { margin: 0 80px; }
            .school-name { font-size: 20px; font-weight: bold; margin-bottom: 3px; }
            .title { font-size: 16px; margin-bottom: 2px; }
            .subtitle { font-size: 13px; }
            .class-info { font-size: 12px; margin-top: 5px; }
            
            /* School details section */
            .school-details { padding: 8px 15px; background: #f8f9fa; font-size: 10px; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .details-row input { border: none; border-bottom: 1px dotted #666; background: transparent; width: 150px; }
            
            /* Student info with photo */
            .student-section { display: flex; padding: 10px 15px; }
            .student-details { flex: 1; }
            .student-photo { width: 100px; height: 120px; border: 2px solid #4169E1; margin-left: 15px; display: flex; align-items: center; justify-content: center; background: #f0f8ff; }
            .student-photo img { max-width: 95%; max-height: 95%; object-fit: cover; }
            .photo-label { position: absolute; margin-top: 125px; font-size: 9px; text-align: center; width: 100px; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 5px; font-size: 10px; }
            .info-full { margin-bottom: 5px; font-size: 10px; }
            .info-item { display: flex; }
            .info-item label { min-width: 80px; font-weight: bold; }
            .info-item input { border: none; border-bottom: 1px dotted #666; background: transparent; flex: 1; }
            
            /* Marks table */
            .marks-section { padding: 0 15px; }
            .marks-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10px; }
            .marks-table th, .marks-table td { border: 1px solid #333; padding: 4px; text-align: center; }
            .marks-table th { background: #4169E1; color: white; font-size: 9px; font-weight: bold; }
            .subject-col { text-align: left; padding-left: 8px; }
            
            /* Learning profile section */
            .learning-profile { margin: 10px 15px; }
            .lp-title { background: #4169E1; color: white; text-align: center; padding: 5px; font-size: 11px; font-weight: bold; }
            .lp-table { width: 100%; border-collapse: collapse; font-size: 9px; }
            .lp-table th, .lp-table td { border: 1px solid #333; padding: 3px; text-align: center; }
            .lp-table th { background: #87CEEB; font-weight: bold; }
            .lp-category { text-align: left; padding-left: 5px; font-weight: bold; }
            
            /* Footer */
            .footer { padding: 15px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 20px; }
            .signature-box { text-align: center; }
            .signature-line { border-bottom: 1px solid #333; width: 120px; height: 30px; margin-bottom: 5px; }
            .date-section { text-align: center; margin-top: 15px; font-size: 10px; }
        </style>
    </head>
    <body>
        <div class="marksheet">
            <!-- Header -->
            <div class="header">
                <div class="logo">🎓</div>
                <div class="school-info">
                    <div class="school-name">সার্বিক প্রগতি নির্দেশনা পত্র</div>
                    <div class="title">Holistic Progress Report Card</div>
                    <div class="class-info">পঞ্চম শ্রেণী / For Class V</div>
                </div>
            </div>
            
            <!-- School Details -->
            <div class="school-details">
                <div class="details-row">
                    <span>বিদ্যালয়ের নাম (Name of the School): <input type="text" value="আদর্শ বিদ্যালয়" readonly></span>
                </div>
                <div class="details-row">
                    <span>গ্রাম / ওয়ার্ড: <input type="text" readonly></span>
                    <span>বৃত্ত: <input type="text" readonly></span>
                    <span>জেলা: <input type="text" readonly></span>
                </div>
                <div class="details-row">
                    <span>বিদ্যালয় ওয়েবসাইট + কোড: <input type="text" readonly></span>
                    <span>UDISE + Code of School: <input type="text" readonly></span>
                </div>
                <div class="details-row">
                    <span>বিদ্যালয়ের ই-মেইল: <input type="text" readonly></span>
                    <span>বিদ্যালয়ের ওয়েবসাইট: <input type="text" readonly></span>
                </div>
                <div class="details-row">
                    <span>বিদ্যালয়ের দূরভাষ নং: <input type="text" readonly></span>
                    <span>School Website: <input type="text" readonly></span>
                </div>
            </div>
            
            <!-- Student Information -->
            <div class="student-section">
                <div class="student-details">
                    <div class="info-grid">
                        <div class="info-item">
                            <label>ছাত্র/ছাত্রীর নাম:</label>
                            <input type="text" value="${student.name}" readonly>
                        </div>
                        <div class="info-item">
                            <label>Name of Student:</label>
                            <input type="text" value="${student.name}" readonly>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>শ্রেণী:</label>
                            <input type="text" value="${student.class_name}" readonly>
                        </div>
                        <div class="info-item">
                            <label>Class:</label>
                            <input type="text" value="${student.class_name}" readonly>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>শাখা:</label>
                            <input type="text" value="${student.section_name}" readonly>
                        </div>
                        <div class="info-item">
                            <label>Section:</label>
                            <input type="text" value="${student.section_name}" readonly>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>রোল নং:</label>
                            <input type="text" value="${student.roll_number}" readonly>
                        </div>
                        <div class="info-item">
                            <label>Roll no.:</label>
                            <input type="text" value="${student.roll_number}" readonly>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>জন্ম তারিখ:</label>
                            <input type="text" value="${student.dob ? new Date(student.dob).toLocaleDateString() : ''}" readonly>
                        </div>
                        <div class="info-item">
                            <label>Date of Birth:</label>
                            <input type="text" value="${student.dob ? new Date(student.dob).toLocaleDateString() : ''}" readonly>
                        </div>
                    </div>
                    <div class="info-full">
                        <div class="info-item">
                            <label>Student's ID or DSP:</label>
                            <input type="text" style="width: 300px;" readonly>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>মাতার নাম:</label>
                            <input type="text" value="${student.mother_name || ''}" readonly>
                        </div>
                        <div class="info-item">
                            <label>Mother's Name:</label>
                            <input type="text" value="${student.mother_name || ''}" readonly>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>রক্তের গ্রুপ:</label>
                            <input type="text" value="${student.blood_group || ''}" readonly>
                        </div>
                        <div class="info-item">
                            <label>Blood Group:</label>
                            <input type="text" value="${student.blood_group || ''}" readonly>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>উচ্চতা:</label>
                            <input type="text" value="${student.height || ''}" readonly>
                        </div>
                        <div class="info-item">
                            <label>Height:</label>
                            <input type="text" value="${student.height || ''}" readonly>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>ওজন:</label>
                            <input type="text" value="${student.weight || ''}" readonly>
                        </div>
                        <div class="info-item">
                            <label>Weight:</label>
                            <input type="text" value="${student.weight || ''}" readonly>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>পিতার নাম:</label>
                            <input type="text" value="${student.father_name || ''}" readonly>
                        </div>
                        <div class="info-item">
                            <label>Father's Name:</label>
                            <input type="text" value="${student.father_name || ''}" readonly>
                        </div>
                    </div>
                    <div class="info-full">
                        <div class="info-item">
                            <label>অভিভাবক/অভিভাবিকার নাম:</label>
                            <input type="text" value="${student.guardian_name || student.father_name || ''}" style="width: 250px;" readonly>
                        </div>
                        <div class="info-item">
                            <label>Guardian's Name:</label>
                            <input type="text" value="${student.guardian_name || student.father_name || ''}" style="width: 200px;" readonly>
                        </div>
                    </div>
                    <div class="info-full">
                        <div class="info-item">
                            <label>যোগাযোগ নং:</label>
                            <input type="text" value="${student.phone || ''}" style="width: 150px;" readonly>
                        </div>
                        <div class="info-item">
                            <label>Contact No.:</label>
                            <input type="text" value="${student.phone || ''}" style="width: 150px;" readonly>
                        </div>
                    </div>
                    <div class="info-full">
                        <div class="info-item">
                            <label>ঠিকানা:</label>
                            <input type="text" value="${student.address || ''}" style="width: 400px;" readonly>
                        </div>
                    </div>
                    <div class="info-full">
                        <div class="info-item">
                            <label>Student's Address:</label>
                            <input type="text" value="${student.address || ''}" style="width: 400px;" readonly>
                        </div>
                    </div>
                    <div class="info-full">
                        <div class="info-item">
                            <label>দিব্যাঙ্গ (CWSN) (Yes/No):</label>
                            <input type="text" value="${student.divyang_status || 'No'}" style="width: 100px;" readonly>
                        </div>
                    </div>
                </div>
                <div style="position: relative;">
                    <div class="student-photo">
                        ${photoBase64 ? `<img src="${photoBase64}" alt="Student Photo">` : '<div style="color: #999; font-size: 10px;">No Photo</div>'}
                    </div>
                    <div class="photo-label">ছাত্র/ছাত্রীর ছবি<br>Photograph of student</div>
                </div>
            </div>
            
            <!-- Academic Performance -->
            <div class="marks-section">
                <table class="marks-table">
                    <thead>
                        <tr>
                            <th rowspan="2">বিষয়<br>Subject</th>
                            <th colspan="2">মূল্যায়ন<br>Assessment</th>
                            <th rowspan="2">মোট নম্বর<br>Total Marks</th>
                            <th rowspan="2">গ্রেড<br>Grade</th>
                            <th rowspan="2">মন্তব্য<br>Remarks</th>
                        </tr>
                        <tr>
                            <th>গঠনমূলক<br>Formative</th>
                            <th>সমষ্টিগত<br>Summative</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marks.map(mark => {
                            const gradeInfo = getGrade(mark.marks_obtained);
                            return `
                            <tr>
                                <td class="subject-col">${mark.subject_name}</td>
                                <td>${mark.formative_20}</td>
                                <td>${mark.summative_80}</td>
                                <td><strong>${mark.marks_obtained}</strong></td>
                                <td><strong>${gradeInfo.grade}</strong></td>
                                <td>${gradeInfo.remark}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Learning Profile -->
            <div class="learning-profile">
                <div class="lp-title">শিখন অভিজ্ঞতার বিবরণ (Learning Profile)</div>
                <table class="lp-table">
                    <thead>
                        <tr>
                            <th rowspan="2">বিষয়<br>Subject</th>
                            <th colspan="4">দক্ষতার মাত্রা<br>Level of Proficiency</th>
                        </tr>
                        <tr>
                            <th>A</th>
                            <th>B</th>
                            <th>C</th>
                            <th>D</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="lp-category">ভাষা ও যোগাযোগ<br>Language and Communication</td>
                            <td></td><td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td class="lp-category">গণিত ও যুক্তি<br>Mathematics and Reasoning</td>
                            <td></td><td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td class="lp-category">বিজ্ঞান ও প্রযুক্তি<br>Science and Technology</td>
                            <td></td><td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td class="lp-category">সামাজিক বিজ্ঞান<br>Social Science</td>
                            <td></td><td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td class="lp-category">শিল্প ও সংস্কৃতি<br>Arts and Culture</td>
                            <td></td><td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td class="lp-category">স্বাস্থ্য ও শারীরিক শিক্ষা<br>Health and Physical Education</td>
                            <td></td><td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td class="lp-category">কাজ ও শিক্ষা<br>Work and Education</td>
                            <td></td><td></td><td></td><td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <div class="signature-section">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>শ্রেণী শিক্ষক<br>Class Teacher</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>প্রধান শিক্ষক<br>Head Teacher</div>
                    </div>
                </div>
                <div class="date-section">
                    <strong>তারিখ / Date: ${new Date().toLocaleDateString()}</strong>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15px', bottom: '15px', left: '15px', right: '15px' }
    });
    
    await browser.close();
    return pdfBuffer;
}

// Change password route
app.post('/api/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    // Get current user's password
    db.get('SELECT password FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
            if (err) {
                console.error('Password comparison error:', err);
                return res.status(500).json({ error: 'Server error' });
            }
            
            if (!isMatch) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            
            // Hash new password and update
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('Password hashing error:', err);
                    return res.status(500).json({ error: 'Server error' });
                }
                
                db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id], function(err) {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    res.json({ message: 'Password changed successfully' });
                });
            });
        });
    });
});

// Generate class-wise marksheet
app.get('/api/marksheet/class/:classId', authenticateToken, async (req, res) => {
    const { classId } = req.params;

    try {
        console.log('📄 Generating class marksheet for class ID:', classId);
        
        // Get class data
        const classQuery = 'SELECT * FROM classes WHERE id = ?';
        const classData = await new Promise((resolve, reject) => {
            db.get(classQuery, [classId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!classData) {
            return res.status(404).json({ error: 'Class not found' });
        }

        // Get all students in the class with their marks
        const studentsQuery = `
            SELECT s.*, c.class_name, sec.section_name 
            FROM students s
            JOIN classes c ON s.class_id = c.id
            LEFT JOIN sections sec ON s.section_id = sec.id
            WHERE s.class_id = ?
            ORDER BY s.roll_number
        `;
        
        const students = await new Promise((resolve, reject) => {
            db.all(studentsQuery, [classId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        if (students.length === 0) {
            return res.status(404).json({ error: 'No students found in this class' });
        }

        // Generate individual marksheets for each student and combine them
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        let combinedHTML = '';
        
        for (const student of students) {
            // Get marks for this student
            const marksQuery = `
                SELECT m.*, sub.subject_name, sub.subject_code
                FROM marks m
                JOIN subjects sub ON m.subject_id = sub.id
                WHERE m.student_id = ?
            `;
            
            const marks = await new Promise((resolve, reject) => {
                db.all(marksQuery, [student.id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

            // Generate individual marksheet HTML
            const studentHTML = await generateStudentMarksheetHTML(student, marks);
            combinedHTML += studentHTML + '<div style="page-break-after: always;"></div>';
        }

        const page = await browser.newPage();
        await page.setContent(combinedHTML, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '15px', bottom: '15px', left: '15px', right: '15px' }
        });
        
        await browser.close();

        console.log('✅ Class marksheet generated successfully');

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="class-marksheet-${classData.class_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        
        // Send PDF buffer
        res.end(pdfBuffer);

    } catch (error) {
        console.error('❌ Error generating class marksheet:', error);
        res.status(500).json({ 
            error: 'Failed to generate class marksheet', 
            details: error.message
        });
    }
});

// Helper function to generate individual student marksheet HTML
async function generateStudentMarksheetHTML(student, marks) {
    // Calculate grades
    const getGrade = (marks) => {
        if (marks >= 90) return { grade: 'A+', remark: 'অসাধারণ' };
        if (marks >= 80) return { grade: 'A', remark: 'খুব ভাল' };
        if (marks >= 70) return { grade: 'B+', remark: 'ভাল' };
        if (marks >= 60) return { grade: 'B', remark: 'মোটামুটি' };
        if (marks >= 50) return { grade: 'C', remark: 'উত্তীর্ণ' };
        return { grade: 'F', remark: 'অকৃতকার্য' };
    };

    // Convert photo to base64 if exists
    let photoBase64 = '';
    if (student.photo) {
        try {
            const photoPath = path.join(__dirname, 'uploads', student.photo);
            if (fs.existsSync(photoPath)) {
                const photoBuffer = fs.readFileSync(photoPath);
                const photoExt = path.extname(student.photo).toLowerCase();
                const mimeType = photoExt === '.png' ? 'image/png' : 'image/jpeg';
                photoBase64 = `data:${mimeType};base64,${photoBuffer.toString('base64')}`;
            }
        } catch (error) {
            console.log('Photo loading error:', error);
        }
    }
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>সার্বিক প্রগতি নির্দেশনা পত্র</title>
        <style>
            body { font-family: 'SolaimanLipi', Arial, sans-serif; margin: 0; padding: 15px; font-size: 12px; }
            .marksheet { max-width: 800px; margin: 0 auto; border: 3px solid #2196F3; }
            .header { background: linear-gradient(45deg, #FF6B6B, #4ECDC4); color: white; text-align: center; padding: 15px; }
            .school-name { font-size: 22px; font-weight: bold; margin-bottom: 8px; }
            .title { font-size: 18px; margin-bottom: 5px; }
            .subtitle { font-size: 14px; }
            .student-info { padding: 15px; background: #f8f9fa; display: flex; }
            .student-details { flex: 1; }
            .student-photo { width: 120px; height: 150px; border: 2px solid #ddd; margin-left: 15px; display: flex; align-items: center; justify-content: center; background: #f9f9f9; }
            .student-photo img { max-width: 100%; max-height: 100%; object-fit: cover; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .info-full { margin-bottom: 8px; }
            .marks-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
            .marks-table th, .marks-table td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            .marks-table th { background: #2196F3; color: white; font-size: 10px; }
            .grade-a { background: #4CAF50; color: white; }
            .grade-b { background: #FF9800; color: white; }
            .grade-c { background: #FFC107; }
            .grade-f { background: #F44336; color: white; }
            .footer { text-align: center; padding: 15px; background: #f8f9fa; }
            .signature { margin-top: 20px; display: flex; justify-content: space-between; }
            .physical-info { display: flex; justify-content: space-between; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="marksheet">
            <div class="header">
                <div class="school-name">🎓 আদর্শ বিদ্যালয়</div>
                <div class="title">সার্বিক প্রগতি নির্দেশনা পত্র</div>
                <div class="subtitle">Holistic Progress Report Card</div>
            </div>
            
            <div class="student-info">
                <div class="student-details">
                    <div class="info-row">
                        <span><strong>নাম / Name:</strong> ${student.name}</span>
                        <span><strong>রোল নং / Roll:</strong> ${student.roll_number}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>শ্রেণী / Class:</strong> ${student.class_name}</span>
                        <span><strong>শাখা / Section:</strong> ${student.section_name}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>পিতার নাম / Father:</strong> ${student.father_name || 'N/A'}</span>
                        <span><strong>লিঙ্গ / Gender:</strong> ${student.gender || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>মাতার নাম / Mother:</strong> ${student.mother_name || 'N/A'}</span>
                        <span><strong>জন্ম তারিখ / DOB:</strong> ${student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div class="info-full">
                        <strong>ঠিকানা / Address:</strong> ${student.address || 'N/A'}
                    </div>
                    <div class="physical-info">
                        <span><strong>উচ্চতা / Height:</strong> ${student.height || 'N/A'}</span>
                        <span><strong>ওজন / Weight:</strong> ${student.weight || 'N/A'}</span>
                        <span><strong>রক্তের গ্রুপ / Blood Group:</strong> ${student.blood_group || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>অভিভাবক / Guardian:</strong> ${student.guardian_name || student.father_name || 'N/A'}</span>
                        <span><strong>দিব্যাঙ্গ / Divyang:</strong> ${student.divyang_status || 'No'}</span>
                    </div>
                </div>
                <div class="student-photo">
                    ${photoBase64 ? `<img src="${photoBase64}" alt="Student Photo">` : '<div style="color: #999;">No Photo</div>'}
                </div>
            </div>
            
            <table class="marks-table">
                <thead>
                    <tr>
                        <th>বিষয় / Subject</th>
                        <th>গঠনমূলক / Formative (20)</th>
                        <th>সমষ্টিগত / Summative (80)</th>
                        <th>মোট / Total (100)</th>
                        <th>গ্রেড / Grade</th>
                        <th>মন্তব্য / Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    ${marks.map(mark => {
                        const gradeInfo = getGrade(mark.marks_obtained);
                        return `
                        <tr>
                            <td>${mark.subject_name}</td>
                            <td>${mark.formative_20}</td>
                            <td>${mark.summative_80}</td>
                            <td>${mark.marks_obtained}</td>
                            <td class="grade-${gradeInfo.grade.toLowerCase().replace('+', '')}">${gradeInfo.grade}</td>
                            <td>${gradeInfo.remark}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <div class="signature">
                    <div>
                        <div>শ্রেণী শিক্ষক</div>
                        <div>Class Teacher</div>
                    </div>
                    <div>
                        <div>প্রধান শিক্ষক</div>
                        <div>Head Teacher</div>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <small>তারিখ / Date: ${new Date().toLocaleDateString()}</small>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

// Generate individual student marksheet
app.get('/api/marksheet/student/:studentId', authenticateToken, async (req, res) => {
    const { studentId } = req.params;

    try {
        console.log('📄 Generating marksheet for student ID:', studentId);
        
        // Get student data
        const studentQuery = `
            SELECT s.*, c.class_name, sec.section_name 
            FROM students s
            JOIN classes c ON s.class_id = c.id
            JOIN sections sec ON s.section_id = sec.id
            WHERE s.id = ?
        `;
        
        const student = await new Promise((resolve, reject) => {
            db.get(studentQuery, [studentId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Get marks data
        const marksQuery = `
            SELECT m.*, sub.subject_name, sub.subject_code
            FROM marks m
            JOIN subjects sub ON m.subject_id = sub.id
            WHERE m.student_id = ?
        `;
        
        const marks = await new Promise((resolve, reject) => {
            db.all(marksQuery, [studentId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        console.log('🔄 Starting PDF generation...');
        const pdfBuffer = await generateMarksheetPDF(student, marks);
        console.log('✅ PDF generated successfully, size:', pdfBuffer.length);

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="marksheet-${student.name.replace(/[^a-zA-Z0-9]/g, '_')}-${student.roll_number}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        
        // Send PDF buffer
        res.end(pdfBuffer);

    } catch (error) {
        console.error('❌ Error generating marksheet:', error);
        res.status(500).json({ 
            error: 'Failed to generate marksheet', 
            details: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
    console.log('');
    console.log('🎉 ================================');
    console.log('✅ Fresh School Management System Ready!');
    console.log('🌐 URL: http://localhost:' + PORT);
    console.log('👤 Admin: admin / admin123');
    console.log('📄 PDF Marksheets: Working');
    console.log('🎉 ================================');
    console.log('');
}).on('error', (err) => {
    console.error('❌ Server startup error:', err);
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use. Please stop other processes first.`);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        db.close();
        console.log('✅ Server stopped.');
        process.exit(0);
    });
});

export default app;
