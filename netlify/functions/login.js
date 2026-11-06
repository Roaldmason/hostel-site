const pool = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const res = (code, obj) => ({ statusCode: code, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const studentNo = (body.studentNo || '').trim().toUpperCase();
    const password = body.password;
    if (!/^ST(10[1-9]|11\d|12\d|130)$/.test(studentNo)) return res(400, { error: 'Invalid student number. Use ST followed by a number from 101 to 130, for example ST101.' });
    const { rows } = await pool.query('SELECT student_no, student_name, password_hash FROM student WHERE student_no=$1', [studentNo]);
    const u = rows[0];
    if (!u || !u.password_hash || !(await bcrypt.compare(password || '', u.password_hash)))
      return res(401, { error: 'Invalid student number or password' });
    const token = jwt.sign({ studentNo: u.student_no }, process.env.JWT_SECRET, { expiresIn: '2h' });
    return res(200, { token, name: u.student_name });
  } catch (e) { return res(500, { error: 'Server error' }); }
};
