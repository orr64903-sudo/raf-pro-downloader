RAF PRO SIAP DIISI KEY — VERSI GROQ — PETUNJUK SINGKAT

1. Upload seluruh isi folder ini ke repository GitHub baru. Jangan upload file .env atau API key.
2. Buat service Web Service di Render, hubungkan repository.
   Build Command: npm install
   Start Command: npm start
3. Di Render > Environment, tambahkan:
   GROQ_API_KEY = API key Groq
   GROQ_MODEL = llama-3.3-70b-versatile
   SOCIALKIT_API_URL = endpoint API resmi dari dokumentasi SocialKit milikmu
   SOCIALKIT_API_KEY = key SocialKit
   SOCIALKIT_AUTH_HEADER = nama header sesuai dokumentasi
   SOCIALKIT_AUTH_PREFIX = prefix sesuai dokumentasi (mis. Bearer; kosong jika tidak dibutuhkan)
   SOCIALKIT_URL_FIELD = nama field URL sesuai dokumentasi (mis. url)
   SESSION_SECRET = string acak panjang
4. Deploy lalu buka URL Render.
5. Untuk AI, backend memakai Groq Chat Completions API. Isi GROQ_API_KEY di Render Environment.
6. /api/health harus membalas {"ok":true,"app":"RAF PRO"}.

PENTING TENTANG LOGIN:
Login starter memakai penyimpanan RAM server agar mudah dicoba; akun akan hilang saat server restart/deploy dan tidak cocok untuk produksi. Sebelum dibuka ke publik, ganti dengan Supabase Auth/database permanen. Jangan pakai untuk menyimpan akun sensitif.

PENTING TENTANG SOCIALKIT:
Paket API SocialKit berbeda-beda. Kode ini memerlukan endpoint, header, parameter, dan format respons yang tepat dari dashboard/dokumentasi akunmu. Jika tidak cocok, downloader akan memberi pesan error; key saja tidak otomatis menentukan endpoint.
API Groq dan SocialKit harus kamu dapatkan sendiri dari penyedia masing-masing.
