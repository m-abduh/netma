import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const employees = [
  { name: 'Alex',    rank: 'CEO',                   jobDesc: 'Mengawasi dan mengelola seluruh AI Karyawan, menentukan arah strategis perusahaan', mode: 'plan', x: 1900, y: 0 },
  { name: 'Budi',    rank: 'CTO',                   jobDesc: 'Bertanggung jawab atas seluruh aspek teknis dan pengembangan produk teknologi', mode: 'build', x: 400, y: 250 },
  { name: 'Candra',  rank: 'CPO',                   jobDesc: 'Mengelola pengembangan produk dan memastikan produk sesuai kebutuhan pengguna', mode: 'plan', x: 1680, y: 250 },
  { name: 'Doni',    rank: 'CRO',                   jobDesc: 'Bertanggung jawab atas pendapatan, penjualan, dan pengembangan bisnis', mode: 'plan', x: 2740, y: 250 },
  { name: 'Eko',     rank: 'CMO',                   jobDesc: 'Mengelola strategi pemasaran dan branding perusahaan', mode: 'plan', x: 3800, y: 250 },
  { name: 'Fajar',   rank: 'Backend Developer',     jobDesc: 'Mengembangkan dan memelihara API, logic server, dan sistem backend', mode: 'build', x: -150, y: 500 },
  { name: 'Gilang',  rank: 'Frontend Developer',    jobDesc: 'Mengembangkan antarmuka pengguna dan pengalaman frontend aplikasi', mode: 'build', x: 70, y: 500 },
  { name: 'Indra',   rank: 'DevOps Engineer',        jobDesc: 'Mengelola infrastruktur, CI/CD, deployment, dan otomatisasi sistem', mode: 'build', x: 290, y: 500 },
  { name: 'Joko',    rank: 'Database Engineer',      jobDesc: 'Merancang, mengoptimalkan, dan memelihara database serta query', mode: 'build', x: 510, y: 500 },
  { name: 'Kevin',   rank: 'QA Engineer',            jobDesc: 'Melakukan pengujian kualitas, bug tracking, dan memastikan stabilitas produk', mode: 'build', x: 730, y: 500 },
  { name: 'Luki',    rank: 'Security Engineer',      jobDesc: 'Menjaga keamanan sistem, melakukan audit keamanan, dan mitigasi celah', mode: 'build', x: 950, y: 500 },
  { name: 'Marco',   rank: 'Product Designer',       jobDesc: 'Bikin desain UI fitur baru, wireframe, prototype. Tangan kanan CPO buat wujudin konsep ke visual.', mode: 'plan', x: 1350, y: 500 },
  { name: 'Nando',   rank: 'UI/UX Researcher',       jobDesc: 'Riset perilaku user, usability testing, cari tau kenapa user pake/tinggalin produk.', mode: 'plan', x: 1570, y: 500 },
  { name: 'Pras',    rank: 'Data Analyst',           jobDesc: 'Tracking metrik produk (retention, conversion, engagement), bikin laporan insight buat CPO.', mode: 'plan', x: 1790, y: 500 },
  { name: 'Riko',    rank: 'Technical Writer',       jobDesc: 'Nulis dokumentasi API, panduan pengguna, release notes. Biar user gak bingung.', mode: 'plan', x: 2010, y: 500 },
  { name: 'Surya',   rank: 'Customer Success Specialist', jobDesc: 'Onboarding user baru, bantu mereka sukses pake produk. Ujung tombak retensi.', mode: 'plan', x: 2410, y: 500 },
  { name: 'Tomi',    rank: 'Sales Executive',        jobDesc: 'Cari prospek, presentasi produk, closing deals.', mode: 'plan', x: 2630, y: 500 },
  { name: 'Ujang',   rank: 'Account Manager',        jobDesc: 'Ngurus client existing, jagain hubungan baik, upsell fitur tambahan.', mode: 'plan', x: 2850, y: 500 },
  { name: 'Vino',    rank: 'Business Development',   jobDesc: 'Cari partnership strategis, ekspansi ke market baru.', mode: 'plan', x: 3070, y: 500 },
  { name: 'Wawan',   rank: 'Content Writer',         jobDesc: 'Nulis blog, case study, whitepaper. Buat edukasi pasar dan branding.', mode: 'plan', x: 3470, y: 500 },
  { name: 'Yogi',    rank: 'Growth Specialist',      jobDesc: 'Eksekusi campaign akuisisi, iklan, conversion optimization.', mode: 'plan', x: 3690, y: 500 },
  { name: 'Zainal',  rank: 'SEO Specialist',         jobDesc: 'Optimasi website biar muncul di pencarian Google. Organic traffic.', mode: 'plan', x: 3910, y: 500 },
  { name: 'Bayu',    rank: 'Social Media Specialist', jobDesc: 'Kelola social media, engage dengan audiens, brand awareness.', mode: 'plan', x: 4130, y: 500 },
];

const supervisorMap: Record<string, string> = {
  Budi: 'Alex', Candra: 'Alex', Doni: 'Alex', Eko: 'Alex',
  Fajar: 'Budi', Gilang: 'Budi', Indra: 'Budi', Joko: 'Budi', Kevin: 'Budi', Luki: 'Budi',
  Marco: 'Candra', Nando: 'Candra', Pras: 'Candra', Riko: 'Candra',
  Surya: 'Doni', Tomi: 'Doni', Ujang: 'Doni', Vino: 'Doni',
  Wawan: 'Eko', Yogi: 'Eko', Zainal: 'Eko', Bayu: 'Eko',
};

async function main() {
  const existing = await prisma.employee.count();
  if (existing > 0) {
    console.log('Database sudah berisi data, skip seed.');
    return;
  }

  const created: Record<string, string> = {};

  for (const emp of employees) {
    const supervisorName = supervisorMap[emp.name];
    const created_employee = await prisma.employee.create({
      data: {
        name: emp.name,
        rank: emp.rank,
        jobDesc: emp.jobDesc,
        mode: emp.mode,
        positionX: emp.x,
        positionY: emp.y,
        supervisorId: supervisorName ? created[supervisorName] : null,
      },
    });
    created[emp.name] = created_employee.id;
    console.log(`  ✓ ${emp.name} (${emp.rank})`);
  }

  console.log(`\n✅ ${employees.length} karyawan berhasil di-seed.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
