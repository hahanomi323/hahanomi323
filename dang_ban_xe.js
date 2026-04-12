// ==================== SESSION ====================
const SESSION_KEY = 'autoshop_session';
const USERS_KEY = 'autoshop_users';
const LISTINGS_KEY = 'autoshop_listings';

function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}

function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

function getListings() { return JSON.parse(localStorage.getItem(LISTINGS_KEY) || '[]'); }
function saveListings(l) { localStorage.setItem(LISTINGS_KEY, JSON.stringify(l)); }

// ==================== ON LOAD ====================
document.addEventListener('DOMContentLoaded', function() {
    const session = getSession();
    if (session) {
        showListingForm(session);
    } else {
        document.getElementById('authGate').style.display = 'block';
    }
});

function showListingForm(user) {
    document.getElementById('authGate').style.display = 'none';
    document.getElementById('listingForm').classList.add('show');

    // Fill user info
    document.getElementById('headerName').textContent = user.name;
    document.getElementById('headerEmail').textContent = user.email;
    document.getElementById('headerAvatar').textContent = user.name.charAt(user.name.lastIndexOf(' ') + 1).toUpperCase();
    document.getElementById('sellerName').value = user.name;
    document.getElementById('sellerPhone').value = user.phone || '';

    // Nav
    const navLink = document.getElementById('navLoginLink');
    if (navLink) navLink.textContent = '👤 ' + user.name.split(' ').pop();

    // Load existing listings
    renderMyListings(user);
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'dang-nhap.html';
}

// ==================== PHOTO HANDLING ====================
let uploadedPhotos = [];

function handlePhotos(input) {
    const files = Array.from(input.files);
    const remaining = 10 - uploadedPhotos.length;
    const toAdd = files.slice(0, remaining);

    toAdd.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            alert(`Ảnh "${file.name}" vượt quá 5MB, bỏ qua.`);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedPhotos.push({ name: file.name, data: e.target.result });
            renderPhotos();
        };
        reader.readAsDataURL(file);
    });

    input.value = '';
    updateStep(2);
}

function renderPhotos() {
    const grid = document.getElementById('photoPreview');
    grid.innerHTML = uploadedPhotos.map((p, i) => `
        <div class="photo-thumb-wrap">
            <img src="${p.data}" alt="Ảnh xe ${i+1}">
            <button class="remove-photo" onclick="removePhoto(${i})">✕</button>
        </div>
    `).join('');

    const area = document.getElementById('uploadArea');
    if (uploadedPhotos.length >= 10) {
        area.style.opacity = '0.5';
        area.style.pointerEvents = 'none';
    } else {
        area.style.opacity = '1';
        area.style.pointerEvents = 'auto';
    }
}

function removePhoto(index) {
    uploadedPhotos.splice(index, 1);
    renderPhotos();
    updateStep(2);
}

// ==================== UI HELPERS ====================
function toggleMethod(el) {
    el.classList.toggle('selected');
    el.querySelector('input').checked = el.classList.contains('selected');
}

let selectedPlan = 'free';
const planInfo = {
    free: 'Gói Miễn Phí — Tin sẽ hiển thị 7 ngày.',
    basic: 'Gói Cơ Bản (99k) — Tin nổi bật, hiển thị 30 ngày.',
    vip: 'Gói VIP (299k) — Tin VIP đầu trang, hiển thị 60 ngày.'
};

function selectPlan(el, plan) {
    document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedPlan = plan;
    document.getElementById('selectedPlanInfo').innerHTML =
        `✅ Bạn đang chọn <strong style="color:#d4af37;">${planInfo[plan]}</strong>`;
}

function updatePricePreview() {
    const val = document.getElementById('carPrice').value;
    const prev = document.getElementById('pricePreview');
    if (val && !isNaN(val) && val > 0) {
        const num = parseFloat(val);
        if (num >= 1000) {
            prev.textContent = `≈ ${(num/1000).toFixed(2)} tỷ VNĐ`;
        } else {
            prev.textContent = `= ${num.toLocaleString('vi-VN')} triệu VNĐ`;
        }
    } else {
        prev.textContent = '';
    }
}

function updateCharCount(el, countId, max) {
    document.getElementById(countId).textContent = el.value.length;
}

function formatKm(input) {
    // Just allow numbers
}

