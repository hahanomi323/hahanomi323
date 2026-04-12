        // Cập nhật hiển thị giá
        function updatePrice() {
            const priceValue = document.getElementById('price').value;
            document.getElementById('priceDisplay').textContent = `0 - ${priceValue}`;
        }

        // Hàm lọc xe
        function filterCars() {
            const searchValue = document.getElementById('searchInput').value.toLowerCase();
            const brandValue = document.getElementById('brand').value.toLowerCase();
            const yearValue = document.getElementById('year').value;
            const fuelValue = document.getElementById('fuel').value.toLowerCase();
            const transmissionValue = document.getElementById('transmission').value.toLowerCase();
            const priceValue = parseInt(document.getElementById('price').value);

            const carCards = document.querySelectorAll('.car-card');
            let visibleCount = 0;

            carCards.forEach(card => {
                const carName = card.querySelector('.car-name').textContent.toLowerCase();
                const carBrand = card.getAttribute('data-brand');
                const carYear = card.getAttribute('data-year');
                const carFuel = card.getAttribute('data-fuel');
                const carTransmission = card.getAttribute('data-transmission');
                const carPrice = parseInt(card.getAttribute('data-price'));

                // Kiểm tra điều kiện lọc
                const matchSearch = carName.includes(searchValue);
                const matchBrand = !brandValue || carBrand === brandValue;
                const matchYear = !yearValue || carYear === yearValue;
                const matchFuel = !fuelValue || carFuel === fuelValue;
                const matchTransmission = !transmissionValue || carTransmission === transmissionValue;
                const matchPrice = carPrice <= priceValue;

                // Hiển thị hoặc ẩn xe
                if (matchSearch && matchBrand && matchYear && matchFuel && matchTransmission && matchPrice) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            // Hiển thị thông báo nếu không có kết quả
            document.getElementById('noResults').style.display = visibleCount === 0 ? 'block' : 'none';
        }

        // Hàm sắp xếp xe
        function sortCars() {
            const sortValue = document.getElementById('sort').value;
            const carGrid = document.getElementById('carGrid');
            const carCards = Array.from(document.querySelectorAll('.car-card'));

            carCards.sort((a, b) => {
                switch(sortValue) {
                    case 'price-asc':
                        return parseInt(a.getAttribute('data-price')) - parseInt(b.getAttribute('data-price'));
                    case 'price-desc':
                        return parseInt(b.getAttribute('data-price')) - parseInt(a.getAttribute('data-price'));
                    case 'km-asc':
                        return parseInt(a.getAttribute('data-km')) - parseInt(b.getAttribute('data-km'));
                    case 'year-desc':
                        return parseInt(b.getAttribute('data-year')) - parseInt(a.getAttribute('data-year'));
                    default:
                        return 0;
                }
            });

            // Sắp xếp lại các card trong DOM
            carCards.forEach(card => carGrid.appendChild(card));
        }

        // Thêm sự kiện cho ô tìm kiếm
        document.getElementById('searchInput').addEventListener('input', filterCars);

        // Ngăn form submit
        document.getElementById('searchForm').addEventListener('submit', function(e) {
            e.preventDefault();
        });