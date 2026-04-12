// Giỏ hàng (lưu trong bộ nhớ)
let cart = [];

// Load giỏ hàng khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    loadCartFromMemory();
    updateCartUI();
    initializeEventListeners();
});

// Khởi tạo các event listeners
function initializeEventListeners() {
    // Price range slider
    const priceSlider = document.getElementById('price');
    if (priceSlider) {
        priceSlider.addEventListener('input', function() {
            const display = document.querySelector('.price-display');
            if (display) {
                display.textContent = `0 - ${this.value}`;
            }
        });
    }

    // Accordion FAQ
    const accordionItems = document.querySelectorAll('.accordion-item input[type="checkbox"]');
    accordionItems.forEach(item => {
        item.addEventListener('change', function() {
            const content = this.parentElement.querySelector('.accordion-content');
            if (this.checked) {
                content.style.maxHeight = content.scrollHeight + 'px';
            } else {
                content.style.maxHeight = '0';
            }
        });
    });

    // Tab navigation
    const tabLinks = document.querySelectorAll('.tab-nav-link');
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Remove active class from all tabs and panels
            document.querySelectorAll('.tab-nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding panel
            this.classList.add('active');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Payment method toggle
    const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const installmentSection = document.querySelector('.installment-section');
            if (installmentSection) {
                if (this.value === 'installment') {
                    installmentSection.style.display = 'block';
                } else {
                    installmentSection.style.display = 'none';
                }
            }
            updateOrderSummary();
        });
    });

    // Service options checkboxes
    const serviceCheckboxes = document.querySelectorAll('.service-option input[type="checkbox"]');
    serviceCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateOrderSummary);
    });

    // Cart quantity inputs
    const quantityInputs = document.querySelectorAll('.quantity-input');
    quantityInputs.forEach(input => {
        input.addEventListener('change', function() {
            const itemIndex = Array.from(quantityInputs).indexOf(this);
            if (cart[itemIndex]) {
                cart[itemIndex].quantity = parseInt(this.value) || 1;
                updateCartUI();
            }
        });
    });

    // Remove cart item buttons
    const removeButtons = document.querySelectorAll('.btn-remove');
    removeButtons.forEach((btn, index) => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            removeFromCart(index);
        });
    });

    // Clear cart button
    const clearCartBtn = document.querySelector('.btn-clear-cart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Bạn có chắc muốn xóa tất cả xe khỏi giỏ hàng?')) {
                cart = [];
                updateCartUI();
            }
        });
    }

    // Add to cart buttons
    const addToCartButtons = document.querySelectorAll('.btn-add-cart');
    addToCartButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            addToCart();
        });
    });
}

// Thêm xe vào giỏ hàng
function addToCart() {
    const carName = document.querySelector('.car-detail-title');
    const carPrice = document.querySelector('.car-detail-price');
    
    if (carName && carPrice) {
        const item = {
            name: carName.textContent,
            price: carPrice.textContent,
            quantity: 1,
            specs: 'Năm 2023 • 15,000 km • Tự động'
        };
        
        // Kiểm tra xe đã có trong giỏ chưa
        const existingIndex = cart.findIndex(i => i.name === item.name);
        if (existingIndex >= 0) {
            cart[existingIndex].quantity++;
            alert('Đã tăng số lượng xe trong giỏ hàng!');
        } else {
            cart.push(item);
            alert('Đã thêm xe vào giỏ hàng!');
        }
        
        saveCartToMemory();
        updateCartCount();
    }
}

// Xóa xe khỏi giỏ hàng
function removeFromCart(index) {
    if (confirm('Bạn có chắc muốn xóa xe này?')) {
        cart.splice(index, 1);
        updateCartUI();
    }
}

