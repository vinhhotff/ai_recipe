# Hướng dẫn cài đặt Supabase cho Recipe Project

## 🚀 Bước 1: Tạo project Supabase

1. Truy cập [https://supabase.com](https://supabase.com)
2. Đăng ký/Đăng nhập tài khoản
3. Click **"New project"**
4. Chọn organization và điền thông tin:
   - **Name**: `recipe-generator`
   - **Database Password**: Tạo password mạnh (lưu lại!)
   - **Region**: Chọn region gần nhất (Singapore cho Việt Nam)
5. Click **"Create new project"**

## 🔑 Bước 2: Lấy thông tin kết nối

Sau khi project được tạo, vào **Settings > API**:

- **Project URL**: `https://your-project-ref.supabase.co`
- **anon public**: `eyJhbGciOiJIUzI1NiIsI...` (anon key)
- **service_role**: `eyJhbGciOiJIUzI1NiIsI...` (service role key - **BẢO MẬT**)

## 📁 Bước 3: Tạo Storage Bucket

1. Vào **Storage** trong dashboard Supabase
2. Click **"Create a new bucket"**
3. Điền thông tin:
   - **Name**: `recipe-images`
   - **Public bucket**: ✅ Bật (để có thể truy cập public URL)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: `image/*`

## 🔌 Bước 4: Lấy Database URL

Vào **Settings > Database**, copy **Connection string**:

```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

## ⚙️ Bước 5: Cập nhật Environment Variables

Tạo file `.env` trong folder `backend/` với nội dung:

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Google Vision (optional)
GOOGLE_VISION_API_KEY="your-google-vision-api-key"

# Supabase
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_STORAGE_BUCKET="recipe-images"

# App Config
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
```

**⚠️ Lưu ý:** Thay thế các giá trị `your-*` bằng thông tin thực tế từ Supabase dashboard.

## 🗄️ Bước 6: Chạy Database Migration

```bash
cd backend
npm install
npx prisma migrate dev
npx ts-node prisma/seed-ingredients.ts
```

## 🧪 Bước 7: Test kết nối

Khởi động backend và test:

```bash
npm run start:dev
```

Kiểm tra các endpoint:
- `GET http://localhost:3001/core-recipes/ingredients` - Lấy danh sách nguyên liệu
- `POST http://localhost:3001/pantry/upload-image` - Upload ảnh để nhận diện nguyên liệu

## 📸 Bước 8: Test Upload Image

Sử dụng Postman hoặc cURL để test upload:

```bash
curl -X POST http://localhost:3001/pantry/upload-image \\
  -H "Authorization: Bearer your-jwt-token" \\
  -F "image=@/path/to/your/image.jpg"
```

## 🎯 Các tính năng Supabase được sử dụng

### 1. **PostgreSQL Database**
- ✅ Lưu trữ recipes, ingredients, users
- ✅ Quan hệ M:N giữa recipes và ingredients
- ✅ Soft delete, pagination, search

### 2. **Storage**
- ✅ Upload hình ảnh pantry items
- ✅ Lưu trữ ảnh minh họa recipe (tương lai)
- ✅ Public URLs cho frontend

### 3. **Real-time (Tương lai)**
- 🔄 Real-time updates khi tạo recipe mới
- 🔄 Collaborative cooking features

### 4. **Auth Integration (Tương lai)**
- 🔄 Có thể chuyển từ JWT sang Supabase Auth
- 🔄 Social login (Google, Facebook)

## 🔧 Troubleshooting

### Lỗi kết nối Database:
```bash
# Test connection
npx prisma db pull
```

### Lỗi Storage permission:
1. Vào **Storage > recipe-images > Settings**
2. Đảm bảo **Public bucket** được bật
3. Kiểm tra **Allowed MIME types** có `image/*`

### Lỗi upload file:
- Kiểm tra `SUPABASE_SERVICE_ROLE_KEY` (không phải anon key)
- Đảm bảo bucket `recipe-images` đã được tạo

## 🚀 Tính năng nâng cao

### Database Webhooks
Tạo webhook để sync data real-time:
```sql
-- Tạo webhook function
CREATE OR REPLACE FUNCTION notify_recipe_changes()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('recipe_changes', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger
CREATE TRIGGER recipe_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON core_recipes
  FOR EACH ROW EXECUTE FUNCTION notify_recipe_changes();
```

### Edge Functions (Optional)
Tạo Supabase Edge Functions cho:
- AI recipe generation
- Image processing
- Advanced search

## 📊 Monitoring

Vào **Settings > Usage** để theo dõi:
- Database size & connections
- Storage usage
- API requests
- Bandwidth usage

---

## 🎉 Hoàn thành!

Bây giờ bạn đã có:
- ✅ Supabase PostgreSQL thay thế local database
- ✅ Supabase Storage thay thế AWS S3
- ✅ Core Recipe CRUD hoạt động hoàn chỉnh
- ✅ Image upload cho pantry recognition
- ✅ Seed data với các nguyên liệu Vietnamese

**Tiếp theo:** Khởi động frontend và test full-stack functionality!
