// Create an account. Works for students already on the hostel list (activate) AND brand-new students (create)
const pool = require('./db');
const bcrypt = require('bcryptjs');
const res = (code, obj) => ({ statusCode: code, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return res(405, { error: 'Method not allowed' });
  try {
    const b = JSON.parse(event.body || '{}');
    const studentNo = (b.studentNo || '').trim().toUpperCase();
    const { email, password } = b;
    if (!/^[A-Z0-9]{3,20}$/.test(studentNo)) return res(400, { error: 'Student number must be 3-20 letters or numbers' });
    if (!email || !password || password.length < 6) return res(400, { error: 'Enter an email and a password of 6+ characters' });

    const { rows } = await pool.query('SELECT password_hash FROM student WHERE student_no=$1', [studentNo]);
    const hash = await bcrypt.hash(password, 10);

    if (rows[0]) {                                   // already on the list: activate
      if (rows[0].password_hash) return res(409, { error: 'This student number already has an account. Please log in.' });
      await pool.query('UPDATE student SET password_hash=$1, email=$2 WHERE student_no=$3', [hash, email, studentNo]);
      return res(201, { message: 'Account activated. You can now log in.' });
    }

    const name = (b.fullName || '').trim().slice(0, 60);   // brand-new student: create
    const gender = (b.gender || '').toUpperCase();
    const phone = (b.phone || '').trim();
    if (!name || !['M', 'F'].includes(gender) || !/^\d{10}$/.test(phone))
      return res(400, { error: 'New students must also enter full name, gender and a 10-digit phone number' });
    await pool.query(
      'INSERT INTO student (student_no, student_name, gender, phone, email, password_hash) VALUES ($1,$2,$3,$4,$5,$6)',
      [studentNo, name, gender, phone, email, hash]);
    return res(201, { message: 'Account created. You can now log in.' });
  } catch (e) {
    if (e.code === '23505') return res(409, { error: 'That email or student number is already used' });
    return res(500, { error: 'Server error' });
  }
};
