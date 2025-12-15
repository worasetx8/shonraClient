# รายงานการใช้งาน API Endpoints ที่ล้มเหลว

## สรุป
พบว่า endpoints ที่ล้มเหลว 2 endpoints ถูกใช้งานในโค้ดดังนี้:

---

## 1. `/api/products/with-flash-sale` ❌

### สถานะ: ไม่พบการใช้งานในโค้ด
- **Route File**: `src/app/api/products/with-flash-sale/route.ts`
- **Backend Endpoint**: `http://localhost:3002/api/products/with-flash-sale` (404 Not Found)
- **Client Route**: `http://localhost:3000/api/products/with-flash-sale` (500 Internal Server Error)

### การใช้งาน:
- ❌ **ไม่พบการเรียกใช้ในโค้ด client**
- มีแค่ route file แต่ไม่มี component หรือ page ที่เรียกใช้ endpoint นี้

### สรุป:
- **ไม่กระทบการใช้งาน** - endpoint นี้ไม่ได้ถูกใช้ในโค้ดจริง

---

## 2. `/api/shopee/saved-products` ❌

### สถานะ: ถูกใช้งานใน Backoffice
- **Route File**: `src/app/api/shopee/saved-products/route.ts`
- **Backend Endpoint ที่เรียก**: `http://localhost:3002/api/products/saved` (ไม่ใช่ `/api/products/saved-products`)
- **Client Route**: `http://localhost:3000/api/shopee/saved-products` (500 Internal Server Error)

### การใช้งาน:

#### 1. **`src/app/backoffice/saved/page.tsx`** (หน้า Backoffice - Saved Products)
   - เรียกใช้: `fetch('/api/shopee/saved-products')`
   - ใช้สำหรับ:
     - GET: ดึงรายการ saved products (บรรทัด 122)
     - PATCH: อัปเดต status ของ product (บรรทัด 307)
     - DELETE: ลบ product (บรรทัด 380)
     - PUT: อัปเดต product status (บรรทัด 427)

#### 2. **`src/components/BackofficeProductCard.tsx`** (Component Product Card)
   - เรียกใช้: `fetch('/api/shopee/saved-products')`
   - ใช้สำหรับ:
     - PATCH: อัปเดต product status (บรรทัด 255)
     - PUT: อัปเดต product status (บรรทัด 381)

### ปัญหา:
- Client route เรียก backend endpoint: `/api/products/saved` (บรรทัด 26 ใน route.ts)
- แต่ใน test script ทดสอบ: `/api/products/saved-products` (ซึ่งไม่มีใน backend)
- **Backend endpoint ที่ถูกต้อง**: `/api/products/saved` ✅

### สรุป:
- **กระทบการใช้งาน** - endpoint นี้ถูกใช้ใน Backoffice
- **แต่ backend endpoint ที่เรียกจริงคือ `/api/products/saved` ไม่ใช่ `/api/products/saved-products`**
- ต้องทดสอบ endpoint `/api/products/saved` แทน

---

## คำแนะนำ

### 1. `/api/products/with-flash-sale`
- **ไม่ต้องแก้ไข** - ไม่ได้ถูกใช้งาน
- หรือลบ route file ออกถ้าไม่ต้องการใช้

### 2. `/api/shopee/saved-products`
- **ต้องแก้ไข test script** - ทดสอบ endpoint `/api/products/saved` แทน `/api/products/saved-products`
- Client route ทำงานถูกต้องแล้ว (เรียก backend ที่ `/api/products/saved`)

---

## สรุปผลกระทบ

| Endpoint | ถูกใช้งาน? | กระทบการใช้งาน? | ต้องแก้ไข? |
|----------|-----------|-----------------|-----------|
| `/api/products/with-flash-sale` | ❌ ไม่ | ❌ ไม่ | ❌ ไม่ |
| `/api/shopee/saved-products` | ✅ ใช่ (Backoffice) | ⚠️ อาจมี | ✅ แก้ test script |

