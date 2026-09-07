// Seeds ONLY real, known data: the 37 states (36 + FCT), Akwa Ibom's two
// real WhatsApp community links, and the 6 real news items paraphrased
// from the project's Facebook page. Deliberately seeds NO students and NO
// admin accounts — those must be created for real (see README "First
// Super Admin"), since fabricating placeholder people was explicitly
// flagged as unacceptable for this project. Safe to re-run (upserts).
require('dotenv').config();
const pool = require('./pool');

const STATES = [
  ['Abia', 'AB'], ['Adamawa', 'AD'], ['Akwa Ibom', 'AK'], ['Anambra', 'AN'],
  ['Bauchi', 'BA'], ['Bayelsa', 'BY'], ['Benue', 'BE'], ['Borno', 'BO'],
  ['Cross River', 'CR'], ['Delta', 'DE'], ['Ebonyi', 'EB'], ['Edo', 'ED'],
  ['Ekiti', 'EK'], ['Enugu', 'EN'], ['FCT', 'FC'], ['Gombe', 'GO'],
  ['Imo', 'IM'], ['Jigawa', 'JI'], ['Kaduna', 'KD'], ['Kano', 'KN'],
  ['Katsina', 'KT'], ['Kebbi', 'KE'], ['Kogi', 'KG'], ['Kwara', 'KW'],
  ['Lagos', 'LA'], ['Nasarawa', 'NA'], ['Niger', 'NI'], ['Ogun', 'OG'],
  ['Ondo', 'ON'], ['Osun', 'OS'], ['Oyo', 'OY'], ['Plateau', 'PL'],
  ['Rivers', 'RI'], ['Sokoto', 'SO'], ['Taraba', 'TA'], ['Yobe', 'YO'],
  ['Zamfara', 'ZA']
];

const AKWA_IBOM_LINKS = [
  { label: 'Group 1', note: 'Nearly full', url: 'https://chat.whatsapp.com/DeJpOZc3rmSJ5OYVJeQI7B?s=cl&p=a&ilr=4', member_count: 1000 },
  { label: 'Group 2', note: 'Open', url: 'https://chat.whatsapp.com/FJQYDyWquoUIhMB5RSiAYK?s=cl&p=a&ilr=4', member_count: 900 }
];

// Paraphrased from facebook.com/share/19GyPzkY1h — not verbatim reposts.
const NEWS = [
  {
    title: 'In memory of Comrade Bala Mai Doya, Toro LGA Coordinator',
    slug: 'in-memory-of-comrade-bala-mai-doya',
    excerpt: 'The national leadership shared condolences on the passing of the Toro Local Government Coordinator in Bauchi State.',
    body: "Renewed Hope Project 2027's national leadership, led by Director-General Hon. Dauda Salihu, shared condolences with Bauchi State following the passing of Comrade Bala Mai Doya, the Toro Local Government Coordinator. The message described him as a dedicated grassroots mobilizer whose contribution to building the project's structure in Bauchi State will be remembered.",
    category: 'community',
    published_at: '2026-08-29'
  },
  {
    title: 'National Student Coordinator recognized for mobilization work',
    slug: 'national-student-coordinator-recognized',
    excerpt: 'Hon. Comr. Gloria Yakubu Suleiman was commended for her student mobilization efforts across the country.',
    body: "The project's leadership publicly commended Hon. Comr. Gloria Yakubu Suleiman, National Student Coordinator, for her grassroots student mobilization work. The announcement referenced a national registration milestone reported on the project's student portal across all 36 states and the FCT — a figure reported by the organization on its own channels, separate from this state-community platform's own registration numbers.",
    category: 'community',
    published_at: '2026-08-25'
  },
  {
    title: 'Irobo Youth leadership pays courtesy visit to the DG',
    slug: 'irobo-youth-courtesy-visit',
    excerpt: "The FCT chapter of Irobo Youth met with Renewed Hope Project's Director-General to discuss youth mobilization.",
    body: 'A delegation led by the Irobo Youth President (FCT Chapter) visited the Renewed Hope Project\'s national secretariat in Garki, Abuja, meeting with Director-General Hon. Dauda Salihu. The discussion centered on youth engagement, grassroots mobilization, and opportunities for continued collaboration between the two groups.',
    category: 'policy',
    published_at: '2026-08-24'
  },
  {
    title: 'Gida zuwa Gida: a house-to-house mobilization push',
    slug: 'gida-zuwa-gida-mobilization-push',
    excerpt: "The DG outlined a grassroots strategy taking the project's message directly to households across the country.",
    body: 'Director-General Hon. Dauda Salihu outlined a house-to-house ("Gida zuwa Gida") grassroots mobilization strategy, aiming to engage families and communities directly rather than through conventional political gatherings. Coordinators are expected to carry the approach from ward to ward ahead of 2027.',
    category: 'policy',
    published_at: '2026-08-23'
  },
  {
    title: 'FCT chapter thanks leaders and stakeholders for their support',
    slug: 'fct-chapter-thanks-leaders',
    excerpt: 'The FCT Chapter recognized coordinators and stakeholders for their contributions to the project.',
    body: 'The FCT Chapter, led by Coordinator Engr. Shittu Usman Chidawa, publicly thanked several state leaders and stakeholders for their support, and reaffirmed its commitment to grassroots mobilization across the Federal Capital Territory.',
    category: 'community',
    published_at: '2026-08-19'
  },
  {
    title: 'National secretariat unveiled',
    slug: 'national-secretariat-unveiled',
    excerpt: "The project's national secretariat was officially opened shortly after inauguration.",
    body: "Renewed Hope Project 2027 unveiled its national secretariat, marking a formal base for the organization's national coordination activities.",
    category: 'community',
    published_at: '2026-08-12'
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Seeding states...');
    for (const [name, code] of STATES) {
      const status = name === 'Akwa Ibom' ? 'active' : 'pending';
      await client.query(
        `INSERT INTO states (name, code, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET status = EXCLUDED.status`,
        [name, code, status]
      );
    }

    console.log('Seeding Akwa Ibom community links...');
    const { rows } = await client.query(`SELECT id FROM states WHERE name = 'Akwa Ibom'`);
    const akwaIbomId = rows[0].id;
    for (const link of AKWA_IBOM_LINKS) {
      await client.query(
        `INSERT INTO state_community_links (state_id, label, note, url, member_count)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [akwaIbomId, link.label, link.note, link.url, link.member_count]
      );
    }

    console.log('Seeding news...');
    for (const item of NEWS) {
      await client.query(
        `INSERT INTO news (title, slug, excerpt, body, category, status, published_at)
         VALUES ($1, $2, $3, $4, $5, 'published', $6)
         ON CONFLICT (slug) DO NOTHING`,
        [item.title, item.slug, item.excerpt, item.body, item.category, item.published_at]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete: 37 states, 2 Akwa Ibom community links, 6 news items.');
    console.log('No students or admin accounts were seeded — see README "First Super Admin".');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
