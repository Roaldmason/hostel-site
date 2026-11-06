const API = '/.netlify/functions/';
const page = document.body.dataset.page;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => 'GH₵ ' + Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 });
const show = (t, ok) => { const e = $('msg'); e.textContent = t; e.className = 'msg ' + (ok ? 'ok' : 'bad'); };
const logout = () => { sessionStorage.clear(); location = 'index.html'; };
const validNo = (s) => /^ST(10[1-9]|11\d|12\d|130)$/.test(s);
const BAD_NO = 'Invalid student number. Use ST followed by a number from 101 to 130, for example ST101.';

async function api(name, body) {
  const o = body ? { method: 'POST', body: JSON.stringify(body) } : {};
  const t = sessionStorage.getItem('token');
  if (t) o.headers = { Authorization: 'Bearer ' + t };
  try {
    const r = await fetch(API + name, o);
    const d = await r.json().catch(() => ({}));
    if (!r.ok && !d.error) d.error = (d.errorMessage || 'Server problem') + ' (code ' + r.status + '). Check the terminal running netlify dev for details.';
    if (r.status === 401 && page !== 'login') logout();
    return { ok: r.ok, d };
  } catch { return { ok: false, d: { error: 'Network problem. Check your internet and try again.' } }; }
}

function nav() {
  $('nav').innerHTML = `<b>UPSA Hostel Booking</b><div>
    <a href="booking.html" class="${page === 'booking' ? 'on' : ''}">Book a room</a>
    <a href="payment.html" class="${page === 'payment' ? 'on' : ''}">My booking and payment</a>
    <a href="#" id="out">Log out (${esc(sessionStorage.getItem('name') || '')})</a></div>`;
  $('out').onclick = (e) => { e.preventDefault(); logout(); };
}

/* ---------- Page 1: log in / activate ---------- */
function initLogin() {
  if (sessionStorage.getItem('token')) { location = 'booking.html'; return; }
  const tab = (login) => {
    $('loginForm').classList.toggle('hidden', !login); $('actForm').classList.toggle('hidden', login);
    $('tabLogin').classList.toggle('on', login); $('tabAct').classList.toggle('on', !login); $('msg').className = 'msg';
  };
  $('tabLogin').onclick = () => tab(true); $('tabAct').onclick = () => tab(false);
  $('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const no = $('l_no').value.trim().toUpperCase();
    if (!validNo(no)) return show(BAD_NO, false);
    const { ok, d } = await api('login', { studentNo: no, password: $('l_pw').value });
    if (!ok) return show(d.error, false);
    sessionStorage.setItem('token', d.token); sessionStorage.setItem('name', d.name); location = 'booking.html';
  };
  $('actForm').onsubmit = async (e) => {
    e.preventDefault();
    if ($('a_pw').value !== $('a_pw2').value) return show('Passwords do not match', false);
    const no = $('a_no').value.trim().toUpperCase();
    if (!validNo(no)) return show(BAD_NO, false);
    const { ok, d } = await api('signup', { studentNo: no, email: $('a_em').value.trim(), password: $('a_pw').value, fullName: $('a_nm').value, gender: $('a_gd').value, phone: $('a_ph').value });
    if (ok) { tab(true); $('l_no').value = no; }
    show(ok ? d.message : d.error, ok);
  };
}

/* ---------- Page 2: booking ---------- */
async function initBooking() {
  const me = await api('me');
  const has = me.ok ? me.d.booking : null;
  if (has) {
    const b = $('banner'); b.className = 'msg ok';
    b.innerHTML = `You already booked room <b>${esc(has.room_id)}</b> in ${esc(has.hostel_name)}. <a href="payment.html">View booking and pay</a>`;
  }
  const r = await api('rooms');
  if (!r.ok) { $('rooms').textContent = 'Could not load rooms. Refresh the page.'; return; }
  const rooms = r.d, sel = $('hostelFilter');
  [...new Set(rooms.map((x) => x.hostel_name))].forEach((h) => sel.add(new Option(h, h)));
  const draw = () => {
    $('rooms').innerHTML = rooms.filter((x) => !sel.value || x.hostel_name === sel.value).map((x) => `
      <div class="card room"><div class="plaque">${esc(x.room_number)}</div><div class="body">
        <div><b>${esc(x.hostel_name)}</b></div>
        <div>${esc(x.room_type)} room, ${x.capacity} per room</div>
        <div>${money(x.semester_fee)} per semester</div>
        <p><span class="tag ${x.spaces_left > 0 ? 'ok' : 'bad'}">${x.spaces_left > 0 ? x.spaces_left + ' space(s) left' : 'Full'}</span></p>
        <button class="btn" data-room="${esc(x.room_number)}" ${x.spaces_left < 1 || has ? 'disabled' : ''}>Book this room</button>
      </div></div>`).join('');
    document.querySelectorAll('[data-room]').forEach((b) => (b.onclick = () => book(b.dataset.room)));
  };
  sel.onchange = draw; draw();
}
async function book(room) {
  if (!confirm('Book room ' + room + '?')) return;
  const { ok, d } = await api('book', { roomNumber: room });
  show(ok ? d.message + ' Taking you to payment…' : d.error, ok);
  if (ok) setTimeout(() => (location = 'payment.html'), 1200);
}

/* ---------- Page 3: payment and status ---------- */
async function initPayment() {
  const { ok, d } = await api('me');
  if (!ok) return show(d.error || 'Could not load your booking', false);
  const b = d.booking;
  if (!b) { $('noBooking').classList.remove('hidden'); return; }
  $('bookingBox').classList.remove('hidden');
  const paid = b.payment_status === 'Paid';
  const rows = [
    ['Student', esc(d.student.student_name) + ' (' + esc(d.student.student_no) + ')'],
    ['Registration', esc(b.registration_id)], ['Hostel', esc(b.hostel_name)],
    ['Room', esc(b.room_id) + ' (' + esc(b.room_type) + ')'],
    ['Booked on', new Date(b.allocation_date).toLocaleDateString()],
    ['Semester fee', money(b.semester_fee)],
    ['Payment status', `<span class="tag ${paid ? 'ok' : 'bad'}">${esc(b.payment_status)}</span>`],
  ];
  $('bookTable').innerHTML = rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
  $('payBox').classList.toggle('hidden', paid);
  $('payTable').innerHTML = d.payments.length
    ? '<tr><th>Date</th><th>Method</th><th>Amount</th><th>Reference</th></tr>' + d.payments.map((p) =>
        `<tr><td>${new Date(p.paid_at).toLocaleString()}</td><td>${esc(p.method)}</td><td>${money(p.amount)}</td><td>${esc(p.reference)}</td></tr>`).join('')
    : '<tr><td>No payments recorded yet.</td></tr>';
  $('payBtn').onclick = async () => {
    const m = document.querySelector('input[name=method]:checked').value;
    if (!confirm('Pay ' + money(b.semester_fee) + ' with ' + m + '?')) return;
    const r = await api('pay', { method: m });
    show(r.ok ? r.d.message : r.d.error, r.ok); if (r.ok) setTimeout(() => location.reload(), 1800);
  };
  $('cancelBtn').onclick = async () => {
    if (!confirm('Cancel this booking?')) return;
    const r = await api('cancel', {});
    show(r.ok ? r.d.message : r.d.error, r.ok); if (r.ok) setTimeout(() => location.reload(), 1500);
  };
}

/* ---------- start ---------- */
if (page === 'login') initLogin();
else if (!sessionStorage.getItem('token')) location = 'index.html';
else { nav(); page === 'booking' ? initBooking() : initPayment(); }
