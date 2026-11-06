-- Run ONCE in Neon (keeps all your existing data)
CREATE TABLE IF NOT EXISTS payment (
  payment_id      INTEGER PRIMARY KEY,
  registration_id VARCHAR(10) NOT NULL REFERENCES registration(registration_id) ON DELETE CASCADE,
  method          VARCHAR(20) NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  reference       VARCHAR(30) NOT NULL,
  paid_at         TIMESTAMP DEFAULT NOW()
);
