# ระบบภาษาที่สร้างขึ้นเอง (Custom Language System)

## หลักการทำงานของระบบ

ระบบนี้ออกแบบมาเพื่อให้การจัดระเบียบข้อมูลและการเข้าถึงข้อมูลเป็นเรื่องง่าย โดยใช้โครงสร้างที่คล้ายกับการจัดการไฟล์และโฟลเดอร์ในระบบปฏิบัติการทั่วไป แต่ปรับให้เหมาะสมกับการใช้งานของระบบนี้ ซึ่งประกอบด้วย **engagement** และ **ตัวแปร**

### โครงสร้างหลัก

1. **Engagement** (โฟลเดอร์)
    - **Engagement** คือส่วนที่ใช้ในการจัดกลุ่มข้อมูล เช่น โฟลเดอร์ในระบบไฟล์ที่สามารถเก็บไฟล์หลาย ๆ ไฟล์ไว้ในนั้น
    - ในระบบนี้ **engagement หลัก** (หรือ **engagement แรก**) จะใช้เครื่องหมาย `$` นำหน้าเพื่อแยกระดับของหมวดหมู่ให้ชัดเจน ตัวอย่างเช่น:
      ```plaintext
      $general:
      ```
      - หมวดหมู่ `$general` คือการจัดกลุ่มข้อมูลทั่วไป เช่น ข้อความแนะนำ หรือการตั้งค่าเริ่มต้น
    - **Engagement อื่นๆ** ที่อยู่ภายใน **engagement หลัก** จะไม่ต้องใช้เครื่องหมาย `$` นำหน้า โดยจะใช้เครื่องหมาย `:` เพื่อแยกระดับของหมวดหมู่ตามปกติ ตัวอย่างเช่น:
      ```plaintext
      $language: th:
      ```
      - หมวดหมู่ `$language: th` คือการจัดกลุ่มข้อมูลของภาษาไทย ซึ่งภายใน `th` ก็ยังคงใช้การกำหนดข้อมูลตามปกติ โดยไม่ต้องมีเครื่องหมาย `$` ต่อไป

2. **ตัวแปร** (ไฟล์)
    - **ตัวแปร** คือข้อมูลที่อยู่ภายใน **engagement** ซึ่งเก็บค่าในรูปแบบของข้อความหรือค่าตัวเลข
    - ตัวแปรสามารถเก็บข้อมูลได้หลายประเภท เช่น ข้อความ (String), ตัวเลข (Number), หรือ Boolean
    - การเขียน **ตัวแปร** จะใช้การกำหนดชื่อของตัวแปร และตามด้วยค่าที่ต้องการเก็บ
    - ตัวอย่างการเขียน **ตัวแปร**:
      ```plaintext
      theme "dark"
      ```
      - ตัวแปร `theme` เก็บค่าธีมเป็น "dark"
      - ตัวแปร `mode` เก็บค่าโหมดเป็น "minimal"
      ```plaintext
      mode "minimal"
      ```

### วิธีการเขียน

1. **การสร้าง Engagement**
    - การสร้าง **engagement** หรือหมวดหมู่จะใช้เครื่องหมาย `$` เฉพาะใน **engagement หลัก** หรือ **engagement แรก** เท่านั้น เพื่อตัดแบ่งระหว่างระดับต่าง ๆ
    - ตัวอย่างการสร้าง **engagement หลัก**:
      ```plaintext
      $settings:
      ```
    - **engagement** ที่อยู่ภายใน **engagement หลัก** จะไม่ใช้เครื่องหมาย `$` นำหน้า และจะใช้การแบ่งหมวดหมู่ตามปกติ
    - ตัวอย่างการสร้าง **engagement ย่อย**:
      ```plaintext
      $settings: theme "dark"
      mode "minimal"
      ```

2. **การสร้างตัวแปร**
    - ตัวแปรจะใช้การกำหนดชื่อของตัวแปร และค่าของมัน
    - ตัวอย่างการสร้าง **ตัวแปร**:
      ```plaintext
      theme "dark"
      mode "minimal"
      ```

### ตัวอย่างการใช้งาน

```plaintext
# การจัดระเบียบข้อมูลประเภทภาษา
$language:
  th:
    hk "สวัสดี"
    kv "ยินดีต้อนรับ"
  en:
    hk "Hello"

# การจัดระเบียบข้อมูลการตั้งค่าระบบ
$settings:
  theme "dark"
  mode "minimal"
  notifications "enabled"

# การจัดระเบียบข้อมูลรายการผู้ใช้
$users:
  user1:
    role "admin"
    status "active"
  user2:
    role "guest"
    status "inactive"

# การจัดระเบียบข้อมูลตัวแปร
$variables:
  app_version "1.0"
  api_endpoint "https://api.example.com"
  db_config:
    host "localhost"
    port "5432"
    username "admin"
    password "secret"