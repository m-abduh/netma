import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const employees = [
  { name: 'Alex',  rank: 'CEO',                   jobDesc: 'Mengawasi dan mengelola seluruh AI Karyawan, menentukan arah strategis perusahaan', x: 1600, y: 0 },
  { name: 'Budi',  rank: 'CTO',                   jobDesc: 'Bertanggung jawab atas seluruh aspek teknis dan pengembangan produk teknologi', x: 400, y: 220 },
  { name: 'Citra', rank: 'CPO',                   jobDesc: 'Mengelola pengembangan produk dan memastikan produk sesuai kebutuhan pengguna', x: 1350, y: 220 },
  { name: 'Doni',  rank: 'CRO',                   jobDesc: 'Bertanggung jawab atas pendapatan, penjualan, dan pengembangan bisnis', x: 2100, y: 220 },
  { name: 'Eka',   rank: 'CMO',                   jobDesc: 'Mengelola strategi pemasaran dan branding perusahaan', x: 2950, y: 220 },
  { name: 'Fajar', rank: 'Backend Developer',     jobDesc: 'Mengembangkan dan memelihara API, logic server, dan sistem backend', x: -100, y: 450 },
  { name: 'Gina',  rank: 'Frontend Developer',    jobDesc: 'Mengembangkan antarmuka pengguna dan pengalaman frontend aplikasi', x: 100, y: 450 },
  { name: 'Indra', rank: 'DevOps Engineer',        jobDesc: 'Mengelola infrastruktur, CI/CD, deployment, dan otomatisasi sistem', x: 300, y: 450 },
  { name: 'Julia', rank: 'Database Engineer',      jobDesc: 'Merancang, mengoptimalkan, dan memelihara database serta query', x: 500, y: 450 },
  { name: 'Kevin', rank: 'QA Engineer',            jobDesc: 'Melakukan pengujian kualitas, bug tracking, dan memastikan stabilitas produk', x: 700, y: 450 },
  { name: 'Lina',  rank: 'Security Engineer',      jobDesc: 'Menjaga keamanan sistem, melakukan audit keamanan, dan mitigasi celah', x: 900, y: 450 },
  { name: 'Mira',  rank: 'Product Designer',       jobDesc: 'Bikin desain UI fitur baru, wireframe, prototype. Tangan kanan CPO buat wujudin konsep ke visual.', x: 1050, y: 450 },
  { name: 'Nando', rank: 'UI/UX Researcher',       jobDesc: 'Riset perilaku user, usability testing, cari tau kenapa user pake/tinggalin produk.', x: 1250, y: 450 },
  { name: 'Olivia',rank: 'Data Analyst',           jobDesc: 'Tracking metrik produk (retention, conversion, engagement), bikin laporan insight buat CPO.', x: 1450, y: 450 },
  { name: 'Pras',  rank: 'Technical Writer',       jobDesc: 'Nulis dokumentasi API, panduan pengguna, release notes. Biar user gak bingung.', x: 1650, y: 450 },
  { name: 'Queen', rank: 'Customer Success Specialist', jobDesc: 'Onboarding user baru, bantu mereka sukses pake produk. Ujung tombak retensi.', x: 1800, y: 450 },
  { name: 'Rizky', rank: 'Sales Executive',        jobDesc: 'Cari prospek, presentasi produk, closing deals.', x: 2000, y: 450 },
  { name: 'Sinta', rank: 'Account Manager',        jobDesc: 'Ngurus client existing, jagain hubungan baik, upsell fitur tambahan.', x: 2200, y: 450 },
  { name: 'Tomi',  rank: 'Business Development',   jobDesc: 'Cari partnership strategis, ekspansi ke market baru.', x: 2400, y: 450 },
  { name: 'Umar',  rank: 'Content Writer',         jobDesc: 'Nulis blog, case study, whitepaper. Buat edukasi pasar dan branding.', x: 2650, y: 450 },
  { name: 'Vina',  rank: 'Growth Specialist',      jobDesc: 'Eksekusi campaign akuisisi, iklan, conversion optimization.', x: 2850, y: 450 },
  { name: 'Wawan', rank: 'SEO Specialist',         jobDesc: 'Optimasi website biar muncul di pencarian Google. Organic traffic.', x: 3050, y: 450 },
  { name: 'Xena',  rank: 'Social Media Specialist', jobDesc: 'Kelola social media, engage dengan audiens, brand awareness.', x: 3250, y: 450 },
];

const supervisorMap: Record<string, string> = {
  Budi: 'Alex', Citra: 'Alex', Doni: 'Alex', Eka: 'Alex',
  Fajar: 'Budi', Gina: 'Budi', Indra: 'Budi', Julia: 'Budi', Kevin: 'Budi', Lina: 'Budi',
  Mira: 'Citra', Nando: 'Citra', Olivia: 'Citra', Pras: 'Citra',
  Queen: 'Doni', Rizky: 'Doni', Sinta: 'Doni', Tomi: 'Doni',
  Umar: 'Eka', Vina: 'Eka', Wawan: 'Eka', Xena: 'Eka',
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
