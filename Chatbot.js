/* =====================================================
   CHATBOT.JS — Đọc dữ liệu xe thật từ API (SQL Server)
   Dùng chung mọi trang, tự động cập nhật khi DB thay đổi
   ===================================================== */
(function () {

  const CW_API_KEY  = 'QtdNDBRFhBcg6gkq0VHMTo9d6LbRGFy0J7PAvymE';   // ← dán key Cohere vào đây
  const API_BASE    = 'http://localhost:3000/api'; // ← giữ nguyên

  // Cache dữ liệu xe (10 phút tự refresh)
  let _carCache     = null;
  let _cacheTime    = 0;
  const CACHE_MS    = 10 * 60 * 1000;

  // ── LẤY XE TỪ API (SQL Server) ──────────────────
  async function fetchCars() {
    const now = Date.now();
    if (_carCache && now - _cacheTime < CACHE_MS) return _carCache;

    try {
      const res  = await fetch(`${API_BASE}/cars?limit=100`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('API lỗi ' + res.status);
      const json = await res.json();
      _carCache  = json.data || [];
      _cacheTime = now;
      return _carCache;
    } catch (e) {
      console.warn('[Chatbot] Không lấy được xe từ API:', e.message);
      return _carCache || [];   // trả cache cũ nếu có
    }
  }

  // ── CHUYỂN DATA XE → VĂN BẢN CHO AI ────────────
  function carsToText(cars) {
    if (!cars || cars.length === 0) return 'Hiện chưa có xe nào đang bán.';
    return cars.slice(0, 40).map((c, i) => {
      const gia   = c.price ? `${c.price.toLocaleString('vi-VN')} triệu VNĐ` : 'Liên hệ';
      const km    = c.km    ? `${c.km.toLocaleString('vi-VN')} km` : 'N/A';
      const parts = [
        `${i + 1}. ${c.title || [c.brand, c.model, c.year].filter(Boolean).join(' ')}`,
        c.brand        ? `   Hãng: ${c.brand}`              : null,
        c.model        ? `   Dòng: ${c.model}`              : null,
        c.year         ? `   Năm: ${c.year}`                : null,
        c.color        ? `   Màu: ${c.color}`               : null,
        `   Số km: ${km}`,
        c.fuel         ? `   Nhiên liệu: ${c.fuel}`         : null,
        c.transmission ? `   Hộp số: ${c.transmission}`     : null,
        c.car_condition? `   Tình trạng: ${c.car_condition}`: null,
        c.province     ? `   Nơi bán: ${c.province}`        : null,
        `   Giá: ${gia}`,
        c.price_negotiable ? '   (Có thể thương lượng)'     : null,
        c.seller_phone ? `   Liên hệ: ${c.seller_phone}`    : null,
      ].filter(Boolean);
      return parts.join('\n');
    }).join('\n\n');
  }

  // ── BUILD SYSTEM PROMPT ──────────────────────────
  async function buildPrompt() {
    const cars    = await fetchCars();
    const carText = carsToText(cars);
    const total   = cars.length;

    return `Bạn là trợ lý tư vấn của AutoMarket — sàn giao dịch xe trung gian tại Thủ Dầu Một, Bình Dương.

=== THÔNG TIN LIÊN HỆ ===
Hotline: 0344 806 179 | Tư vấn: 0337 484 248
Zalo: 0337 484 248 | Giờ làm việc: T2–T7 8:00–18:00, CN 8:00–17:00
Địa chỉ: Thủ Dầu Một, Bình Dương

=== DỊCH VỤ ===
- Đăng tin bán xe (miễn phí / gói VIP)
- Kiểm định xe độc lập 50 điểm
- Đặt cọc qua Escrow (hoàn tiền 100% nếu xe không đúng mô tả)
- Hỗ trợ sang tên trọn gói
- Vay vốn mua xe (đến 80% giá trị, lãi suất ưu đãi)
- Định giá xe chuyên nghiệp

=== ${total} XE ĐANG BÁN TRÊN SÀN (DỮ LIỆU THẬT TỪ HỆ THỐNG) ===
${carText}

=== CÁCH TRẢ LỜI ===
- Dựa HOÀN TOÀN vào danh sách xe thật ở trên, không bịa thêm xe nào
- Ngắn gọn 2-4 câu, thân thiện
- Xưng "mình/em", gọi khách là "anh/chị"
- Nếu khách hỏi xe không có trong danh sách → thật thà nói chưa có và gợi ý xe tương tự nếu có
- Nếu hỏi về giá, km, màu → trả lời đúng theo dữ liệu
- Kết thúc bằng câu hỏi hoặc gợi ý hành động tiếp theo`;
  }

  // ── HTML WIDGET ──────────────────────────────────
  const WIDGET_HTML = `
<link rel="stylesheet" href="chatbot.css">

<button id="cw-fab" aria-label="Mở chat tư vấn">
  <span id="cw-fab-icon">🏎</span>
  <div class="cw-red-dot" id="cw-dot"></div>
</button>

<div id="cw-tooltip">Tư vấn xe miễn phí!</div>

<div id="cw-box">
  <div class="cw-header">
    <div class="cw-avatar">🏎</div>
    <div class="cw-header-info">
      <div class="cw-name">Trợ lý tư vấn <span>AI</span></div>
      <div class="cw-status" id="cw-status">● Đang tải dữ liệu xe...</div>
    </div>
    <button class="cw-close" id="cw-close-btn">✕</button>
  </div>

  <div class="cw-chips">
    <button class="cw-chip">Xe đang có gì?</button>
    <button class="cw-chip">Hỗ trợ trả góp không?</button>
    <button class="cw-chip">Xe có bảo hành không?</button>
    <button class="cw-chip">Được lái thử không?</button>
    <button class="cw-chip">Thủ tục sang tên?</button>
    <button class="cw-chip">Giờ làm việc?</button>
  </div>

  <div class="cw-messages" id="cwMessages">
    <div class="cw-msg cw-ai">
      <div class="cw-msg-avatar">🏎</div>
      <div>
        <div class="cw-bubble">Xin chào anh/chị! 👋 Mình là trợ lý tư vấn xe của AutoMarket.<br><br>Đang tải danh sách xe mới nhất từ hệ thống... Anh/chị hỏi đi nhé! 🚗</div>
        <div class="cw-time">Vừa xong</div>
      </div>
    </div>
  </div>

  <div class="cw-input-area">
    <div class="cw-input-row">
      <textarea class="cw-input" id="cwInput" placeholder="Nhập câu hỏi..." rows="1"></textarea>
      <button class="cw-send" id="cwSendBtn">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
    <div class="cw-footer">Dữ liệu xe thật từ hệ thống · Tự động cập nhật</div>
  </div>
</div>
`;

  // Inject vào body
  const wrapper = document.createElement('div');
  wrapper.className = 'chatbot-wrapper';
  wrapper.innerHTML = WIDGET_HTML;
  document.body.appendChild(wrapper);

  // ── STATE ────────────────────────────────────────
  let cwHistory = [], cwLoading = false, cwIsOpen = false;

  // ── REFS ─────────────────────────────────────────
  const fab     = document.getElementById('cw-fab');
  const box     = document.getElementById('cw-box');
  const fabIcon = document.getElementById('cw-fab-icon');
  const dot     = document.getElementById('cw-dot');
  const tooltip = document.getElementById('cw-tooltip');
  const input   = document.getElementById('cwInput');
  const sendBtn = document.getElementById('cwSendBtn');
  const msgs    = document.getElementById('cwMessages');
  const status  = document.getElementById('cw-status');

  // Pre-load dữ liệu xe ngay khi trang load
  fetchCars().then(cars => {
    if (status) status.textContent = cars.length > 0
      ? `● Đang hoạt động · ${cars.length} xe`
      : '● Đang hoạt động';
  });

  // ── TOGGLE ───────────────────────────────────────
  function cwToggle() {
    cwIsOpen = !cwIsOpen;
    box.classList.toggle('cw-open', cwIsOpen);
    fabIcon.textContent = cwIsOpen ? '✕' : '🏎';
    if (dot)     dot.style.display     = cwIsOpen ? 'none' : '';
    if (tooltip) tooltip.style.display = cwIsOpen ? 'none' : '';
    if (cwIsOpen) input.focus();
  }

  fab.addEventListener('click', cwToggle);
  document.getElementById('cw-close-btn').addEventListener('click', cwToggle);

  document.querySelectorAll('.cw-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.textContent.trim();
      cwSend();
    });
  });

  // ── SEND ─────────────────────────────────────────
  async function cwSend() {
    const text = input.value.trim();
    if (!text || cwLoading) return;

    input.value = '';
    cwResizeInput();
    cwAddMsg('user', text);
    cwHistory.push({ role: 'user', parts: [{ text }] });
    cwShowTyping();
    cwSetLoading(true);

    try {
      // Lấy dữ liệu xe mới nhất từ SQL Server, rồi hỏi Cohere
      const systemPrompt = await buildPrompt();

      // Chuyển history sang format Cohere (bỏ tin nhắn cuối vì đã truyền qua message)
      const chatHistory = cwHistory.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'USER' : 'CHATBOT',
        message: m.parts[0].text
      }));

      const res = await fetch('https://api.cohere.com/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CW_API_KEY}`
        },
        body: JSON.stringify({
          model: 'command-a-03-2025',
          message: text,
          chat_history: chatHistory,
          preamble: systemPrompt,
          temperature: 0.5,
          max_tokens: 350
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cohere API lỗi');

      const reply = data.text;
      cwHistory.push({ role: 'model', parts: [{ text: reply }] });
      cwRemoveTyping();
      cwAddMsg('ai', reply);

    } catch (err) {
      console.error('[Chatbot]', err.message);
      cwRemoveTyping();
      cwHistory.pop();
      cwAddMsg('ai', 'Dạ mình đang gặp sự cố kết nối. Anh/chị vui lòng gọi **0337 484 248** để được tư vấn ngay nhé! 😊');
    } finally {
      cwSetLoading(false);
    }
  }

  sendBtn.addEventListener('click', cwSend);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); cwSend(); }
  });
  input.addEventListener('input', cwResizeInput);

  // ── HELPERS ──────────────────────────────────────
  function cwAddMsg(role, text) {
    const div = document.createElement('div');
    div.className = `cw-msg cw-${role}`;
    const t = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const html = role === 'ai'
      ? cwEscape(text)
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>')
      : cwEscape(text).replace(/\n/g, '<br>');
    div.innerHTML = `
      <div class="cw-msg-avatar">${role === 'ai' ? '🏎' : '👤'}</div>
      <div>
        <div class="cw-bubble">${html}</div>
        <div class="cw-time">${t}</div>
      </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function cwShowTyping() {
    const div = document.createElement('div');
    div.className = 'cw-msg cw-ai';
    div.id = 'cwTyping';
    div.innerHTML = `
      <div class="cw-msg-avatar">🏎</div>
      <div class="cw-typing">
        <div class="cw-typing-dot"></div>
        <div class="cw-typing-dot"></div>
        <div class="cw-typing-dot"></div>
      </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function cwRemoveTyping() {
    const el = document.getElementById('cwTyping');
    if (el) el.remove();
  }

  function cwSetLoading(s) {
    cwLoading = s;
    sendBtn.disabled = s;
  }

  function cwResizeInput() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 80) + 'px';
  }

  function cwEscape(t) {
    return String(t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  setTimeout(() => { if (tooltip) tooltip.style.opacity = '0'; }, 6000);

})();