// Cập nhật giao diện giỏ hàng
function updateCartUI() {
    const cartItemsContainer = document.querySelector('.cart-items');
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: 15px;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🛒</div>
                <h3>Giỏ hàng trống</h3>
                <p style="color: #666; margin: 1rem 0;">Hãy thêm xe vào giỏ hàng để tiếp tục mua sắm</p>
                <a href="xe-ban.html" class="btn">Xem Xe Ngay</a>
            </div>
        `;
        updateOrderSummary();
        return;
    }

    let html = '';
    cart.forEach((item, index) => {
        html += `
            <div class="cart-item">
                <div class="cart-item-image">
                    <div style="width: 120px; height: 100px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; border-radius: 10px;">
                        <span style="font-size: 3rem; color: white;">🚙</span>
                    </div>
                </div>
                <div class="cart-item-info">
                    <h3 class="cart-item-name">${item.name}</h3>
                    <p class="cart-item-specs">${item.specs}</p>
                    <div class="cart-item-meta">
                        <span class="meta-item">✅ Còn hàng</span>
                    </div>
                </div>
                <div class="cart-item-quantity">
                    <label>Số lượng:</label>
                    <input type="number" value="${item.quantity}" min="1" max="5" class="quantity-input" data-index="${index}">
                </div>
                <div class="cart-item-price">
                    <div class="price-label">Giá:</div>
                    <div class="price-value">${item.price}</div>
                </div>
                <div class="cart-item-remove">
                    <a href="#" class="btn-remove" data-index="${index}">🗑️</a>
                </div>
            </div>
        `;
    });

    html += `
        <div class="cart-actions">
            <a href="xe-ban.html" class="btn-continue">← Tiếp Tục Mua Xe</a>
            <a href="#" class="btn-clear-cart">🗑️ Xóa Tất Cả</a>
        </div>
    `;

    cartItemsContainer.innerHTML = html;

    // Re-attach event listeners for new elements
    attachCartEventListeners();
    updateOrderSummary();
    saveCartToMemory();
}

// Gắn lại event listeners cho giỏ hàng
function attachCartEventListeners() {
    const quantityInputs = document.querySelectorAll('.quantity-input');
    quantityInputs.forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            cart[index].quantity = parseInt(this.value) || 1;
            updateCartUI();
        });
    });

    const removeButtons = document.querySelectorAll('.btn-remove');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const index = parseInt(this.getAttribute('data-index'));
            removeFromCart(index);
        });
    });

    const clearCartBtn = document.querySelector('.btn-clear-cart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Bạn có chắc muốn xóa tất cả xe khỏi giỏ hàng?')) {
                cart = [];
                updateCartUI();
            }
        });
    }
}

// Cập nhật tổng đơn hàng
function updateOrderSummary() {
    let subtotal = 0;
    cart.forEach(item => {
        const priceStr = item.price.replace(/[^0-9]/g, '');
        const price = parseInt(priceStr) || 0;
        subtotal += price * item.quantity;
    });

    const discount = 10; // triệu
    let extraServices = 0;

    // Tính phí dịch vụ thêm
    const serviceCheckboxes = document.querySelectorAll('.service-option input[type="checkbox"]:checked');
    serviceCheckboxes.forEach(checkbox => {
        const priceElement = checkbox.parentElement.querySelector('.service-price');
        if (priceElement) {
            const servicePrice = parseInt(priceElement.textContent.replace(/[^0-9]/g, '')) || 0;
            extraServices += servicePrice;
        }
    });

    const total = subtotal - discount + extraServices;

    // Cập nhật hiển thị
    const subtotalElement = document.querySelector('.summary-row:not(.discount):not(.total) .summary-value');
    if (subtotalElement) {
        subtotalElement.textContent = `${subtotal.toLocaleString()} triệu VNĐ`;
    }

    const totalElement = document.querySelector('.summary-row.total .summary-value');
    if (totalElement) {
        totalElement.textContent = `${total.toLocaleString()} triệu VNĐ`;
    }
}

// Cập nhật số lượng trong giỏ hàng ở header
function updateCartCount() {
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartLink = document.querySelector('a[href="gio-hang.html"]');
    if (cartLink && cartCount > 0) {
        cartLink.textContent = `🛒 Giỏ Hàng (${cartCount})`;
    }
}

// Lưu giỏ hàng vào bộ nhớ (trong session)
function saveCartToMemory() {
    // Lưu vào biến toàn cục
    window.cartData = cart;
}

// Tải giỏ hàng từ bộ nhớ
function loadCartFromMemory() {
    if (window.cartData) {
        cart = window.cartData;
    }
}

// Form validation
const forms = document.querySelectorAll('form');
forms.forEach(form => {
    form.addEventListener('submit', function(e) {
        const requiredInputs = form.querySelectorAll('[required]');
        let isValid = true;

        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = '#ff6b6b';
            } else {
                input.style.borderColor = '#ddd';
            }
        });

        if (!isValid) {
            e.preventDefault();
            alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
        }
    });
});

// View toggle buttons
const viewButtons = document.querySelectorAll('.view-btn');
viewButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        viewButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});