function updateStep(n) {
    // Simple step indicator update
    const brand = document.getElementById('brand').value;
    const model = document.getElementById('carModel').value;
    if (brand && model) {
        document.getElementById('step1').classList.add('done');
        document.getElementById('step2').classList.add('active');
    }
    if (uploadedPhotos.length >= 3) {
        document.getElementById('step2').classList.add('done');
        document.getElementById('step3').classList.add('active');
    }
}

// ==================== VALIDATION ====================
function showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('show'); }
}

function clearAllErrors() {
    document.querySelectorAll('.error-msg').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('input.error, select.error, textarea.error').forEach(e => e.classList.remove('error'));
}

// ==================== SUBMIT ====================
function submitListing() {
    clearAllErrors();
    let valid = true;

    const fields = [
        { id: 'brand', errId: 'brandErr', msg: 'Vui lòng chọn hãng xe' },
        { id: 'carModel', errId: 'carModelErr', msg: 'Vui lòng nhập tên xe' },
        { id: 'carYear', errId: 'carYearErr', msg: 'Vui lòng chọn năm sản xuất' },
        { id: 'carKm', errId: 'carKmErr', msg: 'Vui lòng nhập số km' },
        { id: 'transmission', errId: 'transmissionErr', msg: 'Vui lòng chọn hộp số' },
        { id: 'fuel', errId: 'fuelErr', msg: 'Vui lòng chọn nhiên liệu' },
        { id: 'color', errId: 'colorErr', msg: 'Vui lòng chọn màu xe' },
        { id: 'condition', errId: 'conditionErr', msg: 'Vui lòng chọn tình trạng' },
        { id: 'province', errId: 'provinceErr', msg: 'Vui lòng chọn tỉnh/thành phố' },
        { id: 'carPrice', errId: 'carPriceErr', msg: 'Vui lòng nhập giá bán' },
        { id: 'carTitle', errId: 'carTitleErr', msg: 'Vui lòng nhập tiêu đề tin đăng' },
        { id: 'carDesc', errId: 'carDescErr', msg: 'Vui lòng nhập mô tả chi tiết' },
        { id: 'sellerName', errId: 'sellerNameErr', msg: 'Vui lòng nhập tên người bán' },
        { id: 'sellerPhone', errId: 'sellerPhoneErr', msg: 'Vui lòng nhập số điện thoại' },
    ];

    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el || !el.value.trim()) {
            showErr(f.errId, f.msg);
            if (el) el.classList.add('error');
            valid = false;
        }
    });

    // Validate phone
    const phone = document.getElementById('sellerPhone').value.replace(/\s/g,'');
    if (phone && !/^(0[3-9])\d{8}$/.test(phone)) {
        showErr('sellerPhoneErr', 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)');
        document.getElementById('sellerPhone').classList.add('error');
        valid = false;
    }

    // Validate photos (optional for free, warn if 0)
    if (uploadedPhotos.length === 0) {
        if (!confirm('Bạn chưa thêm ảnh xe. Tin không có ảnh thường ít được quan tâm hơn. Tiếp tục?')) {
            return;
        }
    }

    if (!valid) {
        // Scroll to first error
        const firstErr = document.querySelector('.error-msg.show');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // Loading state
    const btn = document.getElementById('submitBtn');
    btn.textContent = '⏳ Đang gửi...';
    btn.classList.add('loading');

    setTimeout(() => {
        const session = getSession();
        const listingId = 'AS-' + Math.floor(100000 + Math.random() * 900000);

        // Collect selected features
        const features = Array.from(document.querySelectorAll('input[name="features"]:checked')).map(i => i.value);

        const listing = {
            id: listingId,
            userId: session ? session.id : null,
            title: document.getElementById('carTitle').value,
            brand: document.getElementById('brand').value,
            model: document.getElementById('carModel').value,
            year: document.getElementById('carYear').value,
            km: document.getElementById('carKm').value,
            transmission: document.getElementById('transmission').value,
            fuel: document.getElementById('fuel').value,
            color: document.getElementById('color').value,
            engine: document.getElementById('engine').value,
            carType: document.getElementById('carType').value,
            condition: document.getElementById('condition').value,
            origin: document.getElementById('origin').value,
            province: document.getElementById('province').value,
            price: document.getElementById('carPrice').value,
            sellType: document.getElementById('sellType').value,
            description: document.getElementById('carDesc').value,
            features,
            photos: uploadedPhotos.map(p => p.data),
            sellerName: document.getElementById('sellerName').value,
            sellerPhone: document.getElementById('sellerPhone').value,
            sellerZalo: document.getElementById('sellerZalo').value,
            contactTime: document.getElementById('contactTime').value,
            plan: selectedPlan,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Save listing
        const listings = getListings();
        listings.push(listing);
        saveListings(listings);

        // Link to user
        if (session) {
            const users = getUsers();
            const userIdx = users.findIndex(u => u.id === session.id);
            if (userIdx >= 0) {
                users[userIdx].listings = users[userIdx].listings || [];
                users[userIdx].listings.push(listingId);
                saveUsers(users);
            }
        }

        // Show success
        btn.textContent = '🚀 Đăng Tin Bán Xe Ngay';
        btn.classList.remove('loading');
        document.getElementById('listingId').textContent = 'Mã tin: #' + listingId;
        document.getElementById('successModal').classList.add('show');

        // Update steps
        document.getElementById('step3').classList.add('done');
        document.getElementById('step4').classList.add('active');

    }, 1500);
}

function closeModal() {
    document.getElementById('successModal').classList.remove('show');
    // Reset form
    document.querySelector('#listingForm form') && document.querySelector('#listingForm form').reset();
    uploadedPhotos = [];
    renderPhotos();
    document.getElementById('pricePreview').textContent = '';
    document.getElementById('titleCount').textContent = '0';
    document.getElementById('descCount').textContent = '0';
    clearAllErrors();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reset steps
    ['step1','step2','step3','step4'].forEach(s => {
        document.getElementById(s).classList.remove('done');
    });
    document.getElementById('step1').classList.add('active');
}

// ==================== MY LISTINGS ====================
function toggleMyListings() {
    const panel = document.getElementById('myListingsPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') {
        const session = getSession();
        if (session) renderMyListings(session);
    }
}

function renderMyListings(user) {
    const container = document.getElementById('myListingsContent');
    const listings = getListings().filter(l => l.userId === user.id);

    if (listings.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#888;padding:2rem;">Bạn chưa có tin đăng nào. Hãy đăng bán xe đầu tiên!</p>';
        return;
    }

    container.innerHTML = listings.reverse().map(l => `
        <div class="listing-card">
            <div class="listing-thumb">
                ${l.photos && l.photos[0] ? `<img src="${l.photos[0]}" alt="${l.title}">` : '🚗'}
            </div>
            <div class="listing-info" style="flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
                    <h4>${l.title || l.brand + ' ' + l.model + ' ' + l.year}</h4>
                    <span class="listing-status ${l.status === 'active' ? 'status-active' : l.status === 'sold' ? 'status-sold' : 'status-pending'}">
                        ${l.status === 'active' ? '✅ Đang hiển thị' : l.status === 'sold' ? '🏷️ Đã bán' : '⏳ Chờ duyệt'}
                    </span>
                </div>
                <div class="listing-price">${l.price} triệu VNĐ</div>
                <div class="listing-meta">📅 ${l.year} • 🔧 ${l.km ? Number(l.km).toLocaleString() : '?'} km • 📍 ${l.province} • Đăng: ${new Date(l.createdAt).toLocaleDateString('vi-VN')}</div>
                <div class="listing-actions">
                    <button class="btn-small edit" onclick="editListing('${l.id}')">✏️ Sửa</button>
                    <button class="btn-small sold" onclick="markSold('${l.id}')">✅ Đã bán</button>
                    <button class="btn-small delete" onclick="deleteListing('${l.id}')">🗑️ Xóa</button>
                </div>
            </div>
        </div>
    `).join('');
}

function markSold(id) {
    if (!confirm('Đánh dấu xe này là đã bán?')) return;
    const listings = getListings();
    const idx = listings.findIndex(l => l.id === id);
    if (idx >= 0) { listings[idx].status = 'sold'; saveListings(listings); }
    const session = getSession();
    if (session) renderMyListings(session);
}

function deleteListing(id) {
    if (!confirm('Xóa tin đăng này? Hành động này không thể hoàn tác.')) return;
    let listings = getListings();
    listings = listings.filter(l => l.id !== id);
    saveListings(listings);
    const session = getSession();
    if (session) renderMyListings(session);
}

function editListing(id) {
    alert('Tính năng chỉnh sửa tin đăng đang được phát triển!\n\nMã tin: #' + id);
}

function switchToRegister() {
    localStorage.setItem('autoshop_switch_tab', 'register');
}