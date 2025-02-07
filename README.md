# Tài liệu kỹ thuật triển khai WebApp Quản Lý Màn LED

## 1. Thông tin Máy chủ

- **Môi trường:** Máy ảo Ubuntu được cài đặt trên Hyper-V của EZcloud-Server.
- **Địa chỉ IP:** `10.3.9.142`
- **Tài khoản đăng nhập:**
  - **Username:** `hung`
  - **Password:** hung
- **Vị trí mã nguồn:** Toàn bộ 4 file code (HTML, CSS, JavaScript frontend và file backend Node.js) sẽ được đặt tại thư mục `/var/www/html`.

## 2. Cấu trúc và Nội dung 4 File Code

### 2.1. Frontend

- **index.html:**  
  Tạo giao diện chính cho hệ thống quản lý màn LED, bao gồm:
  - Form upload file.
  - Lựa chọn thiết bị (checkbox với giá trị IP).
  - Hiển thị tiến trình upload.
  - Liên kết với `styles.css` và `script.js`.

- **styles.css:**  
  Định dạng giao diện cho trang HTML với:
  - Reset style, bố cục, kiểu cho form, checkbox, progress bar, spinner.
  - Hỗ trợ responsive cho thiết bị di động.

- **script.js:**  
  Xử lý logic giao diện, bao gồm:
  - Hiển thị login overlay và kiểm tra thông tin đăng nhập.
  - Xử lý sự kiện cho nút “Cập nhật ảnh”:
    - Lấy danh sách thiết bị được chọn.
    - Kiểm tra file được upload (định dạng, kích thước tối đa 200MB).
    - Gửi yêu cầu POST đến API `/push-media` với theo dõi tiến trình upload qua `XMLHttpRequest`.

### 2.2. Backend

- **server.js (hoặc file backend Node.js):**  
  Chức năng của backend bao gồm:
  - Sử dụng Node.js và Express để xử lý upload file qua `multer` và hỗ trợ CORS.
  - Kiểm tra file upload (định dạng cho phép và giới hạn kích thước).
  - Nhận danh sách thiết bị từ phía client và xác thực với whitelist (ví dụ: `10.3.12.107`, `10.3.12.105`).
  - Sử dụng ADB (Android Debug Bridge) để:
    - Kết nối tới từng thiết bị qua lệnh `adb connect <device>:5555`.
    - Xóa nội dung cũ trong thư mục `/sdcard/zcapp/zcplayer/standalone/Screen1/`.
    - Đẩy file media đến thư mục trên thiết bị.
    - Khởi động lại ứng dụng Android bằng các lệnh `adb shell am force-stop` và `adb shell monkey`.
  - Sau khi xử lý, xóa file upload trong thư mục `uploads` để dọn dẹp.
  - Xử lý lỗi thông qua global error handler cho multer và các lỗi server.

## 3. Các Bước Triển khai trên Máy chủ Ubuntu

### 3.1. Chuẩn bị môi trường trên máy chủ

1. **Đăng nhập vào máy ảo Ubuntu:**

   ```bash
   ssh hung@10.3.9.142
   ```

2. **Cập nhật hệ thống:**

   ```bash
   sudo apt update
   sudo apt upgrade
   ```

3. **Cài đặt Apache2 (nếu chưa cài):**

   ```bash
   sudo apt install apache2
   ```

   Apache2 sẽ phục vụ các file tĩnh từ thư mục `/var/www/html`.

4. **Cài đặt Node.js và npm:**

   - **Qua apt:**

     ```bash
     sudo apt install nodejs npm
     ```

   - **Qua NVM (khuyến nghị):**

     ```bash
     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
     source ~/.bashrc
     nvm install node
     ```

5. **Cài đặt ADB (Android Debug Bridge):**

   ```bash
   sudo apt install android-tools-adb
   ```

### 3.2. Triển khai mã nguồn

1. **Đưa toàn bộ 4 file code vào thư mục `/var/www/html`:**
   - Sử dụng SCP, SFTP hoặc công cụ truyền file để copy các file `index.html`, `styles.css`, `script.js`, và `server.js` vào `/var/www/html`.
   - **Lưu ý:**  
     - Apache2 phục vụ các file tĩnh (HTML, CSS, JS) mà không cần thay đổi cấu hình.
     - Backend Node.js cần được chạy độc lập.

2. **Cài đặt các phụ thuộc cho backend:**

   ```bash
   cd /var/www/html
   npm init -y
   npm install express multer cors
   ```

