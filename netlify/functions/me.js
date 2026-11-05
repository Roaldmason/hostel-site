const pool = require('./db');
const auth = require('./auth');
const res = (code, obj) => ({ statusCode: code, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  const user = auth(event);
  if (!user) return res(401, { error: 'Please log in' });
  try {
    const s = await pool.query('SELECT student_no, student_name, email FROM student WHERE student_no=$1', [user.studentNo]);
    const b = await pool.query(
      `SELECT r.registration_id, r.room_id, r.allocation_date, r.payment_status, r.semester_fee, rm.room_type, h.hostel_name
       FROM registration r JOIN room rm ON rm.room_number=r.room_id JOIN hostel h ON h.hostel_id=rm.hostel_id
       WHERE r.student_no=$1`, [user.studentNo]);
    const booking = b.rows[0] || null;
    let payments = [];
    if (booking) payments = (await pool.query(
      'SELECT method, amount, reference, paid_at FROM payment WHERE registration_id=$1 ORDER BY paid_at DESC',
      [booking.registration_id])).rows;
    return res(200, { student: s.rows[0], booking, payments });
  } catch (e) { return res(500, { error: 'Server error' }); }
};
