/**
 * AutoShop API Client
 * Nhúng vào tất cả trang HTML: <script src="api.js"></script>
 * Thay thế hoàn toàn localStorage
 */

const API_BASE = 'http://localhost:3000/api';  // Đổi thành domain thật khi deploy

// ══════════════════════════════════════════════
//  HELPER: gọi API
// ══════════════════════════════════════════════
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('autoshop_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi server');
    return data;
  } catch (err) {
    console.error(`API Error [${method} ${endpoint}]:`, err.message);
    throw err;
  }
}

// ══════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════
const Auth = {
  // Đăng ký
  async register(name, email, phone, city, password) {
    const data = await apiCall('/auth/register', 'POST', { name, email, phone, city, password });
    if (data.token) {
      localStorage.setItem('autoshop_token', data.token);
      localStorage.setItem('autoshop_user', JSON.stringify(data.user));
    }
    return data;
  },

  // Đăng nhập
  async login(email, password) {
    const data = await apiCall('/auth/login', 'POST', { email, password });
    if (data.token) {
      localStorage.setItem('autoshop_token', data.token);
      localStorage.setItem('autoshop_user', JSON.stringify(data.user));
    }
    return data;
  },

  // Đăng xuất
  logout() {
    localStorage.removeItem('autoshop_token');
    localStorage.removeItem('autoshop_user');
    window.location.href = 'index.html';
  },

  // Lấy user hiện tại
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('autoshop_user') || 'null');
    } catch { return null; }
  },

  // Kiểm tra đã đăng nhập chưa
  isLoggedIn() {
    return !!localStorage.getItem('autoshop_token');
  },

  // Kiểm tra là admin không
  isAdmin() {
    const user = this.getUser();
    return user?.role === 'admin';
  },

  // Lấy thông tin mới từ server
  async me() {
    return await apiCall('/auth/me');
  }
};

// ══════════════════════════════════════════════
//  CARS (XE)
// ══════════════════════════════════════════════
const Cars = {
  // Lấy danh sách xe (có filter)
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.brand)          params.append('brand', filters.brand);
    if (filters.year)           params.append('year', filters.year);
    if (filters.fuel)           params.append('fuel', filters.fuel);
    if (filters.transmission)   params.append('transmission', filters.transmission);
    if (filters.maxPrice)       params.append('maxPrice', filters.maxPrice);
    if (filters.search)         params.append('search', filters.search);
    const q = params.toString() ? '?' + params.toString() : '';
    const data = await apiCall(`/cars${q}`);
    return data.data || [];
  },

  // Lấy 1 xe
  async getById(id) {
    const data = await apiCall(`/cars/${id}`);
    return data.data;
  },

  // Đăng bán xe
  async create(carData) {
    return await apiCall('/cars', 'POST', carData);
  },

  // Sửa xe
  async update(id, carData) {
    return await apiCall(`/cars/${id}`, 'PUT', carData);
  },

  // Xóa xe
  async delete(id) {
    return await apiCall(`/cars/${id}`, 'DELETE');
  },

  // Lấy xe của mình
  async getMyCars() {
    const data = await apiCall('/my/cars');
    return data.data || [];
  }
};

// ══════════════════════════════════════════════
//  MESSAGES (LIÊN HỆ)
// ══════════════════════════════════════════════
const Messages = {
  async send(data) {
    return await apiCall('/messages', 'POST', data);
  }
};

// ══════════════════════════════════════════════
//  ADMIN
// ══════════════════════════════════════════════
const Admin = {
  async getStats() {
    return await apiCall('/admin/stats');
  },
  async getAllCars(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const data = await apiCall(`/admin/cars${params ? '?' + params : ''}`);
    return data.data || [];
  },
  async updateCarStatus(id, status) {
    return await apiCall(`/admin/cars/${id}/status`, 'PATCH', { status });
  },
  async deleteCar(id) {
    return await apiCall(`/admin/cars/${id}`, 'DELETE');
  },
  async getAllUsers(search = '') {
    const data = await apiCall(`/admin/users${search ? '?search=' + search : ''}`);
    return data.data || [];
  },
  async deleteUser(id) {
    return await apiCall(`/admin/users/${id}`, 'DELETE');
  },
  async getMessages() {
    const data = await apiCall('/admin/messages');
    return data.data || [];
  },
  async deleteMessage(id) {
    return await apiCall(`/admin/messages/${id}`, 'DELETE');
  },
  async clearMessages() {
    return await apiCall('/admin/messages', 'DELETE');
  }
};

// ══════════════════════════════════════════════
//  AUTO: cập nhật nav khi load trang
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.getUser();
  const loginLink = document.querySelector('a[href="dang-nhap.html"]');

  if (loginLink && user) {
    const shortName = user.name.split(' ').pop();
    loginLink.textContent = '👤 ' + shortName;

    // Thêm nút đăng xuất
    const li = loginLink.parentElement;
    if (li && li.tagName === 'LI') {
      const logoutLi = document.createElement('li');
      const logoutBtn = document.createElement('button');
      logoutBtn.textContent = 'Đăng Xuất';
      logoutBtn.style.cssText = `
        background:rgba(232,48,26,0.1);border:1.5px solid rgba(232,48,26,0.3);
        color:#e8301a;padding:0.4rem 0.85rem;border-radius:8px;cursor:pointer;
        font-size:0.82rem;font-weight:700;font-family:'Be Vietnam Pro',sans-serif;
      `;
      logoutBtn.onclick = () => {
        if (confirm('Bạn có chắc muốn đăng xuất?')) Auth.logout();
      };
      logoutLi.appendChild(logoutBtn);
      li.parentElement.insertBefore(logoutLi, li.nextSibling);
    }
  }
});