### 3.3. Cấu hình và chạy ứng dụng

1. **Chạy Backend Node.js:**
   - Chạy trực tiếp bằng lệnh:

     ```bash
     node server.js
     ```

   - Hoặc sử dụng PM2 để quản lý tiến trình (trong môi trường production):

     ```bash
     sudo npm install -g pm2
     pm2 start server.js --name led-manager
     ```

2. **Điều chỉnh URL API trong file `script.js` (nếu cần):**
   - Nếu sử dụng đường dẫn tương đối cho API, đảm bảo rằng frontend gọi đúng địa chỉ backend.
   - Ví dụ, thay đổi lệnh mở kết nối API thành:

     ```js
     xhr.open('POST', 'http://10.3.9.142:3000/push-media');
     ```

   - Nếu muốn giữ nguyên đường dẫn tương đối, cần cấu hình Apache làm reverse proxy (nhưng điều này sẽ thay đổi cấu hình Apache2).

## 4. Cấu hình Nginx Proxy Manager

Để đảm bảo người dùng có thể truy cập từ xa và kết nối giữa frontend và backend hoạt động, cần cấu hình Nginx Proxy Manager với 2 proxy host như sau:

1. **Truy cập vào giao diện quản lý Nginx Proxy Manager:**  
   Sử dụng trình duyệt để truy cập địa chỉ của Nginx Proxy Manager (địa chỉ này tùy thuộc vào cấu hình của bạn).

2. **Cấu hình Proxy Host cho Frontend:**
   - **Domain Name:** `led.peridotgrand.com`
   - **Scheme:** `http`
   - **Forward Hostname / IP:** `10.3.9.142`
   - **Forward Port:** `80`
   - **Options:** Cấu hình SSL (nếu cần) và các tùy chọn khác theo yêu cầu.

3. **Cấu hình Proxy Host cho Backend:**
   - **Domain Name:** `srv.peridotgrand.com`
   - **Scheme:** `http`
   - **Forward Hostname / IP:** `10.3.9.142`
   - **Forward Port:** `3000`
   - **Options:** Cấu hình SSL (nếu cần) và các tùy chọn khác theo yêu cầu.

4. **Lưu và Áp dụng cấu hình:**  
   Sau khi cấu hình xong, lưu lại và khởi động lại Nginx Proxy Manager (nếu cần) để đảm bảo các thay đổi được áp dụng.

## 5. Lưu ý và Bảo mật

- **Bảo mật Tài khoản:**  
  - Đảm bảo rằng thông tin đăng nhập cho hệ thống và máy chủ được bảo mật cẩn thận.
- **Quyền truy cập thư mục:**  
  - Xác minh rằng tài khoản chạy Node.js có quyền ghi/đọc trong `/var/www/html` và thư mục `uploads`.
- **Kết nối HTTPS:**  
  - Cân nhắc cài đặt SSL và cấu hình HTTPS trong môi trường production.
- **Giám sát và Backup:**  
  - Sử dụng các công cụ giám sát và thực hiện backup định kỳ để đảm bảo hệ thống hoạt động ổn định.

## 6. Tóm tắt Quy trình Triển khai

1. **Chuẩn bị môi trường:**  
   - Cập nhật hệ thống, cài đặt Apache2, Node.js, npm và ADB trên máy ảo Ubuntu (IP: `10.3.9.142`).

2. **Triển khai mã nguồn:**  
   - Copy toàn bộ 4 file code vào `/var/www/html`.
   - Cài đặt các phụ thuộc cho backend bằng `npm install`.

3. **Chạy ứng dụng:**  
   - Khởi chạy backend Node.js (`server.js`) độc lập (khuyến nghị dùng PM2).
   - Đảm bảo giao tiếp giữa frontend (được phục vụ bởi Apache2) và backend (Node.js) được thiết lập chính xác qua URL API.

4. **Cấu hình Nginx Proxy Manager:**  
   - Cấu hình 2 proxy host:  
     - `led.peridotgrand.com` trỏ về `http://10.3.9.142:80`.
     - `srv.peridotgrand.com` trỏ về `http://10.3.9.142:3000`.

5. **Kiểm tra và Vận hành:**  
   - Truy cập giao diện qua `http://led.peridotgrand.com` (frontend) và `http://srv.peridotgrand.com` (backend).
   - Thực hiện đăng nhập, upload file và kiểm tra log xử lý ADB.
   - Đảm bảo cấu hình bảo mật, quyền truy cập và backup hệ thống.
