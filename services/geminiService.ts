import { GoogleGenAI, Type } from '@google/genai';
import type { FormData } from '../types';
import { SUBJECTS_BY_LEVEL_AND_PHASE } from '../types';

export async function generateRPM(formData: FormData): Promise<string> {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const allSelectedDimensions = [...new Set(formData.meetingGraduateProfileDimensions.flat())];

  const learningAndMaterialText = formData.meetingMaterials
    .map((material, index) =>
      `  - Pertemuan ${index + 1}:\n` +
      `    - Model Pembelajaran: ${formData.learningModels[index]}\n` +
      `    - Materi Pelajaran Spesifik: ${material}\n` +
      `    - Dimensi Profil Lulusan: ${formData.meetingGraduateProfileDimensions[index]?.join(', ') || 'Tidak ada'}`
    )
    .join('\n');
  
  const availableSubjects = (formData.educationLevel && formData.phase)
    ? SUBJECTS_BY_LEVEL_AND_PHASE[formData.educationLevel]?.[formData.phase] || []
    : [];
  const otherSubjects = availableSubjects.filter(s => s !== formData.subject).join(', ');
  const crossDisciplinaryInstruction = `Pilih 2-3 disiplin ilmu lain yang relevan dari daftar mata pelajaran berikut untuk jenjang ${formData.educationLevel} Fase ${formData.phase}: [${otherSubjects}]. Jelaskan secara singkat keterkaitan masing-masing disiplin ilmu tersebut dengan materi pelajaran "${formData.subjectMatter}".`;

  const formattedObjectives = formData.learningObjectives
    .split('\n')
    .filter(Boolean)
    .join('<br>');

  const prompt = `
    Anda adalah seorang ahli dalam desain kurikulum dan pedagogi di Indonesia yang bertugas untuk membuat Rencana Pembelajaran Mendalam (RPM) yang komprehensif. Berdasarkan data input yang disediakan, buatlah RPM yang lengkap dan terstruktur dalam format tabel HTML tunggal, HANYA sampai bagian E (Asesmen). Bagian F (LKPD) akan dibuat terpisah.

    **DATA INPUT PENGGUNA:**
    - Nama Satuan Pendidikan: ${formData.schoolName}
    - Mata Pelajaran: ${formData.subject}
    - Jenjang / Kelas / Semester: ${formData.educationLevel} / ${formData.grade} / ${formData.semester}
    - Durasi Setiap Pertemuan: ${formData.duration}
    - Jumlah Pertemuan: ${formData.meetings}
    - Capaian Pembelajaran (CP): ${formData.learningOutcomes}
    - Tujuan Pembelajaran: ${formattedObjectives}
    - Materi Pelajaran Utama: ${formData.subjectMatter}
    - Rincian Rencana per Pertemuan:
${learningAndMaterialText}
    - Delapan Dimensi Profil Lulusan yang Dipilih (Keseluruhan): ${allSelectedDimensions.join(', ')}

    **DEFINISI PRINSIP PEMBELAJARAN MENDALAM (DEEP LEARNING):**
    Gunakan definisi berikut untuk menentukan prinsip yang tepat secara otomatis pada setiap langkah pembelajaran:
    1. **Berkesadaran**: Pengalaman belajar peserta didik yang diperoleh ketika mereka memiliki kesadaran untuk menjadi pembelajar yang aktif dan mampu meregulasi diri. Peserta didik memahami tujuan pembelajaran, termotivasi secara intrinsik untuk belajar, serta aktif mengembangkan strategi belajar untuk mencapai tujuan.
    2. **Bermakna**: Peserta didik dapat merasakan manfaat dan relevansi dari hal-hal yang dipelajari untuk kehidupan. Peserta didik mampu mengkonstruksi pengetahuan baru berdasarkan pengetahuan lama dan menerapkan pengetahuannya dalam kehidupan nyata.
    3. **Menggembirakan**: Pembelajaran yang menggembirakan merupakan suasana belajar yang positif, menyenangkan, menantang, dan memotivasi. Peserta didik merasa dihargai atas keterlibatan dan kontribusinya pada proses pembelajaran. Peserta didik terhubung secara emosional, sehingga lebih mudah memahami, mengingat, dan menerapkan pengetahuan.

    **INSTRUKSI OUTPUT & STYLING HTML:**
    Hasilkan seluruh respons sebagai **SATU STRING HTML TUNGGAL** yang valid. Pastikan output adalah kode HTML murni tanpa penjelasan atau karakter markdown seperti \`\`\`html.
    1.  **Struktur Tabel Utama:** Gunakan elemen \`<table>\` sebagai kontainer utama dengan atribut \`style="width: 100%; border-collapse: collapse; table-layout: fixed;"\`. Tabel harus memiliki dua kolom utama.
    2.  **Judul Bagian Utama:** Judul (misalnya, "A. IDENTITAS") harus berada dalam satu sel \`<th>\` yang membentang di dua kolom (\`colspan="2"\`). Gunakan gaya berikut: \`style="border: 1px solid black; padding: 8px; background-color: #f2f2f2; text-align: left; font-weight: bold;"\`.
    3.  **Baris Konten (Label & Data):** Untuk baris yang berisi label dan data (misalnya, "Nama Satuan Pendidikan" dan nilainya), gunakan dua sel \`<td>\`:
        -   **Sel Label (Kolom 1):** Gaya: \`style="border: 1px solid black; padding: 8px; vertical-align: top; width: 25%; font-weight: bold;"\`.
        -   **Sel Data (Kolom 2):** Gaya: \`style="border: 1px solid black; padding: 8px; vertical-align: top; width: 75%; text-align: justify; overflow-wrap: break-word;"\`.
    4.  **Baris Konten Melintang:** Jika sebuah bagian konten memerlukan lebar penuh (seperti deskripsi di bagian D atau tabel di E), gunakan satu sel \`<td>\` yang membentang di dua kolom (\`colspan="2"\`). Gaya: \`style="border: 1px solid black; padding: 8px; vertical-align: top; text-align: justify; overflow-wrap: break-word;"\`.
    5.  **Tabel Bersarang:** Jika ada tabel di dalam tabel (misal untuk bagian Pengalaman Belajar), pastikan tabel tersebut juga memiliki \`width: 100%\` dan sel-selnya di-styling dengan baik.
    6.  **Ejaan:** Gunakan Ejaan Bahasa Indonesia (EBI) yang baik dan benar.

    **STRUKTUR TABEL RPM:**

    **A. IDENTITAS**
    - Nama Satuan Pendidikan: (sesuai input)
    - Mata Pelajaran: (sesuai input)
    - Kelas/Semester: (sesuai input)
    - Durasi Pertemuan: (sesuai input)

    **B. IDENTIFIKASI**
    - Siswa: (Generate deskripsi singkat tentang karakteristik umum siswa pada jenjang dan kelas yang dipilih).
    - Materi Pelajaran: ${formData.subjectMatter}
    - Dimensi Profil Lulusan: (sesuai input keseluruhan)

    **C. DESAIN PEMBELAJARAN**
    - Capaian Pembelajaran: (sesuai input)
    - Tujuan Pembelajaran: (sesuai input)
    - Lintas Disiplin Ilmu: (${crossDisciplinaryInstruction})
    - Topik Pembelajaran: (Generate topik-topik spesifik berdasarkan input "Materi Pelajaran").
    - Model Pembelajaran per Pertemuan: (Sajikan kembali pilihan pengguna dalam format daftar).
    - Kemitraan Pembelajaran: (Generate ide kemitraan yang relevan, misal: orang tua, komunitas lokal, praktisi).
    - Lingkungan Pembelajaran: (Generate deskripsi lingkungan belajar yang mendukung, misal: kelas fleksibel, luar kelas, virtual).
    - Pemanfaatan Digital: (Generate rekomendasi tools/platform digital yang relevan dengan materi dan model pembelajaran, sebutkan nama tools seperti Canva, Quizizz, Google Workspace, dll.).

    **D. PENGALAMAN BELAJAR**
    Untuk setiap pertemuan (dari 1 sampai ${formData.meetings}), buatlah serangkaian baris (\`<tr>\`) yang merinci pengalaman belajar. **Pastikan semua aktivitas yang di-generate (pembuka, inti, dan penutup) selaras dengan Model Pembelajaran DAN Dimensi Profil Lulusan yang telah dipilih untuk pertemuan tersebut.** Rincian aktivitas, terutama di bagian Kegiatan Inti, harus secara spesifik mengikuti sintaks atau langkah-langkah dari model pembelajaran yang bersangkutan. Ikuti struktur dua kolom yang telah didefinisikan.

    **Struktur untuk Setiap Pertemuan:**
    1.  **Baris Judul Pertemuan:** Buat satu baris \`<tr>\` dengan satu sel \`<th>\` yang membentang dua kolom (\`colspan="2"\`) dan di-styling sebagai judul bagian utama. Isi dengan: \`<strong>Pertemuan [Nomor Pertemuan]: [Model Pembelajaran yang Disediakan untuk pertemuan ini]</strong>\`.
    2.  **Baris Materi Pertemuan:** Buat satu baris \`<tr>\` dengan dua sel \`<td>\`.
        -   **Kolom 1 (LABEL):** Isi dengan: \`<strong>Materi Pelajaran</strong>\`. Gunakan gaya "Sel Label".
        -   **Kolom 2 (DATA):** Gunakan **secara persis** "Materi Pelajaran Spesifik" yang telah disediakan untuk pertemuan ini dari bagian "Rincian Rencana per Pertemuan". Jangan membuat atau mengubah materi ini. Gunakan gaya "Sel Data".
    3.  **Baris Dimensi Profil Lulusan:** Buat satu baris \`<tr>\` dengan dua sel \`<td>\`.
        -   **Kolom 1 (LABEL):** Isi dengan: \`<strong>Dimensi Profil Lulusan</strong>\`. Gunakan gaya "Sel Label".
        -   **Kolom 2 (DATA):** Gunakan **secara persis** "Dimensi Profil Lulusan" yang telah disediakan untuk pertemuan ini dari bagian "Rincian Rencana per Pertemuan". Gunakan gaya "Sel Data".
    4.  **Baris Kegiatan Pembuka:** Buat satu baris \`<tr>\` dengan dua sel \`<td>\`.
        -   **Kolom 1 (TAHAPAN):** Isi dengan: \`<strong>1. Kegiatan Pembuka (Durasi: ~15% dari total durasi)</strong>\`. Gunakan gaya "Sel Label".
        -   **Kolom 2 (AKTIVITAS PEMBELAJARAN):** Generate 2-3 langkah konkret yang fokus pada **proses memahami konsep**. Aktivitas ini bertujuan mengaktifkan pengetahuan awal siswa dan membangun pemahaman dasar. Contoh: pertanyaan pemantik yang menggugah rasa ingin tahu, analisis gambar/video singkat terkait konsep, atau diskusi awal untuk memetakan pemahaman siswa. 
        **WAJIB:** Pada akhir langkah kegiatan, cantumkan satu **Prinsip Pembelajaran Mendalam** (Berkesadaran, Bermakna, atau Menggemberikan) yang paling relevan dengan aktivitas tersebut, dicetak tebal.
        Contoh format: "...siswa mendiskusikan pertanyaan pemantik. **(Prinsip: Berkesadaran)**"
        Gunakan gaya "Sel Data".
    5.  **Baris Kegiatan Inti:** Buat satu baris \`<tr>\` dengan dua sel \`<td>\`.
        -   **Kolom 1 (TAHAPAN):** Isi dengan: \`<strong>2. Kegiatan Inti (Durasi: ~70% dari total durasi)</strong>\`. Gunakan gaya "Sel Label".
        -   **Kolom 2 (AKTIVITAS PEMBELAJARAN):** Buatlah struktur aktivitas yang jelas di dalam kegiatan inti ini yang mencakup tiga tahap pengalaman belajar mendalam. Gunakan sub-judul tebal untuk setiap tahap, diikuti tag <br>.
            \`<strong>Memahami:</strong>\`<br>
            (Generate 1-2 langkah konkret untuk memperdalam pemahaman konsep yang telah diperkenalkan di kegiatan pembuka. Contoh: analisis studi kasus singkat, demonstrasi oleh guru, atau diskusi kelompok kecil untuk memecahkan masalah konseptual. **Akhiri dengan prinsip pembelajaran mendalam yang relevan dalam huruf tebal.**)<br><br>
            \`<strong>Mengaplikasi:</strong>\`<br>
            (Generate langkah-langkah pembelajaran yang paling detail di sini. **Aktivitas ini harus secara spesifik mengikuti sintaks atau langkah-langkah dari model pembelajaran yang dipilih untuk pertemuan ini.** Fokus pada apa yang siswa lakukan. Ikuti panduan sintaks berikut:
            *   **Jika Modelnya 'Inkuiri-Discovery Learning':** Rancang aktivitas yang mengikuti langkah: 1) Merumuskan masalah/pertanyaan, 2) Merumuskan hipotesis, 3) Mengumpulkan data (melalui observasi/eksperimen), 4) Menganalisis data, 5) Menarik kesimpulan.
            *   **Jika Modelnya 'Project Based Learning (PjBL)':** Rancang aktivitas yang berpusat pada proyek dengan langkah: 1) Dimulai dengan pertanyaan esensial, 2) Merencanakan proyek, 3) Menyusun jadwal pelaksanaan, 4) Melaksanakan dan memonitor kemajuan proyek, 5) Presentasi/menguji hasil, 6) Evaluasi dan refleksi pengalaman.
            *   **Jika Modelnya 'Problem Based Learning':** Rancang aktivitas berbasis masalah dengan langkah: 1) Orientasi siswa pada masalah otentik, 2) Mengorganisasikan siswa untuk meneliti, 3) Membimbing penyelidikan (individu/kelompok), 4) Mengembangkan dan menyajikan solusi, 5) Menganalisis dan mengevaluasi proses pemecahan masalah.
            *   **Jika Modelnya 'Game Based Learning':** Rancang aktivitas permainan edukatif yang mencakup: 1) Penjelasan aturan, tujuan, dan kaitannya dengan materi, 2) Sesi bermain di mana siswa menerapkan konsep untuk mencapai tujuan game, 3) Sesi debriefing untuk merefleksikan pembelajaran yang didapat dari game.
            *   **Jika Modelnya 'Station Learning':** Rancang 3-4 'stasiun' belajar yang berbeda. Setiap stasiun memiliki tugas yang spesifik terkait materi (misal: Stasiun 1: Baca artikel & jawab pertanyaan, Stasiun 2: Aktivitas praktik/hands-on, Stasiun 3: Diskusi kelompok, Stasiun 4: Latihan digital/kuis). Jelaskan aktivitas di setiap stasiun dan bagaimana siswa akan berotasi.
            *   **Jika Modelnya 'Integrative Thinking':** Rancang aktivitas yang menuntun siswa melalui proses: 1) Mengidentifikasi dua ide/solusi yang berlawanan terhadap suatu masalah, 2) Menganalisis kelebihan dan kekurangan masing-masing ide, 3) Menciptakan solusi baru yang mengintegrasikan elemen-elemen terbaik dari kedua ide tersebut.
            Pastikan langkah-langkah yang dibuat sangat konkret dan berpusat pada aktivitas siswa. **Setiap aktivitas harus secara eksplisit mencerminkan dimensi yang dipilih.** **Akhiri langkah ini dengan prinsip pembelajaran mendalam yang relevan dalam huruf tebal.**)<br><br>
            \`<strong>Merefleksi:</strong>\`<br>
            (Generate 1-2 langkah untuk refleksi formatif atau metakognisi *selama* proses belajar. Contoh: Minta siswa berhenti sejenak untuk menuliskan satu tantangan yang mereka hadapi. **Akhiri dengan prinsip pembelajaran mendalam yang relevan dalam huruf tebal.**)
            <br>
            Gunakan gaya "Sel Data".
    6.  **Baris Kegiatan Penutup:** Buat satu baris \`<tr>\` dengan dua sel \`<td>\`.
        -   **Kolom 1 (TAHAPAN):** Isi dengan: \`<strong>3. Kegiatan Penutup (Durasi: ~15% dari total durasi)</strong>\`. Gunakan gaya "Sel Label".
        -   **Kolom 2 (AKTIVITAS PEMBELAJARAN):** Generate 2-3 langkah konkret yang membantu siswa **meregulasi diri untuk belajar**. Fokus pada refleksi proses belajar, identifikasi pemahaman, dan perencanaan langkah selanjutnya. Contoh: meminta siswa menulis 'exit ticket' yang berisi '1 hal yang saya pelajari', '1 hal yang masih membingungkan', dan '1 pertanyaan yang saya miliki'. Bisa juga berupa diskusi metakognitif atau self-assessment.
        **WAJIB:** Pada akhir langkah kegiatan, cantumkan satu **Prinsip Pembelajaran Mendalam** (Berkesadaran, Bermakna, atau Menggemberikan) yang paling relevan dengan aktivitas tersebut, dicetak tebal.
        Contoh format: "...siswa mengisi lembar refleksi diri. **(Prinsip: Berkesadaran)**"
        Gunakan gaya "Sel Data".

    **E. ASESMEN PEMBELAJARAN**
    (Tampilkan ini dalam sel yang melintang, \`colspan="2"\`)
    - **Asesmen Awal (Diagnostik):** Generate 1-2 contoh asesmen diagnostik singkat (misal: pertanyaan pemantik, kuis 2 soal) untuk mengukur pemahaman awal siswa terkait materi.
    - **Asesmen Proses (Formatif):** Buatlah sebuah rubrik asesmen formatif dalam bentuk tabel HTML yang rapi dan mudah dibaca. Rubrik ini harus relevan dengan materi pelajaran dan salah satu aktivitas inti yang telah dirancang.
        - **Struktur Tabel:** Buat tabel HTML (\`<table style="width:100%; border-collapse: collapse;">\`) dengan kolom: **Kriteria Penilaian**, **Sangat Baik (4)**, **Baik (3)**, **Cukup (2)**, dan **Perlu Bimbingan (1)**.
        - **Konten:** Masukkan 2-3 kriteria penilaian yang spesifik dan relevan (misalnya: 'Pemahaman Konsep', 'Keterampilan Kolaborasi', 'Partisipasi Aktif'). Untuk setiap kriteria, berikan deskripsi perilaku yang jelas dan terukur untuk setiap tingkat pencapaian.
        - **Styling:** Gunakan styling inline. Setiap sel (\`<th>\` dan \`<td>\`) harus memiliki \`border: 1px solid black; padding: 8px;\`. Header tabel (\`<th>\`) harus memiliki latar belakang abu-abu muda (\`background-color: #f2f2f2;\`) dan teks rata tengah. Sel deskriptor (\`<td>\`) harus memiliki teks rata kiri.
    - **Asesmen Akhir (Sumatif):** Generate serangkaian soal sumatif yang bervariasi untuk mengukur pemahaman komprehensif. Pastikan semua soal relevan dengan materi pelajaran.
        - **1. Soal Pilihan Ganda (2-3 soal):** Buat 2-3 soal pilihan ganda dengan 4 opsi jawaban (A, B, C, D) yang menguji pemahaman konsep dasar. Tandai kunci jawaban yang benar (misal: **Jawaban: C**).
        - **2. Soal Esai Singkat (1-2 soal):** Buat 1-2 soal esai yang meminta siswa untuk menjelaskan sebuah konsep atau proses dengan kalimat mereka sendiri (jawaban diharapkan 3-5 kalimat).
        - **3. Soal Studi Kasus/Analisis (HOTS):** Buat sebuah studi kasus atau skenario yang lebih kompleks dan relevan dengan materi. Berdasarkan skenario tersebut, ajukan pertanyaan-pertanyaan berikut:
          - **Pertanyaan Analisis & Aplikasi:** Ajukan 2 pertanyaan yang meminta siswa menganalisis situasi, menerapkan konsep untuk memecahkan masalah, dan mengevaluasi/memberikan rekomendasi.
          - **Pertanyaan Refleksi Mendalam:** Ajukan 1 pertanyaan yang mendorong siswa merenungkan proses pemecahan masalah atau menghubungkan pembelajaran dengan dunia nyata.
    
    Setelah semua bagian di atas selesai, tambahkan bagian tanda tangan di bagian paling bawah.

    `;

    const date = new Date(formData.date);
    const formattedDate = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const signaturePrompt = `
    Terakhir, tambahkan bagian tanda tangan di bagian paling bawah setelah tabel utama. Gunakan struktur tabel HTML dengan dua kolom untuk penataan. Tabel ini harus memiliki lebar 100% dan tanpa border (\`style="border: none;"\`).

    **Struktur Tabel Tanda Tangan:**
    - Buat satu baris (\`<tr>\`) dengan dua sel (\`<td>\`).
    - **Sel Kiri (Kepala Sekolah):**
        - Atur gaya sel: \`style="width: 50%; text-align: center; vertical-align: top; border: none;"\`.
        - Isi dengan konten berikut, gunakan tag \`<br>\` untuk baris baru:
            "Mengetahui,"
            <br>
            "Kepala Sekolah"
            <br><br><br><br>
            "<strong>${formData.principalName}</strong>"
            <br>
            "NIP. ${formData.principalNip || '-'}"
    - **Sel Kanan (Guru):**
        - Atur gaya sel: \`style="width: 50%; text-align: center; vertical-align: top; border: none;"\`.
        - Isi dengan konten berikut, gunakan tag \`<br>\` untuk baris baru:
            "${formData.location}, ${formattedDate}"
            <br>
            "Guru Mata Pelajaran"
            <br><br><br><br>
            "<strong>${formData.teacherName}</strong>"
            <br>
            "NIP. ${formData.teacherNip || '-'}"

    Pastikan outputnya adalah HTML murni yang menyatu dengan sisa dokumen.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt + signaturePrompt
      });
      return response.text;
    } catch (error) {
      console.error("Error calling Gemini API for RPM:", error);
      if (error instanceof Error && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
          throw new Error("Batas permintaan ke AI terlampaui saat membuat RPM utama. Mohon tunggu sejenak dan coba lagi.");
      }
      throw new Error("Gagal menghasilkan RPM. Terjadi kesalahan pada server AI atau koneksi Anda. Silakan coba lagi.");
    }
}

export async function generateLKPD(formData: FormData, meetingIndex: number): Promise<string> {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const meetingNumber = meetingIndex + 1;
  const learningModel = formData.learningModels[meetingIndex];
  
  const prompt = `
    Anda adalah seorang ahli dalam desain Lembar Kerja Peserta Didik (LKPD) yang kreatif dan berpusat pada siswa.
    Berdasarkan data berikut, buatlah **SATU LKPD** yang lengkap untuk **Pertemuan ${meetingNumber}**.

    **Konteks Pembelajaran:**
    - Mata Pelajaran: ${formData.subject}
    - Jenjang / Kelas / Semester: ${formData.educationLevel} / ${formData.grade} / ${formData.semester}
    - Materi Pokok: ${formData.subjectMatter}
    - Model Pembelajaran untuk Pertemuan ini: ${learningModel}
    - Tujuan Pembelajaran yang Relevan: ${formData.learningObjectives}

    **INSTRUKSI OUTPUT & STYLING:**
    Hasilkan seluruh respons sebagai **SATU STRING HTML TUNGGAL** yang valid, siap untuk disisipkan ke dalam div. Gunakan styling inline yang baik untuk membuat LKPD terlihat seperti dokumen yang siap cetak. Jangan gunakan tag \`<html>\` atau \`<body>\`.

    **STRUKTUR LKPD (WAJIB DIIKUTI):**
    1.  **Judul LKPD:** Buat judul yang menarik terkait topik untuk pertemuan ini. Gunakan \`<h3 style="text-align: center; font-weight: bold;">LEMBAR KERJA PESERTA DIDIK (LKPD) - PERTEMUAN ${meetingNumber}</h3>\` dan \`<h4 style="text-align: center;">[Judul Kreatif Terkait Materi]</h4>\`.
    2.  **Tujuan Pembelajaran:** Cantumkan 1-2 tujuan pembelajaran yang paling relevan dari daftar yang diberikan untuk sesi ini. Bungkus dalam div dengan border.
    3.  **Alat dan Bahan:** Sebutkan alat dan bahan yang dibutuhkan siswa.
    4.  **Gambar Ilustrasi:** **Wajib!** Sisipkan satu gambar yang relevan dengan materi pelajaran menggunakan tag \`<img>\`. Gunakan layanan placeholder gambar seperti 'https://picsum.photos/seed/${formData.subject.split(" ")[0]}/400/200'. Berikan atribut \`alt\` yang deskriptif. Atur style gambar agar \`width: 100%; max-width: 400px; display: block; margin: 10px auto; border-radius: 8px;\`.
    5.  **Langkah-langkah Kegiatan (Ikuti 3 Tahap Pengalaman Belajar dan sesuaikan dengan Model Pembelajaran ${learningModel}):**
        -   **<h5 style="font-weight: bold; margin-top: 1em;">TAHAP 1: MEMAHAMI (Aktivitas Pemantik)</h5>**
            -   Berikan 1-2 instruksi singkat dengan pertanyaan pemantik atau studi kasus mini untuk mengaktifkan pengetahuan awal siswa. Aktivitas ini harus mencerminkan tahap awal dari model ${learningModel}.
            -   Sediakan area jawaban berupa beberapa baris kosong atau kotak isian (\`<div style="border: 1px dashed #ccc; padding: 10px; margin-top: 5px; min-height: 80px;">\`).
        -   **<h5 style="font-weight: bold; margin-top: 1em;">TAHAP 2: MENGAPLIKASI (Aktivitas Utama)</h5>**
            -   Berikan instruksi yang jelas dan terstruktur untuk aktivitas utama yang secara spesifik mengikuti sintaks/langkah-langkah dari model pembelajaran **${learningModel}**.
            -   Jika aktivitasnya adalah analisis, sediakan teks singkat untuk dianalisis. Jika eksperimen, berikan langkah-langkahnya.
            -   Sediakan ruang kerja yang jelas bagi siswa, misalnya tabel untuk diisi, diagram untuk dilengkapi, atau beberapa pertanyaan terstruktur untuk dijawab.
        -   **<h5 style="font-weight: bold; margin-top: 1em;">TAHAP 3: MEREFLEKSI (Aktivitas Refleksi)</h5>**
            -   Ajukan 2-3 pertanyaan reflektif yang mendorong siswa untuk merenungkan apa yang telah mereka pelajari, kesulitan yang dihadapi, dan relevansi pembelajaran dengan kehidupan sehari-hari.
            -   Contoh: "Apa hal baru yang kamu pelajari hari ini?", "Bagian mana yang paling menantang? Mengapa?", "Bagaimana kamu bisa menggunakan pengetahuan ini di luar kelas?".
            -   Sediakan area jawaban.

    Pastikan seluruh output adalah satu blok HTML yang koheren.
    `;
    
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error(`Error calling Gemini API for LKPD ${meetingNumber}:`, error);
    if (error instanceof Error && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
        throw new Error(`Batas permintaan ke AI terlampaui saat membuat LKPD Pertemuan ${meetingNumber}. Mohon tunggu sejenak dan coba lagi.`);
    }
    throw new Error(`Gagal menghasilkan LKPD untuk Pertemuan ${meetingNumber}. Terjadi kesalahan pada server AI atau koneksi Anda. Silakan coba lagi.`);
  }
}

