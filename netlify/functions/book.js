const pool = require('./db');
const auth = require('./auth');
const res = (code, obj) => ({ statusCode: code, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  const user = auth(event);
  if (!user) return res(401, { error: 'Please log in' });
  const { roomNumber } = JSON.parse(event.body || '{}');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // lock the room so two students can't take the last space at the same time
    const r = await client.query('SELECT * FROM room WHERE room_number=$1 FOR UPDATE', [roomNumber]);
    const room = r.rows[0];
    if (!room) { await client.query('ROLLBACK'); return res(404, { error: 'Room not found' }); }
    const c = await client.query('SELECT COUNT(*)::int AS taken FROM registration WHERE room_id=$1', [roomNumber]);
    if (c.rows[0].taken >= room.capacity) { await client.query('ROLLBACK'); return res(400, { error: 'This room is full' }); }
    const ins = await client.query(
      'INSERT INTO registration (student_no, room_id, semester_fee) VALUES ($1,$2,$3) RETURNING registration_id',
      [user.studentNo, roomNumber, room.semester_fee]);
    await client.query('COMMIT');
    return res(201, { message: 'Room booked!', registrationId: ins.rows[0].registration_id });
  } catch (e) {
    await client.query('ROLLBACK');
    return res(400, { error: e.code === '23505' ? 'You already have a booking' : 'Server error' });
  } finally { client.release(); }
};
