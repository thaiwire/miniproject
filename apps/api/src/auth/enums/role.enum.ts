// เก็บ Role ไว้ฝั่ง API เท่านั้น ไม่ใส่ใน shared-types เพราะการเช็คสิทธิ์เป็นเรื่องของ backend
// ถ้าวันหน้า frontend ต้องโชว์ UI ตาม role (เช่น ซ่อนปุ่มลบสำหรับ STAFF) ค่อยย้ายไป shared-types ทีหลัง
export enum Role {
  ADMIN = 'admin',
  STAFF = 'staff',
}