export async function generateMeetingMaterials(mainSubjectMatter: string, subject: string, grade: string, meetingsCount: number): Promise<string[]> {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Anda adalah seorang ahli perancang kurikulum. Berdasarkan Materi Pelajaran utama berikut, pecahlah menjadi ${meetingsCount} topik yang spesifik, logis, dan berurutan untuk setiap pertemuan. Setiap topik harus cukup fokus untuk dibahas dalam satu sesi pembelajaran.

    **KONTEKS:**
    - **Mata Pelajaran:** "${subject}"
    - **Kelas:** "${grade}"
    - **Jumlah Pertemuan:** ${meetingsCount}
    - **Materi Pelajaran Utama:**
      ---
      ${mainSubjectMatter}
      ---

    **TUGAS:**
    Buatlah daftar topik untuk setiap pertemuan.

    **FORMAT OUTPUT (WAJIB JSON):**
    Hasilkan output dalam format JSON array yang berisi ${meetingsCount} string. Setiap string adalah topik untuk satu pertemuan.
    Contoh jika ${meetingsCount} adalah 3:
    ["Topik untuk Pertemuan 1", "Topik untuk Pertemuan 2", "Topik untuk Pertemuan 3"]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    });
    
    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);

    if (Array.isArray(result)) {
        // Pad or truncate array to match meetingsCount, preventing mismatches
        const materials = new Array(meetingsCount).fill('');
        for (let i = 0; i < meetingsCount; i++) {
            materials[i] = result[i] || `Topik Pertemuan ${i + 1} (gagal dibuat otomatis)`;
        }
        return materials;
    } else {
      throw new Error("Invalid response format from AI.");
    }

  } catch (error) {
    console.error("Error calling Gemini API for meeting materials:", error);
    throw new Error("Gagal memecah materi pelajaran secara otomatis. Silakan isi manual.");
  }
}

