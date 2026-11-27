import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const units = [
    ["DIR", "Direktorat"],
    ["TU", "Bagian Administrasi Umum / Tata Usaha"],
    ["AKD", "Bagian Administrasi Akademik & Kemahasiswaan"],
    ["KEU", "Bagian Keuangan"],
    ["KEP", "Jurusan Keperawatan"],
    ["KEB", "Jurusan Kebidanan"],
  ];
  for (const [kode, nama] of units) await prisma.unit.upsert({ where: { kode }, update: {}, create: { kode, nama } });

  const jabatan: [string, number][] = [
    ["Direktur", 1],
    ["Wakil Direktur", 1],
    ["Kepala Bagian", 2],
    ["Ketua Jurusan", 2],
    ["Kepala Sub Bagian", 2],
    ["Staf", 3],
    ["Pengadministrasi Persuratan", 3],
  ];
  for (const [nama, level] of jabatan) await prisma.jabatan.upsert({ where: { nama }, update: {}, create: { nama, level } });

  // Contoh klasifikasi (sesuaikan dengan pedoman klasifikasi arsip instansi Anda)
  const klasifikasi = [
    ["PP", "Pendidikan dan Pelatihan"],
    ["KP", "Kepegawaian"],
    ["KU", "Keuangan"],
    ["UM", "Umum"],
    ["HK", "Hukum"],
    ["PL", "Perlengkapan"],
    ["PR", "Perencanaan"],
    ["DL", "Diklat"],
  ];
  for (const [kode, nama] of klasifikasi) await prisma.klasifikasi.upsert({ where: { kode }, update: {}, create: { kode, nama } });

  const count = await prisma.templateSurat.count();
  if (count === 0) {
    await prisma.templateSurat.createMany({
      data: [
        {
          nama: "Surat Dinas Umum",
          isi: "Dengan hormat,\n\nSehubungan dengan {{perihal}}, bersama ini kami sampaikan bahwa ...\n\nDemikian surat ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.",
        },
        {
          nama: "Undangan Rapat",
          jenis: "Undangan",
          isi: "Dengan hormat,\n\nDalam rangka {{perihal}}, kami mengundang Bapak/Ibu untuk hadir pada:\n\nHari/Tanggal : ...\nWaktu        : ... WIB s.d. selesai\nTempat       : ...\nAcara        : ...\n\nMengingat pentingnya acara tersebut, kami mohon Bapak/Ibu hadir tepat waktu. Atas perhatiannya kami ucapkan terima kasih.",
        },
        {
          nama: "Surat Tugas",
          jenis: "Surat Tugas",
          isi: "Yang bertanda tangan di bawah ini menugaskan kepada:\n\nNama    : ...\nNIP     : ...\nJabatan : ...\n\nUntuk melaksanakan {{perihal}} pada tanggal ... bertempat di ....\n\nDemikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.",
        },
      ],
    });
  }

  const username = (process.env.SEED_ADMIN_USERNAME || "admin").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "GantiPassword123!";
  const tu = await prisma.unit.findUnique({ where: { kode: "TU" } });
  const existing = await prisma.user.findUnique({ where: { username } });
  if (!existing) {
    await prisma.user.create({
      data: { username, nama: "Administrator TU", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10), unitId: tu?.id },
    });
    console.log(`Admin dibuat: ${username} / ${password} (segera ganti password setelah login)`);
  } else {
    console.log(`Admin ${username} sudah ada, dilewati.`);
  }

  if (process.env.SEED_DEMO === "1") {
    const pw = await bcrypt.hash("password123", 10);
    const jab = async (n: string) => (await prisma.jabatan.findUnique({ where: { nama: n } }))?.id;
    const un = async (k: string) => (await prisma.unit.findUnique({ where: { kode: k } }))?.id;
    const demo = [
      { username: "direktur", nama: "Dr. Direktur (Demo)", role: "PIMPINAN" as const, jabatanId: await jab("Direktur"), unitId: await un("DIR") },
      { username: "kabag.tu", nama: "Kabag Adum (Demo)", role: "KEPALA_UNIT" as const, jabatanId: await jab("Kepala Bagian"), unitId: await un("TU") },
      { username: "kajur.kep", nama: "Kajur Keperawatan (Demo)", role: "KEPALA_UNIT" as const, jabatanId: await jab("Ketua Jurusan"), unitId: await un("KEP") },
      { username: "staf.tu", nama: "Staf TU (Demo)", role: "STAF" as const, jabatanId: await jab("Staf"), unitId: await un("TU") },
      { username: "staf.kep", nama: "Staf Keperawatan (Demo)", role: "STAF" as const, jabatanId: await jab("Staf"), unitId: await un("KEP") },
    ];
    for (const d of demo) await prisma.user.upsert({ where: { username: d.username }, update: {}, create: { ...d, passwordHash: pw } });
    console.log("Akun demo dibuat (password: password123)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
