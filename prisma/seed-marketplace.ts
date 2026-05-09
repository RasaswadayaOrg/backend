/**
 * Rasaswadaya Marketplace Seed
 * Seeds 8 store owners, 8 stores, and ~110 products across categories.
 * Covers Sri Lankan eastern instruments, western instruments, modern sound
 * equipment, traditional items, and rental listings.
 *
 * Run: npx ts-node prisma/seed-marketplace.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// DB connection
// ---------------------------------------------------------------------------
function buildConnectionString() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL is required');
  const url = new URL(rawUrl);
  url.searchParams.set('sslmode', 'no-verify');
  return url.toString();
}

const pool = new Pool({ connectionString: buildConnectionString() });

function uid(): string {
  // cuid2-compatible length (24 chars), no hyphens
  return randomUUID().replace(/-/g, '').substring(0, 24);
}

const NOW = new Date().toISOString();
const SEED_PASSWORD = 'Rasas@1234'; // all seed store owners share this password

// ---------------------------------------------------------------------------
// Image URLs (Unsplash – free to use)
// ---------------------------------------------------------------------------
const IMG = {
  keyboard:   'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&q=80',
  digitalPiano:'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
  casioKeyboard:'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=600&q=80',
  melodica:   'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=600&q=80',
  harmonica:  'https://images.unsplash.com/photo-1514119412509-0dd3db452571?w=600&q=80',
  ukulele:    'https://images.unsplash.com/photo-1558618047-f4e90c9e5d82?w=600&q=80',
  guitar:     'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&q=80',
  electricGuitar:'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=600&q=80',
  acousticGuitar:'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
  bass:       'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=600&q=80',
  violin:     'https://images.unsplash.com/photo-1612225330812-01a90c640a50?w=600&q=80',
  cello:      'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=600&q=80',
  sitar:      'https://images.unsplash.com/photo-1598086618792-a5d6cb0b1a64?w=600&q=80',
  veena:      'https://images.unsplash.com/photo-1598086618792-a5d6cb0b1a64?w=600&q=80',
  drums:      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  electronicDrums:'https://images.unsplash.com/photo-1595069906974-f8ae7ffc3e5a?w=600&q=80',
  cymbal:     'https://images.unsplash.com/photo-1588543385566-ec13aaabd9c5?w=600&q=80',
  tabla:      'https://images.unsplash.com/photo-1598086618792-a5d6cb0b1a64?w=600&q=80',
  harmonium:  'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&q=80',
  flute:      'https://images.unsplash.com/photo-1514119412509-0dd3db452571?w=600&q=80',
  trumpet:    'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=600&q=80',
  saxophone:  'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&q=80',
  mixer:      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80',
  speaker:    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80',
  microphone: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80',
  audioInterface:'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80',
  dj:         'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
  lighting:   'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=80',
  cable:      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80',
  studioMonitor:'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80',
  synth:      'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&q=80',
  drumsticks: 'https://images.unsplash.com/photo-1588543385566-ec13aaabd9c5?w=600&q=80',
  guitarPedal:'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=600&q=80',
  guitarAmp:  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=600&q=80',
  accessories:'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80',
  traditional:'https://images.unsplash.com/photo-1598086618792-a5d6cb0b1a64?w=600&q=80',
};

// ---------------------------------------------------------------------------
// Store owner definitions
// ---------------------------------------------------------------------------
interface StoreSeed {
  email: string;
  fullName: string;
  city: string;
  store: {
    name: string;
    description: string;
    location: string;
    phone: string;
    rating: number;
    reviewCount: number;
  };
}

const STORES: StoreSeed[] = [
  {
    email: 'aruna.bandara@colombomusichus.lk',
    fullName: 'Aruna Bandara',
    city: 'Colombo',
    store: {
      name: 'Colombo Music Hub',
      description: 'Your one-stop destination for keyboards, pianos and general musical instruments in the heart of Colombo. Authorized dealer for Yamaha, Casio and Roland.',
      location: 'Borella, Colombo 8',
      phone: '+94 11 234 5678',
      rating: 4.7,
      reviewCount: 38,
    },
  },
  {
    email: 'priya@lankasoundpro.lk',
    fullName: 'Priya Rajapaksa',
    city: 'Colombo',
    store: {
      name: 'Lanka Sound Pro',
      description: 'Professional audio equipment sales and rentals for studios, venues and live events. Stocking Behringer, Yamaha, QSC and Focusrite.',
      location: 'Maradana, Colombo 10',
      phone: '+94 11 276 8890',
      rating: 4.8,
      reviewCount: 62,
    },
  },
  {
    email: 'saman@kandybeats.lk',
    fullName: 'Saman Wickramasinghe',
    city: 'Kandy',
    store: {
      name: 'Kandy Beats',
      description: 'Specialist in traditional Sri Lankan percussion — Gata Bera, Yak Bera, Rabana — alongside modern western drum kits. Based in the cultural capital of Sri Lanka.',
      location: 'Kandy Town Centre',
      phone: '+94 81 223 4567',
      rating: 4.9,
      reviewCount: 54,
    },
  },
  {
    email: 'kavitha@jaffnastrings.lk',
    fullName: 'Kavitha Navaratnam',
    city: 'Jaffna',
    store: {
      name: 'Jaffna Strings',
      description: 'Celebrating Sri Lankan Tamil classical music. Specialists in Veena, Sitar, Tampura, Mridangam and fine orchestral string instruments.',
      location: 'Jaffna Fort Area, Jaffna',
      phone: '+94 21 222 5678',
      rating: 4.9,
      reviewCount: 41,
    },
  },
  {
    email: 'nuwan@soundrentallk.lk',
    fullName: 'Nuwan Perera',
    city: 'Colombo',
    store: {
      name: 'Sound Rental LK',
      description: 'Sri Lanka\'s premier equipment rental service for concerts, weddings, corporate events and festivals. Line arrays, digital consoles, stage lighting, DJ rigs and more.',
      location: 'Dehiwala, Colombo',
      phone: '+94 11 271 3456',
      rating: 4.6,
      reviewCount: 95,
    },
  },
  {
    email: 'chaminda@galleguitarhouse.lk',
    fullName: 'Chaminda Herath',
    city: 'Galle',
    store: {
      name: 'Galle Guitar House',
      description: 'The south\'s finest guitar showroom. Gibson, Fender, Taylor, Martin and Cort — acoustics, electrics and basses. Also stocking amplifiers and effects pedals.',
      location: 'Galle Fort Road, Galle',
      phone: '+94 91 223 4567',
      rating: 4.8,
      reviewCount: 29,
    },
  },
  {
    email: 'ranjith@easternmusicstudio.lk',
    fullName: 'Ranjith Dissanayake',
    city: 'Batticaloa',
    store: {
      name: 'Eastern Music Studio',
      description: 'Eastern Sri Lanka\'s hub for traditional instruments — Thavil, Tabla, Harmonium, Dolak, Nadaswaram, Pungi and bamboo flutes. Also offering wind instrument rentals.',
      location: 'Bar Road, Batticaloa',
      phone: '+94 65 222 6789',
      rating: 4.7,
      reviewCount: 23,
    },
  },
  {
    email: 'maleesha@proaudiosystems.lk',
    fullName: 'Maleesha Fernando',
    city: 'Colombo',
    store: {
      name: 'Pro Audio Systems',
      description: 'Cutting-edge studio and DJ equipment. Universal Audio, Native Instruments, Pioneer DJ, Rode, Shure SM7B, SSL and Adam Audio. Sales and rental for professional producers and DJs.',
      location: 'Kollupitiya, Colombo 3',
      phone: '+94 11 258 9012',
      rating: 4.9,
      reviewCount: 77,
    },
  },
];

// ---------------------------------------------------------------------------
// Product definitions (grouped by store index 0-7)
// ---------------------------------------------------------------------------
interface ProductSeed {
  name: string;
  description: string;
  imageUrl: string;
  images: string[];
  category: string;
  listingType: 'sale' | 'rent';
  stock: number;
  price: number; // LKR (for rent = per-day/event rate)
}

type StoreProducts = { storeIndex: number; products: ProductSeed[] };

const PRODUCTS: StoreProducts[] = [
  // -------------------------------------------------------------------------
  // Store 0 – Colombo Music Hub  (Instruments / Accessories)
  // -------------------------------------------------------------------------
  {
    storeIndex: 0,
    products: [
      {
        name: 'Yamaha P-125B Digital Piano',
        description: 'Slim 88-key weighted action digital piano with Pure CF Sound Engine. Ideal for students and intermediate players. Includes sustain pedal and power adapter.',
        imageUrl: IMG.digitalPiano, images: [IMG.digitalPiano, IMG.keyboard],
        category: 'Instruments', listingType: 'sale', stock: 3, price: 165000,
      },
      {
        name: 'Casio CT-X700 61-Key Keyboard',
        description: '61-key touch-responsive keyboard with 600 tones, 200 rhythms, AiX Sound Source and built-in speaker. Perfect for beginners and hobbyists.',
        imageUrl: IMG.casioKeyboard, images: [IMG.casioKeyboard, IMG.keyboard],
        category: 'Instruments', listingType: 'sale', stock: 5, price: 32500,
      },
      {
        name: 'Casio WK-6600 76-Key Workstation',
        description: '76-key touch-sensitive workstation with 800 tones, built-in sequencer and mixer. Step-up keyboard for the serious learner.',
        imageUrl: IMG.casioKeyboard, images: [IMG.casioKeyboard],
        category: 'Instruments', listingType: 'sale', stock: 2, price: 65000,
      },
      {
        name: 'Roland FP-30X Digital Piano',
        description: 'Portable 88-key digital piano featuring SuperNATURAL Piano Modelling, PHA-4 Standard keyboard action and Bluetooth connectivity.',
        imageUrl: IMG.digitalPiano, images: [IMG.digitalPiano],
        category: 'Instruments', listingType: 'sale', stock: 2, price: 195000,
      },
      {
        name: 'Hohner Melodica Piano 36',
        description: '36-key melodica by Hohner. High-quality German reed instrument suitable for folk, jazz and educational settings.',
        imageUrl: IMG.melodica, images: [IMG.melodica],
        category: 'Wind', listingType: 'sale', stock: 8, price: 9500,
      },
      {
        name: 'Hohner Blues Band Harmonica Set',
        description: 'Set of 5 diatonic harmonicas in keys C, D, E, G and A. Plastic comb, brass reed plates. Perfect starter collection.',
        imageUrl: IMG.harmonica, images: [IMG.harmonica],
        category: 'Wind', listingType: 'sale', stock: 12, price: 4500,
      },
      {
        name: 'Soprano Ukulele (Locally Crafted)',
        description: 'Handcrafted soprano ukulele by a Sri Lankan luthier. Mahogany body, aquila strings, includes gig bag.',
        imageUrl: IMG.ukulele, images: [IMG.ukulele],
        category: 'Strings', listingType: 'sale', stock: 10, price: 7500,
      },
      {
        name: 'Kala KA-C Concert Ukulele',
        description: 'Kala concert ukulele with mahogany body, satin finish, Aquila Nylgut strings. Bright and balanced tone.',
        imageUrl: IMG.ukulele, images: [IMG.ukulele],
        category: 'Strings', listingType: 'sale', stock: 6, price: 15000,
      },
      {
        name: 'Keyboard Sustain Pedal (Universal)',
        description: 'Universal polarity sustain pedal compatible with all Yamaha, Casio, Roland and Korg keyboards.',
        imageUrl: IMG.accessories, images: [IMG.accessories],
        category: 'Accessories', listingType: 'sale', stock: 20, price: 2500,
      },
      {
        name: 'Adjustable Piano Bench',
        description: 'Height-adjustable padded piano bench. Steel frame, faux leather seat cushion. Supports up to 150 kg.',
        imageUrl: IMG.accessories, images: [IMG.accessories],
        category: 'Accessories', listingType: 'sale', stock: 8, price: 8500,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Store 1 – Lanka Sound Pro  (Equipment + Accessories)
  // -------------------------------------------------------------------------
  {
    storeIndex: 1,
    products: [
      {
        name: 'Behringer X Air XR18 Digital Mixer',
        description: '18-channel digital mixer with 12 Midas-designed preamps, 6 aux sends, built-in Wi-Fi and USB recording. Full wireless control via tablet.',
        imageUrl: IMG.mixer, images: [IMG.mixer],
        category: 'Equipment', listingType: 'sale', stock: 2, price: 195000,
      },
      {
        name: 'Yamaha DBR15 Powered Speaker',
        description: '1000W Class-D bi-amp powered loudspeaker. 15-inch woofer, 1-inch compression driver. Ideal for small to mid-sized live events.',
        imageUrl: IMG.speaker, images: [IMG.speaker],
        category: 'Equipment', listingType: 'sale', stock: 4, price: 98000,
      },
      {
        name: 'Focusrite Scarlett 2i2 (4th Gen)',
        description: 'USB-C audio interface with 2 Focusrite preamps, 48V phantom power, Air mode and direct monitoring. The world\'s best-selling audio interface.',
        imageUrl: IMG.audioInterface, images: [IMG.audioInterface],
        category: 'Equipment', listingType: 'sale', stock: 8, price: 24500,
      },
      {
        name: 'Focusrite Scarlett 4i4 (4th Gen)',
        description: '4-in/4-out USB-C audio interface with 2 combo XLR inputs, instrument inputs, 48V phantom power and MIDI I/O.',
        imageUrl: IMG.audioInterface, images: [IMG.audioInterface],
        category: 'Equipment', listingType: 'sale', stock: 5, price: 42000,
      },
      {
        name: 'Yamaha MG10XU 10-Channel Mixer',
        description: '10-channel compact mixing console with 2 onyx preamps, compressors, 1-knob EQ and USB I/O for recording.',
        imageUrl: IMG.mixer, images: [IMG.mixer],
        category: 'Equipment', listingType: 'sale', stock: 6, price: 35000,
      },
      {
        name: 'QSC K12.2 Active Speaker',
        description: '2000W active loudspeaker with 12" woofer, DSP-powered Class-D amplifier and intuitive 3-channel mixer. Industry standard for live sound.',
        imageUrl: IMG.speaker, images: [IMG.speaker],
        category: 'Equipment', listingType: 'sale', stock: 3, price: 148000,
      },
      {
        name: 'Behringer UMC202HD USB Interface',
        description: 'Budget-friendly 2-channel USB audio interface with 2 Midas-designed preamps, 48V phantom power and MIDI connectivity.',
        imageUrl: IMG.audioInterface, images: [IMG.audioInterface],
        category: 'Equipment', listingType: 'sale', stock: 10, price: 15500,
      },
      {
        name: '5000W PA System Package (For Rent)',
        description: 'Complete PA system for events up to 500 guests: 2× QSC K12.2 mains + 2× QSC KSub subwoofers + Behringer X18 mixer + stands + cables. Price is per event.',
        imageUrl: IMG.speaker, images: [IMG.speaker, IMG.mixer],
        category: 'Equipment', listingType: 'rent', stock: 2, price: 12000,
      },
      {
        name: '32-Channel Digital Console + Stage Box (For Rent)',
        description: 'Yamaha CL1 32-channel digital console + Rio3224-D2 stage box + full multicore snake. Professional-grade live sound solution. Price is per day.',
        imageUrl: IMG.mixer, images: [IMG.mixer],
        category: 'Equipment', listingType: 'rent', stock: 1, price: 8500,
      },
      {
        name: 'QSC K10.2 Monitor Speaker Pair (For Rent)',
        description: 'Pair of QSC K10.2 active monitors on adjustable stands. Ideal for stage monitoring or front-fill. Price is per day.',
        imageUrl: IMG.speaker, images: [IMG.speaker],
        category: 'Equipment', listingType: 'rent', stock: 3, price: 3500,
      },
      {
        name: 'XLR Cable Bundle – 10 Pack (5m)',
        description: '10 × 5m balanced XLR cables. Neutrik connectors, oxygen-free copper. The essential studio/live cable pack.',
        imageUrl: IMG.cable, images: [IMG.cable],
        category: 'Accessories', listingType: 'sale', stock: 25, price: 5500,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Store 2 – Kandy Beats  (Percussion + Traditional)
  // -------------------------------------------------------------------------
  {
    storeIndex: 2,
    products: [
      {
        name: 'Gata Bera – Kandyan Ceremonial Drum',
        description: 'Handcrafted Gata Bera by a Kandy artisan. Jak wood body, goat skin heads, hand-stitched lacing. Used in Kandyan dance and the Esala Perahera.',
        imageUrl: IMG.traditional, images: [IMG.traditional],
        category: 'Traditional', listingType: 'sale', stock: 3, price: 22000,
      },
      {
        name: 'Yak Bera – Ceremonial Drum Pair',
        description: 'Traditional Yak Bera pair for ritual dance and devil dance ceremonies. Jak wood, goat skin, authentic hand-painting.',
        imageUrl: IMG.traditional, images: [IMG.traditional],
        category: 'Traditional', listingType: 'sale', stock: 2, price: 28000,
      },
      {
        name: 'Thammattama – Ceremonial Double Drum',
        description: 'Traditional Thammattama (two-faced drum) used in Buddhist temple ceremonies. Jak wood frame, tuned animal skin heads.',
        imageUrl: IMG.traditional, images: [IMG.traditional],
        category: 'Traditional', listingType: 'sale', stock: 3, price: 18000,
      },
      {
        name: 'Udarata Rabana (Flat Hand Drum)',
        description: 'Low, wide Kandyan rabana for group drumming. 18-inch diameter, goat skin head. Ideal for festive and ceremonial use.',
        imageUrl: IMG.traditional, images: [IMG.traditional],
        category: 'Traditional', listingType: 'sale', stock: 8, price: 5500,
      },
      {
        name: 'Davula – Double-Headed Cylindrical Drum',
        description: 'Traditional Davula used in southern Sri Lankan ritual music. Jak wood, two goat-skin heads, rope tuning.',
        imageUrl: IMG.traditional, images: [IMG.traditional],
        category: 'Traditional', listingType: 'sale', stock: 4, price: 12500,
      },
      {
        name: 'Bummadiya – Clay Pot Drum',
        description: 'Earthenware clay pot drum used in folk music. Waterproof membrane, tunable. A unique Sri Lankan folk percussion instrument.',
        imageUrl: IMG.traditional, images: [IMG.traditional],
        category: 'Traditional', listingType: 'sale', stock: 6, price: 6500,
      },
      {
        name: 'Pearl Export EXX 5-Piece Drum Kit',
        description: '5-piece acoustic drum set by Pearl. 22" bass drum, 10", 12", 16" toms, 14" snare. Hardware pack included. Available in jet black finish.',
        imageUrl: IMG.drums, images: [IMG.drums],
        category: 'Percussion', listingType: 'sale', stock: 2, price: 145000,
      },
      {
        name: 'Roland TD-07KVX Electronic Drum Kit',
        description: 'Mesh-head electronic drum kit with Roland TD-07 module, 5 mesh pads, hi-hat and 3 cymbals. Silent practice with built-in coaching.',
        imageUrl: IMG.electronicDrums, images: [IMG.electronicDrums],
        category: 'Percussion', listingType: 'sale', stock: 1, price: 195000,
      },
      {
        name: 'Zildjian A Custom 4-Piece Cymbal Set',
        description: '14" hi-hats, 16" crash, 18" crash and 20" ride. Brilliant finish. Bright, cutting tone favoured by rock and fusion drummers.',
        imageUrl: IMG.cymbal, images: [IMG.cymbal],
        category: 'Percussion', listingType: 'sale', stock: 2, price: 58000,
      },
      {
        name: 'Vic Firth American Classic 5A Drumsticks',
        description: 'Hickory 5A drumsticks by Vic Firth. Nylon tip. Industry standard for beginners and professionals alike. Sold per pair.',
        imageUrl: IMG.drumsticks, images: [IMG.drumsticks],
        category: 'Accessories', listingType: 'sale', stock: 30, price: 2200,
      },
      {
        name: 'Traditional Perahera Drum Set (For Rent)',
        description: 'Complete set of Gata Bera, Thammattama and Davula for perahera or cultural events. Includes professional drummer coordination if required. Price is per event.',
        imageUrl: IMG.traditional, images: [IMG.traditional],
        category: 'Traditional', listingType: 'rent', stock: 2, price: 8500,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Store 3 – Jaffna Strings  (Strings + Traditional Tamil Classical)
  // -------------------------------------------------------------------------
  {
    storeIndex: 3,
    products: [
      {
        name: 'Saraswati Veena – Professional Grade',
        description: 'Handcrafted South Indian Saraswati Veena in jack wood. 24 frets, resonator gourd, brass frets, meena kuchi. Tuned to concert pitch. Comes with padded cover.',
        imageUrl: IMG.veena, images: [IMG.veena],
        category: 'Traditional', listingType: 'sale', stock: 2, price: 55000,
      },
      {
        name: 'Sitar – Ravi Shankar Style (Kolkata Made)',
        description: 'Full-size professional sitar with gourd main resonator, gourd second resonator, 7 main strings and 11-13 sympathetic strings. Kolkata craftsmanship.',
        imageUrl: IMG.sitar, images: [IMG.sitar],
        category: 'Traditional', listingType: 'sale', stock: 2, price: 72000,
      },
      {
        name: 'Tampura / Thamburu (4-String Drone)',
        description: 'Classical South Indian tampura for raga practice and concert accompaniment. Gourd resonator, 4 steel strings. Tunes to SA-PA-SA drone.',
        imageUrl: IMG.sitar, images: [IMG.sitar],
        category: 'Traditional', listingType: 'sale', stock: 3, price: 38000,
      },
      {
        name: 'Mridangam – Grade A Skin',
        description: 'Professional mridangam (South Indian barrel drum) with grade-A buffalo skin heads. Used in Carnatic music and Tamil classical performances.',
        imageUrl: IMG.tabla, images: [IMG.tabla],
        category: 'Percussion', listingType: 'sale', stock: 3, price: 32000,
      },
      {
        name: 'Kanjira – Frame Drum with Jingles',
        description: 'Kanjira (south Indian frame drum) with monitor lizard skin head and brass jingles. Used in Carnatic percussion ensembles.',
        imageUrl: IMG.traditional, images: [IMG.traditional],
        category: 'Percussion', listingType: 'sale', stock: 6, price: 12500,
      },
      {
        name: 'Yamaha FG800 Acoustic Guitar',
        description: 'Yamaha\'s most popular acoustic guitar — solid spruce top, nato back and sides, scalloped bracing. Great tone for the price. Natural finish.',
        imageUrl: IMG.acousticGuitar, images: [IMG.acousticGuitar],
        category: 'Strings', listingType: 'sale', stock: 5, price: 35000,
      },
      {
        name: 'Fender CD-60S Acoustic Guitar',
        description: 'Solid spruce top dreadnought with mahogany back and sides. Easy playability with rolled fingerboard edges. Includes hard shell case.',
        imageUrl: IMG.acousticGuitar, images: [IMG.acousticGuitar],
        category: 'Strings', listingType: 'sale', stock: 4, price: 44000,
      },
      {
        name: 'Stentor Student II Violin 4/4',
        description: 'Well-regarded student violin with carved spruce top, maple back/sides, dominant-style strings. Includes bow, case and rosin. 4/4 size.',
        imageUrl: IMG.violin, images: [IMG.violin],
        category: 'Strings', listingType: 'sale', stock: 6, price: 19500,
      },
      {
        name: 'Cremona SV-500 Intermediate Violin 4/4',
        description: 'Handcrafted intermediate violin — solid spruce carved top, flamed maple back. Dominant strings, full-size bow and deluxe case.',
        imageUrl: IMG.violin, images: [IMG.violin],
        category: 'Strings', listingType: 'sale', stock: 3, price: 40000,
      },
      {
        name: 'Stentor Cello 4/4 Student II',
        description: 'Carved spruce top cello for students and advancing players. Includes brazilwood bow, lightweight case with shoulder strap and rosin.',
        imageUrl: IMG.cello, images: [IMG.cello],
        category: 'Strings', listingType: 'sale', stock: 2, price: 65000,
      },
      {
        name: 'Pernambuco Intermediate Violin Bow',
        description: 'Pernambuco wood intermediate violin bow with octagonal stick, real horsehair and nickel-silver winding. Balanced and responsive.',
        imageUrl: IMG.accessories, images: [IMG.accessories],
        category: 'Accessories', listingType: 'sale', stock: 8, price: 8500,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Store 4 – Sound Rental LK  (Equipment – all rental)
  // -------------------------------------------------------------------------
  {
    storeIndex: 4,
    products: [
      {
        name: 'd&b audiotechnik Y-Series Line Array (8 units) – For Rent',
        description: 'Professional line array system: 8× d&b Y8 speakers + 2× Y-SUB subwoofers, 4× D80 amplifiers, rigging, cable and engineer support. Suitable for 500–2000 pax events. Price is per event.',
        imageUrl: IMG.speaker, images: [IMG.speaker],
        category: 'Equipment', listingType: 'rent', stock: 1, price: 25000,
      },
      {
        name: 'Pioneer CDJ-3000 Multi Player Pair – For Rent',
        description: 'Pair of Pioneer CDJ-3000 professional media players — 9" full HD display, 16-deck link, USB-A media playback. Industry standard for club and festival DJs. Price is per day.',
        imageUrl: IMG.dj, images: [IMG.dj],
        category: 'Equipment', listingType: 'rent', stock: 2, price: 18500,
      },
      {
        name: 'Pioneer DJM-900NXS2 DJ Mixer – For Rent',
        description: '4-channel professional DJ mixer with Magvel Fader, 64-bit mixing engine, beat effects and onboard recording. Pairs perfectly with CDJ-3000s. Price is per day.',
        imageUrl: IMG.dj, images: [IMG.dj],
        category: 'Equipment', listingType: 'rent', stock: 2, price: 9500,
      },
      {
        name: 'Shure SM58 Microphone Pack × 10 – For Rent',
        description: '10× Shure SM58 vocal microphones with stands, clips and 5m XLR cables. Essential vocal mic for any live event. Price is per day.',
        imageUrl: IMG.microphone, images: [IMG.microphone],
        category: 'Equipment', listingType: 'rent', stock: 2, price: 4500,
      },
      {
        name: 'Shure Beta 52A Kick Drum Microphone – For Rent',
        description: 'Shure Beta 52A supercardioid dynamic kick drum and bass instrument microphone. Price is per day.',
        imageUrl: IMG.microphone, images: [IMG.microphone],
        category: 'Accessories', listingType: 'rent', stock: 4, price: 1500,
      },
      {
        name: 'Stage LED Lighting Set (10 × PAR + truss) – For Rent',
        description: '10× 18W RGB LED PAR cans mounted on 6m totems/truss, DMX controller, hazer. Transforms any stage. Price is per event.',
        imageUrl: IMG.lighting, images: [IMG.lighting],
        category: 'Equipment', listingType: 'rent', stock: 2, price: 12000,
      },
      {
        name: 'Haze Machine (Fog/Haze Effect) – For Rent',
        description: 'Martin Jem ZR33 haze machine with fluid. Ideal for concerts, theatre and clubs. Price is per day.',
        imageUrl: IMG.lighting, images: [IMG.lighting],
        category: 'Equipment', listingType: 'rent', stock: 3, price: 3500,
      },
      {
        name: '50m Stage Multicore Snake Cable – For Rent',
        description: '24-channel stage multicore snake with stage box, 50m trunk and fan-out tails. Neutrik connectors. Price is per day.',
        imageUrl: IMG.cable, images: [IMG.cable],
        category: 'Accessories', listingType: 'rent', stock: 3, price: 1800,
      },
      {
        name: 'DI Box Set × 12 (Active) – For Rent',
        description: '12× Radial J48 active direct boxes. Essential for connecting instruments to FOH. Price is per day.',
        imageUrl: IMG.accessories, images: [IMG.accessories],
        category: 'Accessories', listingType: 'rent', stock: 4, price: 2500,
      },
      {
        name: 'Wired IEM Monitor System × 8 (For Rent)',
        description: '8-channel wired in-ear monitor system with Behringer Powerplay P16-M personal mixers and earphones. Price is per day.',
        imageUrl: IMG.accessories, images: [IMG.accessories],
        category: 'Equipment', listingType: 'rent', stock: 2, price: 4800,
      },
      {
        name: 'Wireless Lavalier Mic Set × 4 (For Rent)',
        description: '4× Sennheiser EW 100 G4 wireless lavalier microphone systems. Ideal for presentations, theatre and corporate events. Price is per event.',
        imageUrl: IMG.microphone, images: [IMG.microphone],
        category: 'Equipment', listingType: 'rent', stock: 3, price: 5500,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Store 5 – Galle Guitar House  (Strings + Instruments + Accessories)
  // -------------------------------------------------------------------------
  {
    storeIndex: 5,
    products: [
      {
        name: 'Gibson Les Paul Standard 50s',
        description: 'USA-made Les Paul Standard with AAA maple cap, mahogany body, Burstbucker 1 & 2 pickups and push/pull coil tap. Tobacco Burst finish.',
        imageUrl: IMG.electricGuitar, images: [IMG.electricGuitar],
        category: 'Strings', listingType: 'sale', stock: 1, price: 392000,
      },
      {
        name: 'Fender Player Series Stratocaster (MIM)',
        description: 'Mexican-made Stratocaster with alder body, 3× Player Series Alnico 5 single-coils and Modern C profile maple neck. Polar White finish.',
        imageUrl: IMG.electricGuitar, images: [IMG.electricGuitar],
        category: 'Strings', listingType: 'sale', stock: 2, price: 195000,
      },
      {
        name: 'Squier Classic Vibe 60s Stratocaster',
        description: 'Vintage-inspired Stratocaster with basswood body, Fender Designed Alnico pickups and C-profile neck. Best value electric guitar in its class.',
        imageUrl: IMG.electricGuitar, images: [IMG.electricGuitar],
        category: 'Strings', listingType: 'sale', stock: 3, price: 88000,
      },
      {
        name: 'Epiphone Les Paul Standard Plus-Top Pro',
        description: 'Les Paul-style guitar with AAA flame maple top, ProBucker pickups with coil-tap and Graph Tech NuBone nut. Heritage Cherry Sunburst.',
        imageUrl: IMG.electricGuitar, images: [IMG.electricGuitar],
        category: 'Strings', listingType: 'sale', stock: 3, price: 98500,
      },
      {
        name: 'Taylor 114e Acoustic-Electric Guitar',
        description: 'Taylor\'s most accessible acoustic-electric: layered walnut back/sides, solid Sitka spruce top, ES-B pickup system. Includes hardshell case.',
        imageUrl: IMG.acousticGuitar, images: [IMG.acousticGuitar],
        category: 'Strings', listingType: 'sale', stock: 2, price: 172000,
      },
      {
        name: 'Martin LX1E Little Martin Acoustic-Electric',
        description: 'Compact travel guitar by Martin. HPL body, Fishman Sonitone pickup, high-altitude strings. Easy to carry anywhere.',
        imageUrl: IMG.acousticGuitar, images: [IMG.acousticGuitar],
        category: 'Strings', listingType: 'sale', stock: 4, price: 58000,
      },
      {
        name: 'Cort Action Plus Electric Bass',
        description: 'Active bass guitar with ash body, 24-fret maple neck and Markbass Electronics EQ. Versatile and punchy low end.',
        imageUrl: IMG.bass, images: [IMG.bass],
        category: 'Strings', listingType: 'sale', stock: 3, price: 65000,
      },
      {
        name: 'Ibanez GSRM20 Mikro Bass Guitar',
        description: 'Short-scale (28.6") bass perfect for younger players or travelling musicians. Maple neck, poplar body, 2× passive soapbar pickups.',
        imageUrl: IMG.bass, images: [IMG.bass],
        category: 'Strings', listingType: 'sale', stock: 4, price: 38500,
      },
      {
        name: 'Fender Squier Starter Pack (Guitar + Amp)',
        description: 'Complete beginner package: Squier Affinity Stratocaster + Frontman 10G amp + cable + strap + picks + tuner. Everything to start playing today.',
        imageUrl: IMG.electricGuitar, images: [IMG.electricGuitar, IMG.guitarAmp],
        category: 'Instruments', listingType: 'sale', stock: 3, price: 88500,
      },
      {
        name: 'Fender Champion 100 Amplifier',
        description: '100W combo amp with 2× 12" speakers, dual channels, digital effects (reverb, delay, chorus). Covers cleans, crunch and lead tones.',
        imageUrl: IMG.guitarAmp, images: [IMG.guitarAmp],
        category: 'Equipment', listingType: 'sale', stock: 2, price: 75000,
      },
      {
        name: 'Boss DS-1 Distortion Pedal',
        description: 'Classic Boss DS-1 distortion effects pedal. Used by everyone from Kurt Cobain to Steve Vai. 9V battery or PSA adapter.',
        imageUrl: IMG.guitarPedal, images: [IMG.guitarPedal],
        category: 'Accessories', listingType: 'sale', stock: 8, price: 8500,
      },
      {
        name: 'Guitar Leather Strap',
        description: 'Genuine leather guitar strap, adjustable 90–150 cm. Brass hardware, comfortable suede backing. Suits both acoustic and electric guitars.',
        imageUrl: IMG.accessories, images: [IMG.accessories],
        category: 'Accessories', listingType: 'sale', stock: 20, price: 3500,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Store 6 – Eastern Music Studio  (Traditional + Wind)
  // -------------------------------------------------------------------------
  {
    storeIndex: 6,
    products: [
      {
        name: 'Pungi (Traditional Wind Instrument)',
        description: 'Handmade Pungi (snake charmer flute) crafted from dried bottle gourd and bamboo reed. Traditional Sri Lankan and South Asian folk wind instrument.',
        imageUrl: IMG.flute, images: [IMG.flute],
        category: 'Wind', listingType: 'sale', stock: 10, price: 2800,
      },
      {
        name: 'Bamboo Flute Set – Sri Lankan Navagraha',
        description: 'Set of 9 Sri Lankan bamboo flutes in the Navagraha scale series. Each flute hand-crafted from locally sourced bamboo. Ideal for folk and devotional music.',
        imageUrl: IMG.flute, images: [IMG.flute],
        category: 'Wind', listingType: 'sale', stock: 20, price: 1800,
      },
      {
        name: 'Kolom Flute (Sri Lankan Traditional)',
        description: 'Traditional Sri Lankan side-blown wooden flute used in kolam folk performances. Handcrafted in jak wood with natural finish.',
        imageUrl: IMG.flute, images: [IMG.flute],
        category: 'Wind', listingType: 'sale', stock: 12, price: 3500,
      },
      {
        name: 'Edandera (Traditional Ceremonial Horn)',
        description: 'Sri Lankan Edandera — a conical ceremonial horn used in Buddhist and Hindu temple rituals. Brass mouthpiece, wooden bell. Handcrafted in Batticaloa.',
        imageUrl: IMG.traditional, images: [IMG.traditional],
        category: 'Traditional', listingType: 'sale', stock: 4, price: 9500,
      },
      {
        name: 'Thavil – Tamil Percussion Barrel Drum',
        description: 'Professional Thavil (double-headed cylindrical drum) used in Nadaswaram ensembles and Tamil festivals. Jackwood body, two skins tuned with rope.',
        imageUrl: IMG.tabla, images: [IMG.tabla],
        category: 'Percussion', listingType: 'sale', stock: 3, price: 35000,
      },
      {
        name: 'Tabla Set – Professional (Delhi Gharana)',
        description: 'Pair of professional-grade tabla drums — dayan (treble) and bayan (bass) — in Delhi gharana style. Natural skin heads, includes carrying case.',
        imageUrl: IMG.tabla, images: [IMG.tabla],
        category: 'Percussion', listingType: 'sale', stock: 4, price: 22000,
      },
      {
        name: 'Dolak – Double-Ended Rope Drum',
        description: 'Traditional Dolak (dholak) with ceramic/wood barrel, two different-pitched goat-skin heads and rope tensioning. Used in folk and devotional music.',
        imageUrl: IMG.traditional, images: [IMG.traditional],
        category: 'Percussion', listingType: 'sale', stock: 5, price: 15000,
      },
      {
        name: 'Harmonium – 42-Key 3.5 Octave',
        description: 'Professional harmonium with 42 keys, 3.5 octave range, double-bellows, 9 stops. Used in Carnatic classical and devotional music performances.',
        imageUrl: IMG.harmonium, images: [IMG.harmonium],
        category: 'Traditional', listingType: 'sale', stock: 3, price: 48000,
      },
      {
        name: 'Nadaswaram (South Indian Oboe)',
        description: 'Professional Nadaswaram in key of G. Black wood or rosewood body, brass bell, spare reeds included. Central to Tamil temple and wedding music.',
        imageUrl: IMG.traditional, images: [IMG.traditional],
        category: 'Wind', listingType: 'sale', stock: 2, price: 28000,
      },
      {
        name: 'Alto Saxophone Yamaha YAS-280 – For Rent',
        description: 'Yamaha YAS-280 student-grade alto saxophone. Excellent for students, events and recording sessions. Includes mouthpiece, reed and case. Price is per day.',
        imageUrl: IMG.saxophone, images: [IMG.saxophone],
        category: 'Wind', listingType: 'rent', stock: 2, price: 3800,
      },
      {
        name: 'Trumpet Yamaha YTR-2330 Bb – For Rent',
        description: 'Yamaha standard Bb trumpet. Clear lacquer finish, monel pistons. Ideal for students, events or recording. Includes case and mouthpiece. Price is per day.',
        imageUrl: IMG.trumpet, images: [IMG.trumpet],
        category: 'Wind', listingType: 'rent', stock: 2, price: 2800,
      },
      {
        name: 'Trombone Jupiter JTB700A – For Rent',
        description: 'Student-grade Bb tenor trombone by Jupiter. Yellow brass bell, nickel silver outer slide, Vincent Bach 12C mouthpiece. Price is per day.',
        imageUrl: IMG.trumpet, images: [IMG.trumpet],
        category: 'Wind', listingType: 'rent', stock: 1, price: 3200,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Store 7 – Pro Audio Systems  (Equipment + Accessories)
  // -------------------------------------------------------------------------
  {
    storeIndex: 7,
    products: [
      {
        name: 'Universal Audio Apollo Twin X DUO',
        description: 'Thunderbolt 3 audio interface with 2 UAD-2 DUO cores, 2 Unison preamps, realtime UAD plug-in processing and stunning 24-bit/192kHz conversion.',
        imageUrl: IMG.audioInterface, images: [IMG.audioInterface],
        category: 'Equipment', listingType: 'sale', stock: 2, price: 188000,
      },
      {
        name: 'Native Instruments Komplete Kontrol S61 Mk2',
        description: '61-key semi-weighted MIDI keyboard with smart play keys, NKS browser integration, plugin parameter mapping and Light Guide LED strip.',
        imageUrl: IMG.keyboard, images: [IMG.keyboard],
        category: 'Equipment', listingType: 'sale', stock: 2, price: 168000,
      },
      {
        name: 'Pioneer DJ DDJ-SX3 4-Deck Controller',
        description: '4-deck Serato DJ Pro controller with 8× performance pads, dedicated Send/Return FX, built-in sound card and robust steel chassis.',
        imageUrl: IMG.dj, images: [IMG.dj],
        category: 'Equipment', listingType: 'sale', stock: 2, price: 258000,
      },
      {
        name: 'Rode NT1 5th Gen Condenser Microphone',
        description: '1-inch cardioid condenser mic with extremely low self-noise (4dB), USB-C + XLR outputs, pop shield and studio mount included.',
        imageUrl: IMG.microphone, images: [IMG.microphone],
        category: 'Equipment', listingType: 'sale', stock: 4, price: 38000,
      },
      {
        name: 'Shure SM7B Dynamic Vocal Microphone',
        description: 'Legendary broadcast-grade dynamic microphone. Flat, wide-range response, internal air suspension and pop filter. The standard for podcasting and recording.',
        imageUrl: IMG.microphone, images: [IMG.microphone],
        category: 'Equipment', listingType: 'sale', stock: 3, price: 68000,
      },
      {
        name: 'Yamaha HS8 Studio Monitor (Single)',
        description: 'Yamaha HS8 powered nearfield monitor: 8" woofer, 1" tweeter, 75W + 45W bi-amp. Flat, revealing response ideal for mixing and mastering.',
        imageUrl: IMG.studioMonitor, images: [IMG.studioMonitor],
        category: 'Equipment', listingType: 'sale', stock: 4, price: 78000,
      },
      {
        name: 'Adam Audio T7V Studio Monitor (Single)',
        description: 'Adam Audio T7V: 7" woofer with 50W amplifier + S-ART tweeter. Wide sweet spot, detailed high-frequency response. Ideal for home studios.',
        imageUrl: IMG.studioMonitor, images: [IMG.studioMonitor],
        category: 'Equipment', listingType: 'sale', stock: 5, price: 48000,
      },
      {
        name: 'SSL 2+ Audio Interface',
        description: '2-in/4-out USB interface with 2 SSL mic preamps, Legacy 4K sound enhancement, independent headphone amp and loopback for streaming.',
        imageUrl: IMG.audioInterface, images: [IMG.audioInterface],
        category: 'Equipment', listingType: 'sale', stock: 4, price: 55000,
      },
      {
        name: 'Arturia MiniBrute 2 Analog Synthesizer',
        description: 'Monophonic analog synthesizer with Brute voice, 2× VCO, Steiner-Parker filter, 32-key keyboard, USB/CV and semi-modular patch panel.',
        imageUrl: IMG.synth, images: [IMG.synth],
        category: 'Instruments', listingType: 'sale', stock: 2, price: 125000,
      },
      {
        name: 'Roland TR-8S Rhythm Composer',
        description: 'Roland TR-8S: 11 drum parts, analog circuit behaviour models, sample import/export, per-step probability and scatter. Studio and live performance workhorse.',
        imageUrl: IMG.synth, images: [IMG.synth],
        category: 'Equipment', listingType: 'sale', stock: 2, price: 98000,
      },
      {
        name: 'Pioneer CDJ-3000 Pair + DJM-900NXS2 Rig – For Rent',
        description: 'Full professional DJ rig: 2× Pioneer CDJ-3000 players + 1× DJM-900NXS2 mixer, pre-cabled and flight-cased. Rider-friendly for concerts and festivals. Price is per day.',
        imageUrl: IMG.dj, images: [IMG.dj],
        category: 'Equipment', listingType: 'rent', stock: 1, price: 35000,
      },
      {
        name: 'Recording Session Booking – 4-Hour Block (For Rent)',
        description: 'Book a 4-hour pro recording session at Pro Audio Systems studio: Neve 8078 console emulation, UA Apollo interface, treated room, engineer included. Price is per 4-hour session.',
        imageUrl: IMG.mixer, images: [IMG.mixer],
        category: 'Equipment', listingType: 'rent', stock: 1, price: 15000,
      },
      {
        name: 'XLR Balanced Cable Premium 5m',
        description: 'Mogami W2534 quad-core balanced XLR cable, Neutrik NC3FXX/NC3MXX connectors, heat-shrink strain relief. Studio-grade performance.',
        imageUrl: IMG.cable, images: [IMG.cable],
        category: 'Accessories', listingType: 'sale', stock: 50, price: 1200,
      },
      {
        name: 'TRS Balanced Cable 3m',
        description: '6.35mm TRS balanced jack cable. Oxygen-free copper, Neutrik connectors. Ideal for connecting audio interfaces to studio monitors.',
        imageUrl: IMG.cable, images: [IMG.cable],
        category: 'Accessories', listingType: 'sale', stock: 40, price: 800,
      },
      {
        name: 'Heavy-Duty Boom Microphone Stand',
        description: 'Studio/stage microphone boom stand. Round weighted base (5 kg), 170–305 cm height range, euro-thread adapter. Holds any microphone securely.',
        imageUrl: IMG.accessories, images: [IMG.accessories],
        category: 'Accessories', listingType: 'sale', stock: 15, price: 4500,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const password = await bcrypt.hash(SEED_PASSWORD, 10);

    for (const storeDef of STORES) {
      // ---- 1. Upsert User (STORE_OWNER) ----
      const existingUser = await client.query(
        `SELECT id FROM "User" WHERE email = $1`,
        [storeDef.email],
      );

      let userId: string;
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        console.log(`  ↩ User exists: ${storeDef.email} (${userId})`);
      } else {
        userId = uid();
        await client.query(
          `INSERT INTO "User" (id, email, password, "fullName", city, role, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'STORE_OWNER', $6, $6)`,
          [userId, storeDef.email, password, storeDef.fullName, storeDef.city, NOW],
        );
        console.log(`  ✔ Created user: ${storeDef.fullName} (${storeDef.email})`);
      }

      // ---- 2. Upsert Store ----
      const existingStore = await client.query(
        `SELECT id FROM "Store" WHERE "ownerId" = $1`,
        [userId],
      );

      let storeId: string;
      if (existingStore.rows.length > 0) {
        storeId = existingStore.rows[0].id;
        // Update phone (and other fields) on existing stores
        await client.query(
          `UPDATE "Store" SET phone = $1, "updatedAt" = $2 WHERE id = $3`,
          [storeDef.store.phone, NOW, storeId],
        );
        console.log(`  ↩ Store exists (updated phone): ${storeDef.store.name} (${storeId})`);
      } else {
        storeId = uid();
        await client.query(
          `INSERT INTO "Store" (id, name, description, location, phone, rating, "reviewCount", "ownerId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
          [
            storeId,
            storeDef.store.name,
            storeDef.store.description,
            storeDef.store.location,
            storeDef.store.phone,
            storeDef.store.rating,
            storeDef.store.reviewCount,
            userId,
            NOW,
          ],
        );
        console.log(`  ✔ Created store: ${storeDef.store.name}`);
      }

      // ---- 3. Insert Products (always fresh for the seed) ----
      const storeProducts = PRODUCTS.find(p => p.storeIndex === STORES.indexOf(storeDef));
      if (!storeProducts) continue;

      for (const product of storeProducts.products) {
        const productId = uid();
        await client.query(
          `INSERT INTO "Product" (id, name, description, "imageUrl", images, category, "listingType", stock, price, "isActive", "storeId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, $11)`,
          [
            productId,
            product.name,
            product.description,
            product.imageUrl,
            product.images,
            product.category,
            product.listingType,
            product.stock,
            product.price,
            storeId,
            NOW,
          ],
        );
        const badge = product.listingType === 'rent' ? '[RENT]' : '[SALE]';
        console.log(`    + ${badge} ${product.name} – LKR ${product.price.toLocaleString()}`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅  Marketplace seed complete.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Seed failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
