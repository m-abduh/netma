import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const employees = [
  { name: 'Alex',   rank: 'CEO',                   jobDesc: 'Mengawasi dan mengelola seluruh AI Karyawan, menentukan arah strategis perusahaan' },
  { name: 'Budi',   rank: 'CTO',                   jobDesc: 'Bertanggung jawab atas seluruh aspek teknis dan pengembangan produk teknologi' },
  { name: 'Citra',  rank: 'CPO',                   jobDesc: 'Mengelola pengembangan produk dan memastikan produk sesuai kebutuhan pengguna' },
  { name: 'Doni',   rank: 'CRO',                   jobDesc: 'Bertanggung jawab atas pendapatan, penjualan, dan pengembangan bisnis' },
  { name: 'Eka',    rank: 'CMO',                   jobDesc: 'Mengelola strategi pemasaran dan branding perusahaan' },
  { name: 'Fajar',  rank: 'Backend Developer',     jobDesc: 'Mengembangkan dan memelihara API, logic server, dan sistem backend' },
  { name: 'Gina',   rank: 'Frontend Developer',    jobDesc: 'Mengembangkan antarmuka pengguna dan pengalaman frontend aplikasi' },
  { name: 'Indra',  rank: 'DevOps Engineer',        jobDesc: 'Mengelola infrastruktur, CI/CD, deployment, dan otomatisasi sistem' },
  { name: 'Julia',  rank: 'Database Engineer',      jobDesc: 'Merancang, mengoptimalkan, dan memelihara database serta query' },
  { name: 'Kevin',  rank: 'QA Engineer',            jobDesc: 'Melakukan pengujian kualitas, bug tracking, dan memastikan stabilitas produk' },
  { name: 'Lina',   rank: 'Security Engineer',      jobDesc: 'Menjaga keamanan sistem, melakukan audit keamanan, dan mitigasi celah' },
  { name: 'Mira',   rank: 'Product Designer',       jobDesc: 'Merancang tampilan produk dan pengalaman pengguna yang intuitif' },
  { name: 'Nando',  rank: 'UI/UX Designer',         jobDesc: 'Mendesain antarmuka pengguna yang menarik dan mudah digunakan' },
  { name: 'Olivia', rank: 'Data Analyst',           jobDesc: 'Menganalisis data, menyusun laporan, dan memberikan insight berbasis data' },
  { name: 'Pras',   rank: 'Sales Engineer',         jobDesc: 'Menjembatani tim teknis dan klien dalam proses penjualan produk' },
  { name: 'Queen',  rank: 'Account Executive',      jobDesc: 'Mengelola hubungan dengan klien dan menutup deals penjualan' },
  { name: 'Rizky',  rank: 'Business Development',   jobDesc: 'Mengidentifikasi peluang bisnis baru dan kemitraan strategis' },
  { name: 'Sinta',  rank: 'Content Strategist',     jobDesc: 'Menyusun strategi konten dan memproduksi materi pemasaran' },
  { name: 'Tomi',   rank: 'Social Media Specialist', jobDesc: 'Mengelola akun media sosial dan engagement dengan audiens' },
  { name: 'Umar',   rank: 'SEO Specialist',         jobDesc: 'Mengoptimalkan peringkat website di mesin pencari dan strategi SEO' },
];

const supervisorMap: Record<string, string> = {
  Budi: 'Alex', Citra: 'Alex', Doni: 'Alex', Eka: 'Alex',
  Fajar: 'Budi', Gina: 'Budi', Indra: 'Budi', Julia: 'Budi', Kevin: 'Budi', Lina: 'Budi',
  Mira: 'Citra', Nando: 'Citra', Olivia: 'Citra',
  Pras: 'Doni', Queen: 'Doni', Rizky: 'Doni',
  Sinta: 'Eka', Tomi: 'Eka', Umar: 'Eka',
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
