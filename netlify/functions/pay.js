// DEMO payment: records a payment and marks the booking Paid. No real money moves.
const pool = require('./db');
const auth = require('./auth');
const res = (code, obj) => ({ statusCode: code, body: JSON.stringify(obj) });
const METHODS = ['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money', 'Card', 'Bank Transfer'];

exports.handler = async (event) => {
  const user = auth(event);
  if (!user) return res(401, { error: 'Please log in' });
  const { method } = JSON.parse(event.body || '{}');
  if (!METHODS.includes(method)) return res(400, { error: 'Choose a payment method' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query('SELECT * FROM registration WHERE student_no=$1 FOR UPDATE', [user.studentNo]);
    const reg = r.rows[0];
    if (!reg) { await client.query('ROLLBACK'); return res(404, { error: 'You have no booking yet' }); }
    if (reg.payment_status === 'Paid') { await client.query('ROLLBACK'); return res(400, { error: 'This booking is already paid' }); }
    const ref = 'PAY' + Date.now().toString().slice(-8);
    await client.query('INSERT INTO payment (registration_id, method, amount, reference) VALUES ($1,$2,$3,$4)',
      [reg.registration_id, method, reg.semester_fee, ref]);   // amount comes from the database, not the browser
    await client.query("UPDATE registration SET payment_status='Paid' WHERE registration_id=$1", [reg.registration_id]);
    await client.query('COMMIT');
    return res(200, { message: 'Payment received. Reference: ' + ref, reference: ref });
  } catch (e) { await client.query('ROLLBACK'); return res(500, { error: 'Server error' }); }
  finally { client.release(); }
};
