/* =====================================================
   CHATBOT.JS — AI Chat Widget dùng chung mọi trang
   ===================================================== */
(function () {

  const CW_API_KEY = 'AIzaSyAm5thAnxXpfTvHF8g6yGZsEMGl_i8lY7I';
  const CW_SYSTEM = `Bạn là trợ lý bán xe của AutoShop tại Thủ Dầu Một, Bình Dương.

=== XE ĐANG BÁN ===
1. Honda City 2022 — Màu đỏ, tự động, 22,000km → 480 triệu
2. Toyota Vios 2023 — Màu trắng, tự động, 15,000km → 520 triệu
3. Mazda CX-5 2023 — Màu đỏ, tự động, 15,000km → 820 triệu
4. Hyundai Accent 2022 — Màu bạc, số sàn, 18,500km → 420 triệu

=== DỊCH VỤ ===
✓ Trả góp ngân hàng (trả trước 20-30%)
✓ Bảo hành động cơ & hộp số 3-6 tháng
✓ Hỗ trợ sang tên tận nơi
✓ Lái thử (hẹn trước)
✓ Thu cũ đổi mới

=== LIÊN HỆ ===
📍 Thủ Dầu Một, Bình Dương
📞 0337 484 248 | 0344 806 179
⏰ 8h-18h (T2-CN)

=== CÁCH TRẢ LỜI ===
- Ngắn gọn 2-3 câu, thân thiện
- Xưng "mình/em", gọi "anh/chị"
- Luôn đưa thông tin cụ thể (giá, màu, km)
- Kết thúc bằng một câu hỏi để tiếp tục hội thoại`;

  // ── HTML của widget ──
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
      <div class="cw-status">● Đang hoạt động</div>
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
        <div class="cw-bubble">Xin chào anh/chị! 👋 Mình là trợ lý tư vấn xe của AutoShop.<br><br>Anh/chị đang tìm xe gì? Mình sẵn sàng tư vấn ngay ạ 🚗</div>
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
    <div class="cw-footer">Hỗ trợ bởi Gemini AI · Miễn phí 24/7</div>
  </div>
</div>
`;

  // Inject HTML vào body
  const wrapper = document.createElement('div');
  wrapper.innerHTML = WIDGET_HTML;
  document.body.appendChild(wrapper);

  // ── STATE ──
  let cwHistory = [], cwLoading = false, cwIsOpen = false;

  // ── REFS ──
  const fab     = document.getElementById('cw-fab');
  const box     = document.getElementById('cw-box');
  const fabIcon = document.getElementById('cw-fab-icon');
  const dot     = document.getElementById('cw-dot');
  const tooltip = document.getElementById('cw-tooltip');
  const input   = document.getElementById('cwInput');
  const sendBtn = document.getElementById('cwSendBtn');
  const msgs    = document.getElementById('cwMessages');

  // ── TOGGLE ──
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

  // Chips
  document.querySelectorAll('.cw-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.textContent.trim();
      cwSend();
    });
  });

  // ── SEND ──
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
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${CW_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: CW_SYSTEM }] },
            contents: cwHistory,
            generationConfig: { temperature: 0.7, maxOutputTokens: 250 }
          })
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'API Error');
      const reply = data.candidates[0].content.parts[0].text;
      cwHistory.push({ role: 'model', parts: [{ text: reply }] });
      cwRemoveTyping();
      cwAddMsg('ai', reply);
    } catch (err) {
      cwRemoveTyping();
      cwHistory.pop();
      // Fallback thông minh
      const q = text.toLowerCase();
      let reply = 'Dạ mình là trợ lý của AutoShop. Anh/chị muốn hỏi về xe nào, giá cả hay dịch vụ ạ? 😊';
      if (q.includes('city'))                        reply = 'Dạ Honda City 2022 màu đỏ, số tự động, chạy 22,000km, giá 480 triệu ạ. Xe còn rất đẹp! Anh/chị muốn qua xem không?';
      else if (q.includes('vios'))                   reply = 'Dạ Toyota Vios 2023 màu trắng, tự động, 15,000km, giá 520 triệu ạ. Còn rất mới! Cần tư vấn trả góp không ạ?';
      else if (q.includes('cx') || q.includes('mazda')) reply = 'Dạ Mazda CX-5 2023 màu đỏ, tự động, 15,000km, giá 820 triệu ạ. Xe rất sang! Anh/chị muốn xem thử không?';
      else if (q.includes('accent') || q.includes('hyundai')) reply = 'Dạ Hyundai Accent 2022 màu bạc, số sàn, 18,500km, giá 420 triệu ạ. Giá rất tốt! Liên hệ 0337484248 nhé!';
      else if (q.includes('trả góp') || q.includes('vay'))    reply = 'Có ạ! Shop hỗ trợ vay ngân hàng, trả trước 20-30%, còn lại trả góp linh hoạt. Anh/chị quan tâm xe nào ạ?';
      else if (q.includes('bảo hành'))               reply = 'Có ạ! Shop bảo hành động cơ và hộp số 3-6 tháng. Xe đã kiểm tra kỹ! Anh/chị muốn biết thêm không?';
      else if (q.includes('lái thử'))                reply = 'Được ạ! Anh/chị có thể lái thử tại shop, hẹn trước qua 0337484248 để mình chuẩn bị xe nhé!';
      else if (q.includes('sang tên') || q.includes('thủ tục')) reply = 'Dạ shop hỗ trợ sang tên tận nơi ạ. Anh/chị không cần lo! Đang quan tâm xe nào ạ?';
      else if (q.includes('giờ') || q.includes('mở cửa'))     reply = 'Dạ shop mở cửa từ 8h-18h, Thứ 2 đến Chủ Nhật tại Thủ Dầu Một, Bình Dương ạ. Anh/chị ghé thăm nhé!';
      else if (q.includes('địa chỉ') || q.includes('ở đâu')) reply = 'Dạ shop ở Thủ Dầu Một, Bình Dương ạ. Anh/chị gọi 0337484248 để được chỉ đường cụ thể nhé!';
      cwAddMsg('ai', reply);
    } finally {
      cwSetLoading(false);
    }
  }

  sendBtn.addEventListener('click', cwSend);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); cwSend(); }
  });

  input.addEventListener('input', cwResizeInput);

  // ── HELPERS ──
  function cwAddMsg(role, text) {
    const div = document.createElement('div');
    div.className = `cw-msg cw-${role}`;
    const t = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `
      <div class="cw-msg-avatar">${role === 'ai' ? '🏎' : '👤'}</div>
      <div>
        <div class="cw-bubble">${cwEscape(text).replace(/\n/g, '<br>')}</div>
        <div class="cw-time">${t}</div>
      </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function cwShowTyping() {
    const div = document.createElement('div');
    div.className = 'cw-msg cw-ai'; div.id = 'cwTyping';
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
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Ẩn tooltip sau 6s
  setTimeout(() => { if (tooltip) tooltip.style.opacity = '0'; }, 6000);

})();