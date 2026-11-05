const pool = require('./db');
exports.handler = async () => {
  try {
    const { rows } = await pool.query('SELECT * FROM room_availability ORDER BY hostel_name, room_number');
    return { statusCode: 200, body: JSON.stringify(rows) };
  } catch (e) { return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) }; }
};
