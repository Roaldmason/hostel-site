const pool = require('./db');
const auth = require('./auth');
const res = (code, obj) => ({ statusCode: code, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  const user = auth(event);
  if (!user) return res(401, { error: 'Please log in' });
  try {
    const r = await pool.query("DELETE FROM registration WHERE student_no=$1 AND payment_status='Unpaid' RETURNING registration_id", [user.studentNo]);
    if (!r.rows[0]) return res(400, { error: 'Only unpaid bookings can be cancelled' });
    return res(200, { message: 'Booking cancelled. You can choose another room.' });
  } catch (e) { return res(500, { error: 'Server error' }); }
};
