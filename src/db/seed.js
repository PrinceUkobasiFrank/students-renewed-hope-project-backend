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

// A starting list of well-known public tertiary institutions per state
// (federal/state universities, one leading polytechnic where known) —
// intentionally kept to institutions we're confident are named correctly,
// not an exhaustive list of every college in the country. Students at an
// institution not listed here use the "Other — type it in" option on the
// registration form (institution_name_freetext), so nobody's blocked by a
// gap in this list. Add more any time by inserting into `institutions`
// directly, or re-running this seed after extending the list below.
const INSTITUTIONS = {
  'Abia': [['Michael Okpara University of Agriculture, Umudike', 'university'], ['Abia State University, Uturu', 'university'], ['Abia State Polytechnic, Aba', 'polytechnic']],
  'Adamawa': [['Modibbo Adama University, Yola', 'university'], ['Adamawa State University, Mubi', 'university'], ['Federal Polytechnic, Mubi', 'polytechnic']],
  'Akwa Ibom': [['University of Uyo', 'university'], ['Akwa Ibom State University', 'university'], ['Akwa Ibom State Polytechnic, Ikot Osurua', 'polytechnic']],
  'Anambra': [['Nnamdi Azikiwe University, Awka', 'university'], ['Chukwuemeka Odumegwu Ojukwu University', 'university'], ['Federal Polytechnic, Oko', 'polytechnic']],
  'Bauchi': [['Abubakar Tafawa Balewa University, Bauchi', 'university'], ['Bauchi State University, Gadau', 'university'], ['Federal Polytechnic, Bauchi', 'polytechnic']],
  'Bayelsa': [['Niger Delta University', 'university'], ['Federal Polytechnic, Ekowe', 'polytechnic']],
  'Benue': [['Joseph Sarwuan Tarka University, Makurdi', 'university'], ['Benue State University, Makurdi', 'university']],
  'Borno': [['University of Maiduguri', 'university'], ['Ramat Polytechnic, Maiduguri', 'polytechnic']],
  'Cross River': [['University of Calabar', 'university'], ['Cross River University of Technology', 'university']],
  'Delta': [['Delta State University, Abraka', 'university'], ['Federal University of Petroleum Resources, Effurun', 'university'], ['Delta State Polytechnic, Ozoro', 'polytechnic']],
  'Ebonyi': [['Ebonyi State University', 'university'], ['Federal University Ndufu-Alike Ikwo', 'university'], ['Akanu Ibiam Federal Polytechnic, Unwana', 'polytechnic']],
  'Edo': [['University of Benin', 'university'], ['Ambrose Alli University, Ekpoma', 'university'], ['Auchi Polytechnic', 'polytechnic']],
  'Ekiti': [['Ekiti State University', 'university'], ['Federal University, Oye-Ekiti', 'university'], ['Federal Polytechnic, Ado-Ekiti', 'polytechnic']],
  'Enugu': [['University of Nigeria, Nsukka', 'university'], ['Enugu State University of Science and Technology', 'university'], ['Institute of Management and Technology, Enugu', 'polytechnic']],
  'FCT': [['University of Abuja', 'university'], ['Nile University of Nigeria', 'university'], ['Baze University', 'university']],
  'Gombe': [['Gombe State University', 'university'], ['Gombe State Polytechnic, Bajoga', 'polytechnic']],
  'Imo': [['Federal University of Technology, Owerri', 'university'], ['Imo State University, Owerri', 'university'], ['Federal Polytechnic, Nekede', 'polytechnic'], ['Alvan Ikoku Federal College of Education, Owerri', 'college']],
  'Jigawa': [['Sule Lamido University, Kafin Hausa', 'university'], ['Hussaini Adamu Federal Polytechnic, Kazaure', 'polytechnic']],
  'Kaduna': [['Ahmadu Bello University, Zaria', 'university'], ['Kaduna State University', 'university'], ['Kaduna Polytechnic', 'polytechnic']],
  'Kano': [['Bayero University, Kano', 'university'], ['Kano University of Science and Technology, Wudil', 'university'], ['Kano State Polytechnic', 'polytechnic']],
  'Katsina': [["Umaru Musa Yar'adua University, Katsina", 'university'], ['Federal University, Dutsin-Ma', 'university'], ['Hassan Usman Katsina Polytechnic', 'polytechnic']],
  'Kebbi': [['Federal University, Birnin Kebbi', 'university'], ['Kebbi State University of Science and Technology, Aliero', 'university'], ['Waziri Umaru Federal Polytechnic, Birnin Kebbi', 'polytechnic']],
  'Kogi': [['Prince Abubakar Audu University, Anyigba', 'university'], ['Federal University, Lokoja', 'university'], ['Federal Polytechnic, Idah', 'polytechnic']],
  'Kwara': [['University of Ilorin', 'university'], ['Kwara State University, Malete', 'university'], ['Kwara State Polytechnic, Ilorin', 'polytechnic']],
  'Lagos': [['University of Lagos', 'university'], ['Lagos State University', 'university'], ['Yaba College of Technology', 'polytechnic'], ['Lagos State Polytechnic, Ikorodu', 'polytechnic']],
  'Nasarawa': [['Nasarawa State University, Keffi', 'university'], ['Federal University, Lafia', 'university'], ['Nasarawa State Polytechnic, Lafia', 'polytechnic']],
  'Niger': [['Federal University of Technology, Minna', 'university'], ['Ibrahim Badamasi Babangida University, Lapai', 'university']],
  'Ogun': [['Federal University of Agriculture, Abeokuta', 'university'], ['Olabisi Onabanjo University, Ago-Iwoye', 'university'], ['Moshood Abiola Polytechnic, Abeokuta', 'polytechnic'], ['Tai Solarin University of Education, Ijagun', 'college']],
  'Ondo': [['Federal University of Technology, Akure', 'university'], ['Adekunle Ajasin University, Akungba-Akoko', 'university'], ['Rufus Giwa Polytechnic, Owo', 'polytechnic']],
  'Osun': [['Obafemi Awolowo University, Ile-Ife', 'university'], ['Osun State University, Osogbo', 'university'], ['Federal Polytechnic, Ede', 'polytechnic']],
  'Oyo': [['University of Ibadan', 'university'], ['Ladoke Akintola University of Technology, Ogbomoso', 'university'], ['The Polytechnic, Ibadan', 'polytechnic']],
  'Plateau': [['University of Jos', 'university'], ['Plateau State University, Bokkos', 'university'], ['Plateau State Polytechnic, Barkin Ladi', 'polytechnic']],
  'Rivers': [['University of Port Harcourt', 'university'], ['Rivers State University', 'university'], ['Federal College of Education (Technical), Omoku', 'college']],
  'Sokoto': [['Usmanu Danfodiyo University, Sokoto', 'university'], ['Sokoto State University', 'university'], ['Shehu Shagari College of Education, Sokoto', 'college']],
  'Taraba': [['Taraba State University, Jalingo', 'university'], ['Federal University, Wukari', 'university']],
  'Yobe': [['Yobe State University, Damaturu', 'university'], ['Federal University, Gashua', 'university'], ['Mai Idris Alooma Polytechnic, Geidam', 'polytechnic']],
  'Zamfara': [['Federal University, Gusau', 'university'], ['Zamfara State University, Talata Mafara', 'university']]
};

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

    console.log('Seeding institutions...');
    const statesLookup = await client.query('SELECT id, name FROM states');
    const stateIdByName = {};
    statesLookup.rows.forEach((s) => { stateIdByName[s.name] = s.id; });
    let institutionCount = 0;
    for (const [stateName, institutions] of Object.entries(INSTITUTIONS)) {
      const stateId = stateIdByName[stateName];
      if (!stateId) continue;
      for (const [name, type] of institutions) {
        await client.query(
          `INSERT INTO institutions (name, state_id, type)
           VALUES ($1, $2, $3)
           ON CONFLICT (name, state_id) DO NOTHING`,
          [name, stateId, type]
        );
        institutionCount++;
      }
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
    console.log(`Seed complete: 37 states, ${institutionCount} institutions, 2 Akwa Ibom community links, 6 news items.`);
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
