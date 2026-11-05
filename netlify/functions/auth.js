const jwt = require('jsonwebtoken');
module.exports = (event) => {
  try { return jwt.verify((event.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET); }
  catch { return null; }
};