export async function generateLearningDetailsAndSubjectMatter(learningOutcomes: string, subject: string, grade: string): Promise<{ objectives: string; subjectMatter: string }> {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const cleanLearningOutcomes = learningOutcomes.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();

  const prompt = `
    Anda adalah seorang ahli perancang kurikulum yang sangat memahami **Panduan Pembelajaran dan Asesmen (PPA) edisi 2025** dari Kemendikbudristek Indonesia.

    Tugas Anda adalah menganalisis Capaian Pembelajaran (CP) yang diberikan, lalu:
    1. Menurunkannya menjadi serangkaian Tujuan Pembelajaran (TP) yang operasional.
    2. Menganalisis CP dan TP untuk mengekstrak daftar Materi Pelajaran inti.

    **KONTEKS:**
    - **Mata Pelajaran:** "${subject}"
    - **Kelas:** "${grade}"
    - **Capaian Pembelajaran (CP) yang Diberikan:**
      ---
      ${cleanLearningOutcomes}
      ---

    **PROSES KERJA (WAJIB DIIKUTI):**

    **A. Perumusan Tujuan Pembelajaran (TP):**
    1.  **Identifikasi Ruang Lingkup Materi:** Baca keseluruhan CP untuk menentukan domain/topik besar.
    2.  **Analisis 'Kompetensi' dan 'Konten':** Untuk setiap kalimat dalam CP, pecah menjadi dua komponen utama:
        *   **Kompetensi:** Kata kerja operasional yang menunjukkan keterampilan (contoh: menjelaskan, menganalisis, menciptakan).
        *   **Konten:** Materi inti atau konsep yang dipelajari (contoh: struktur sel, prinsip demokrasi).
        *   **PENTING:** Urai SEMUA pasangan 'kompetensi' dan 'konten' yang ada.
    3.  **Rumuskan TP:** Ubah setiap pasangan 'Kompetensi' + 'Konten' menjadi satu kalimat TP yang spesifik dan terukur. Satu TP fokus pada satu kemampuan.
    4.  **Susun TP:** Kumpulkan dan urutkan semua TP secara logis, dari yang paling dasar hingga kompleks. Beri nomor urut.

    **B. Ekstraksi Materi Pelajaran:**
    1.  **Analisis Ulang:** Setelah semua TP dirumuskan, tinjau kembali CP dan daftar TP tersebut.
    2.  **Identifikasi Konten Inti:** Identifikasi semua **'Konten'** (topik/materi) yang menjadi dasar dari setiap TP yang telah Anda buat.
    3.  **Buat Daftar Materi:** Susun daftar topik-topik materi pelajaran tersebut secara ringkas dan logis. Hindari duplikasi.

    **TUGAS OUTPUT (HASILKAN DALAM FORMAT JSON):**
    Berdasarkan proses di atas, hasilkan output dalam format JSON yang valid dengan struktur berikut:

    1.  **\`objectives\` (Tujuan Pembelajaran - TP):**
        *   Hasilkan daftar Tujuan Pembelajaran yang sudah Anda rumuskan dan urutkan.
        *   **Format:** Satu string tunggal. Setiap tujuan berada di baris baru, diberi nomor urut (misal, "1. [Tujuan]\\n2. [Tujuan]").

    2.  **\`subjectMatter\` (Materi Pelajaran):**
        *   Hasilkan daftar Materi Pelajaran yang sudah Anda identifikasi.
        *   **Format:** Satu string tunggal. Setiap materi berada di baris baru, bisa menggunakan bullet point atau nomor (misal, "- [Materi 1]\\n- [Materi 2]").

    Pastikan seluruh output yang Anda berikan adalah JSON yang valid tanpa teks atau markup tambahan.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                objectives: {
                    type: Type.STRING,
                    description: 'Daftar Tujuan Pembelajaran (TP) sebagai satu string teks, dipisahkan oleh baris baru.'
                },
                subjectMatter: {
                    type: Type.STRING,
                    description: 'Daftar topik Materi Pelajaran inti sebagai satu string teks, dipisahkan oleh baris baru.'
                },
            },
            required: ['objectives', 'subjectMatter']
        }
      },
    });
    
    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);

    return {
      objectives: result.objectives.trim(),
      subjectMatter: result.subjectMatter.trim(),
    };

  } catch (error) {
    console.error("Error calling Gemini API for learning details and subject matter:", error);
    if (error instanceof Error && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
        throw new Error("Batas permintaan ke AI terlampaui. Mohon tunggu sejenak dan coba lagi.");
    }
    throw new Error("Gagal menghasilkan detail pembelajaran dan materi otomatis. Terjadi kesalahan pada server AI atau koneksi Anda.");
  }
}

export async function generateMeetingDimensions(
  meetingTopic: string,
  learningModel: string,
  availableDimensions: string[],
  subject: string,
  grade: string
): Promise<string[]> {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  if (availableDimensions.length === 0) {
    return [];
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Anda adalah seorang ahli pedagogi. Berdasarkan konteks pembelajaran berikut, pilih 2-3 "Dimensi Profil Lulusan" yang paling relevan dari daftar yang disediakan. Pilihan Anda harus selaras dengan topik, model pembelajaran, dan aktivitas yang mungkin dilakukan siswa.

    **KONTEKS PEMBELAJARAN:**
    - **Mata Pelajaran:** ${subject}
    - **Kelas:** ${grade}
    - **Topik Spesifik Pertemuan:** "${meetingTopic}"
    - **Model Pembelajaran:** "${learningModel}"

    **DAFTAR DIMENSI YANG TERSEDIA (PILIH DARI SINI):**
    [${availableDimensions.join(', ')}]

    **TUGAS:**
    Pilih 2 atau 3 dimensi yang paling sesuai.

    **FORMAT OUTPUT (WAJIB JSON):**
    Hasilkan output sebagai JSON array yang berisi string nama dimensi yang Anda pilih. Pastikan nama dimensi sama persis dengan yang ada di daftar.
    Contoh: ["Penalaran Kritis", "Kolaborasi", "Kreativitas"]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    });

    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);

    if (Array.isArray(result) && result.every(item => typeof item === 'string')) {
      return result.filter(dim => availableDimensions.includes(dim));
    }
    throw new Error("Invalid response format from AI.");

  } catch (error) {
    console.error("Error calling Gemini API for meeting dimensions:", error);
    throw new Error("Gagal membuat rekomendasi dimensi profil lulusan.");
  }
}

export async function generatePPT(formData: FormData): Promise<any[]> {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Anda adalah seorang desainer slide presentasi instruksional yang hebat. Buatlah struktur konten slide presentasi (PowerPoint) yang komprehensif berdasarkan data pembelajaran berikut.

    **DATA:**
    - Mata Pelajaran: ${formData.subject}
    - Jenjang/Kelas: ${formData.educationLevel} / ${formData.grade}
    - Materi Utama: ${formData.subjectMatter}
    - Tujuan Pembelajaran: ${formData.learningObjectives}
    - Rincian Topik per Pertemuan: ${formData.meetingMaterials.join(', ')}

    **TUGAS:**
    Hasilkan sebuah array JSON yang berisi objek-objek slide. Setiap slide harus memiliki properti 'title' dan 'content' (berupa array string/poin-poin).
    Struktur slide yang diharapkan:
    1. Slide Judul (Nama Sekolah, Mapel, Nama Guru)
    2. Slide Tujuan Pembelajaran
    3. Slide-slide Materi (Pecah materi utama dan topik per pertemuan menjadi poin-poin yang mudah dipahami)
    4. Slide Diskusi/Aktivitas (Gunakan model pembelajaran: ${formData.learningModels[0]})
    5. Slide Refleksi & Kesimpulan

    **FORMAT OUTPUT (JSON):**
    [
      { "title": "Judul Slide", "content": ["Poin 1", "Poin 2"] },
      ...
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['title', 'content']
          }
        }
      },
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Error calling Gemini API for PPT:", error);
    throw new Error("Gagal membuat konten presentasi.");
  }
}