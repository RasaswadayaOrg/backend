import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function buildConnectionString() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL is required');
  if (!rawUrl.includes('supabase')) return rawUrl;

  const url = new URL(rawUrl);
  url.searchParams.set('sslmode', 'no-verify');
  return url.toString();
}

const pool = new Pool({ connectionString: buildConnectionString() });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ArtistSeed = {
  name: string;
  profession: string;
  genre: string;
  location: string;
  bio: string;
};

type EventSeed = {
  title: string;
  category: string;
  description: string;
  venue: string;
  city: string;
  weeksAhead: number;
  price: number;
  capacity: number;
  performers: string[];
};

const artists: ArtistSeed[] = [
  { name: 'Bathiya Jayakody', profession: 'Singer / Musician', genre: 'music, sinhala_commercial, folk_fusion, fusion', location: 'colombo', bio: 'Sri Lankan contemporary pop musician and one half of Bathiya and Santhush, known for Sinhala pop and folk-hop fusion.' },
  { name: 'Santhush Weeraman', profession: 'Singer / Songwriter', genre: 'music, sinhala_commercial, pop, fusion', location: 'colombo', bio: 'Sri Lankan singer-songwriter and one half of Bathiya and Santhush, active in contemporary Sinhala pop and fusion music.' },
  { name: 'Yohani de Silva', profession: 'Singer / Songwriter', genre: 'music, sinhala_commercial, tamil_commercial, pop', location: 'colombo', bio: 'Sri Lankan singer-songwriter internationally known for Manike Mage Hithe and contemporary multilingual pop.' },
  { name: 'Sanuka Wickramasinghe', profession: 'Singer / Producer', genre: 'music, sinhala_commercial, ballads, fusion', location: 'colombo', bio: 'Contemporary Sri Lankan singer, songwriter, and producer known for Sinhala pop, ballads, and studio collaborations.' },
  { name: 'Windy Goonatillake', profession: 'Singer', genre: 'music, tamil_commercial, sinhala_commercial, pop', location: 'colombo', bio: 'Sri Lankan vocalist known for Tamil and Sinhala contemporary pop performances.' },
  { name: 'Rookantha Goonatillake', profession: 'Singer / Composer', genre: 'music, sinhala_commercial, ballads, romantic', location: 'colombo', bio: 'Influential Sri Lankan singer and composer known for Sinhala pop ballads and live performance.' },
  { name: 'Chandralekha Perera', profession: 'Singer', genre: 'music, sinhala_commercial, ballads', location: 'colombo', bio: 'Sri Lankan popular singer with a long career in Sinhala pop and romantic ballads.' },
  { name: 'Victor Ratnayake', profession: 'Singer / Composer', genre: 'music, classical_semi_classical, light_classical, devotional_religious', location: 'colombo', bio: 'Veteran Sri Lankan vocalist and composer known for light classical Sinhala music.' },
  { name: 'Nanda Malini', profession: 'Singer', genre: 'music, classical_semi_classical, devotional_religious, folk_fusion', location: 'colombo', bio: 'Highly respected Sri Lankan singer known for classical, devotional, folk, and socially conscious songs.' },
  { name: 'Sunil Edirisinghe', profession: 'Singer', genre: 'music, classical_semi_classical, light_classical, folk_fusion', location: 'colombo', bio: 'Sri Lankan vocalist known for Sinhala light classical music and film songs.' },
  { name: 'Edward Jayakody', profession: 'Singer', genre: 'music, devotional_religious, light_classical, folk_fusion', location: 'colombo', bio: 'Sri Lankan singer associated with devotional, classical, and folk-influenced Sinhala music.' },
  { name: 'Rohana Weerasinghe', profession: 'Composer / Music Director', genre: 'music, film_music, orchestral_scores, background_scores', location: 'colombo', bio: 'Sri Lankan composer and music director known for Sinhala film music and background scores.' },
  { name: 'Amarasiri Peiris', profession: 'Singer', genre: 'music, light_classical, ballads, film_music', location: 'colombo', bio: 'Sri Lankan vocalist known for distinctive Sinhala songs, film music, and reflective ballads.' },
  { name: 'Karunarathna Divulgane', profession: 'Singer', genre: 'music, light_classical, folk_fusion, ballads', location: 'colombo', bio: 'Sri Lankan singer known for poetic Sinhala songs rooted in folk and light classical traditions.' },
  { name: 'Deepika Priyadarshani', profession: 'Singer', genre: 'music, light_classical, devotional_religious, folk_fusion', location: 'colombo', bio: 'Sri Lankan vocalist known for expressive Sinhala music and devotional performances.' },
  { name: 'Nirosha Virajini', profession: 'Singer', genre: 'music, sinhala_commercial, ballads, film_music', location: 'colombo', bio: 'Award-winning Sri Lankan vocalist known for Sinhala pop, ballads, and film songs.' },
  { name: 'Sashika Nisansala', profession: 'Singer', genre: 'music, sinhala_commercial, ballads, romantic', location: 'colombo', bio: 'Sri Lankan singer known for contemporary Sinhala songs and romantic ballads.' },
  { name: 'Uresha Ravihari', profession: 'Singer', genre: 'music, film_music, sinhala_commercial, ballads', location: 'colombo', bio: 'Sri Lankan playback singer known for Sinhala film songs and live concerts.' },
  { name: 'Umaria Sinhawansa', profession: 'Singer', genre: 'music, sinhala_commercial, pop, fusion', location: 'colombo', bio: 'Sri Lankan singer known for contemporary pop, fusion, and powerful live vocals.' },
  { name: 'Umara Sinhawansa', profession: 'Singer', genre: 'music, sinhala_commercial, pop, fusion', location: 'colombo', bio: 'Sri Lankan vocalist and performer known for contemporary Sinhala and English pop music.' },
  { name: 'Chitral Somapala', profession: 'Rock Vocalist', genre: 'music, rock_alternative, metal, fusion', location: 'colombo', bio: 'Sri Lankan rock and metal vocalist with international collaborations and Sinhala rock performances.' },
  { name: 'Ashanthi de Alwis', profession: 'Singer / Rapper', genre: 'music, hip_hop_rap, sinhala_commercial, fusion', location: 'colombo', bio: 'Sri Lankan singer and rapper active in pop, hip-hop, and fusion music.' },
  { name: 'Iraj Weeraratne', profession: 'Rapper / Producer', genre: 'music, hip_hop_rap, tamil_commercial, fusion', location: 'colombo', bio: 'Sri Lankan music producer and rapper known for Sinhala and Tamil hip-hop and fusion tracks.' },
  { name: 'Randhir Witana', profession: 'Singer / Producer', genre: 'music, hip_hop_rap, sinhala_commercial, fusion', location: 'colombo', bio: 'Sri Lankan singer and producer associated with modern Sinhala pop and urban fusion.' },
  { name: 'Dhanith Sri', profession: 'Singer / Songwriter', genre: 'music, sinhala_commercial, ballads, contemporary', location: 'colombo', bio: 'Contemporary Sri Lankan singer-songwriter known for melodic Sinhala pop and acoustic performances.' },
  { name: 'Ridma Weerawardena', profession: 'Singer / Musician', genre: 'music, sinhala_commercial, ballads, fusion', location: 'colombo', bio: 'Sri Lankan musician known for contemporary Sinhala songs, arrangements, and collaborations.' },
  { name: 'Lahiru Perera', profession: 'Singer', genre: 'music, sinhala_commercial, pop, fusion', location: 'colombo', bio: 'Sri Lankan pop artist known for upbeat Sinhala songs and contemporary live performances.' },
  { name: 'Bachi Susan', profession: 'Singer', genre: 'music, sinhala_commercial, ballads, pop', location: 'colombo', bio: 'Sri Lankan singer known for Sinhala pop and popular ballads.' },
  { name: 'Damith Asanka', profession: 'Singer', genre: 'music, sinhala_commercial, ballads, folk_fusion', location: 'colombo', bio: 'Sri Lankan vocalist known for popular Sinhala songs and live stage performances.' },
  { name: 'Theekshana Anuradha', profession: 'Singer', genre: 'music, sinhala_commercial, ballads, pop', location: 'colombo', bio: 'Sri Lankan singer known for contemporary Sinhala music and television performances.' },
  { name: 'Dr. Ravibandu Vidyapathi', profession: 'Dancer / Choreographer / Percussionist', genre: 'dance, music, kandyan_dance, contemporary_modern', location: 'kandy', bio: 'Sri Lankan Kandyan dancer, choreographer, and percussionist known for traditional and contemporary work.' },
  { name: 'Chandana Wickramasinghe', profession: 'Dancer / Choreographer', genre: 'dance, contemporary_modern, kandyan_dance, fusion', location: 'colombo', bio: 'Sri Lankan dancer and choreographer known for large-scale contemporary and traditional dance productions.' },
  { name: 'Upeka Chitrasena', profession: 'Dancer / Teacher', genre: 'dance, kandyan_dance, contemporary_modern', location: 'colombo', bio: 'Sri Lankan dancer and teacher associated with the Chitrasena dance tradition.' },
  { name: 'Thaji Dias', profession: 'Bharatanatyam Dancer', genre: 'dance, tamil_classical, bharatanatyam', location: 'colombo', bio: 'Sri Lankan Bharatanatyam dancer and teacher active in Tamil classical dance.' },
  { name: 'Channa Wijewardena', profession: 'Dancer / Choreographer', genre: 'dance, kandyan_dance, contemporary_modern, fusion', location: 'colombo', bio: 'Sri Lankan dancer and choreographer known for stage productions and dance education.' },
  { name: 'Prof. Mudiyanse Dissanayake', profession: 'Dancer / Professor', genre: 'dance, kandyan_dance, ritual_based, traditional_theatre', location: 'kandy', bio: 'Sri Lankan traditional dance scholar and performer associated with Kandyan and ritual dance.' },
  { name: 'Sandhya Murali', profession: 'Bharatanatyam Dancer', genre: 'dance, tamil_classical, bharatanatyam', location: 'colombo', bio: 'Sri Lankan Bharatanatyam performer and teacher active in classical Tamil dance.' },
  { name: 'Prasanna Vithanage', profession: 'Film Director', genre: 'film, art_parallel_cinema, political_cinema, social_realism', location: 'colombo', bio: 'Sri Lankan film director known for internationally screened political and art cinema.' },
  { name: 'Vimukthi Jayasundara', profession: 'Film Director', genre: 'film, experimental_independent, art_parallel_cinema', location: 'colombo', bio: 'Sri Lankan filmmaker known for experimental cinema and international festival recognition.' },
  { name: 'Asoka Handagama', profession: 'Film Director', genre: 'film, drama, art_parallel_cinema, social_realism', location: 'colombo', bio: 'Sri Lankan filmmaker and dramatist known for politically engaged film and television work.' },
  { name: 'Somaratne Dissanayake', profession: 'Film Director', genre: 'film, commercial_cinema, family_drama', location: 'colombo', bio: 'Sri Lankan film director known for family-oriented Sinhala cinema.' },
  { name: 'Udayakantha Warnasuriya', profession: 'Film Director', genre: 'film, commercial_cinema, historical_period, drama', location: 'colombo', bio: 'Sri Lankan film director known for popular Sinhala cinema and historical productions.' },
  { name: 'Jayantha Chandrasiri', profession: 'Film Director / Playwright', genre: 'film, drama, historical_period, teledrama', location: 'colombo', bio: 'Sri Lankan film and theatre director known for historical, dramatic, and television work.' },
  { name: 'Boodee Keerthisena', profession: 'Film Director', genre: 'film, experimental_independent, contemporary', location: 'colombo', bio: 'Sri Lankan filmmaker known for independent cinema and contemporary storytelling.' },
  { name: 'Anoma Rajakaruna', profession: 'Film Director', genre: 'film, documentary, social_realism', location: 'colombo', bio: 'Sri Lankan documentary filmmaker and cultural worker focused on social themes.' },
  { name: 'Malini Fonseka', profession: 'Actress', genre: 'drama, film, commercial_cinema, family_drama', location: 'colombo', bio: 'Sri Lankan actress widely recognised for Sinhala cinema and television performances.' },
  { name: 'Swarna Mallawarachchi', profession: 'Actress', genre: 'drama, film, art_parallel_cinema, social_realism', location: 'colombo', bio: 'Sri Lankan actress known for acclaimed dramatic performances in Sinhala cinema.' },
  { name: 'Sangeetha Weeraratne', profession: 'Actress', genre: 'drama, film, commercial_cinema, romantic', location: 'colombo', bio: 'Sri Lankan actress known for popular and dramatic Sinhala film roles.' },
  { name: 'Dilhani Ekanayake', profession: 'Actress', genre: 'drama, film, romantic, family_drama', location: 'colombo', bio: 'Sri Lankan actress known for cinema, television, and dramatic performances.' },
  { name: 'Hemal Ranasinghe', profession: 'Actor', genre: 'drama, film, commercial_cinema, romantic', location: 'colombo', bio: 'Sri Lankan actor known for contemporary Sinhala cinema and popular screen roles.' },
  { name: 'Bimal Jayakody', profession: 'Actor', genre: 'drama, film, social_realism, teledrama', location: 'colombo', bio: 'Sri Lankan actor known for film, theatre, and television drama performances.' },
  { name: 'Sriyantha Mendis', profession: 'Actor / Theatre Artist', genre: 'drama, theatre, teledrama, modern_stage_drama', location: 'colombo', bio: 'Sri Lankan actor active in stage drama, television, and cinema.' },
  { name: 'Mahendra Perera', profession: 'Actor', genre: 'drama, film, teledrama, comedy_commercial', location: 'colombo', bio: 'Sri Lankan actor known for versatile cinema, television, and stage roles.' },
  { name: 'Sanath Gunathilake', profession: 'Actor / Film Director', genre: 'drama, film, commercial_cinema, romantic', location: 'colombo', bio: 'Sri Lankan actor and director known for Sinhala cinema and romantic drama roles.' },
  { name: 'Ravindra Randeniya', profession: 'Actor', genre: 'drama, film, commercial_cinema, historical_period', location: 'colombo', bio: 'Sri Lankan actor known for major roles in Sinhala cinema and television.' },
  { name: 'Shyam Fernando', profession: 'Actor', genre: 'drama, film, art_parallel_cinema, social_realism', location: 'colombo', bio: 'Sri Lankan actor known for contemporary cinema, theatre, and television performances.' },
  { name: 'Dasun Pathirana', profession: 'Actor', genre: 'drama, film, contemporary, teledrama', location: 'colombo', bio: 'Sri Lankan actor active in contemporary film and television drama.' },
  { name: 'Pubudu Chathuranga', profession: 'Actor / Filmmaker', genre: 'drama, film, commercial_cinema, contemporary', location: 'colombo', bio: 'Sri Lankan actor and filmmaker known for cinema, television, and stage work.' },
  { name: 'Kaushalya Fernando', profession: 'Actress / Theatre Artist', genre: 'drama, theatre, modern_stage_drama, art_parallel_cinema', location: 'colombo', bio: 'Sri Lankan actress and theatre artist known for stage and art cinema performances.' },
  { name: 'Saumya Liyanage', profession: 'Actor / Theatre Artist', genre: 'drama, theatre, modern_stage_drama, social_realism', location: 'colombo', bio: 'Sri Lankan actor and academic active in theatre, cinema, and performance studies.' },
  { name: 'Dharmasiri Bandaranayake', profession: 'Film Director / Theatre Director', genre: 'film, drama, political_cinema, modern_stage_drama', location: 'colombo', bio: 'Sri Lankan filmmaker and theatre director known for political theatre and cinema.' },
  { name: 'Rajitha Dissanayake', profession: 'Playwright / Theatre Director', genre: 'drama, theatre, modern_stage_drama, political_theatre', location: 'colombo', bio: 'Sri Lankan playwright and theatre director known for contemporary stage drama.' },
];

const events: EventSeed[] = [
  { title: 'Colombo International Film Festival 2026', category: 'film', description: 'Screenings of Sri Lankan and South Asian cinema with director conversations and short-film showcases.', venue: 'Regal Cinema Colombo', city: 'colombo', weeksAhead: 2, price: 1500, capacity: 500, performers: ['Prasanna Vithanage', 'Asoka Handagama', 'Vimukthi Jayasundara'] },
  { title: 'Romantic Sinhala Cinema Night - Kurunegala', category: 'film', description: 'A curated evening of romantic Sinhala cinema and live discussion on film music and screen performance.', venue: 'Kurunegala Town Hall', city: 'kurunegala', weeksAhead: 3, price: 800, capacity: 350, performers: ['Hemal Ranasinghe', 'Dilhani Ekanayake', 'Rohana Weerasinghe'] },
  { title: 'Jaffna International Cinema Weekend', category: 'film', description: 'Tamil and Sinhala independent cinema screenings with panel sessions for young filmmakers.', venue: 'Jaffna Cultural Centre', city: 'jaffna', weeksAhead: 4, price: 700, capacity: 300, performers: ['Anoma Rajakaruna', 'Boodee Keerthisena'] },
  { title: 'Prasanna Vithanage Retrospective', category: 'film', description: 'Retrospective screening and discussion focused on social realism and modern Sri Lankan art cinema.', venue: 'National Film Corporation Auditorium', city: 'colombo', weeksAhead: 5, price: 1000, capacity: 250, performers: ['Prasanna Vithanage', 'Shyam Fernando'] },
  { title: 'Galle Short Film Showcase', category: 'film', description: 'Emerging Sri Lankan short films and documentary screenings for southern province audiences.', venue: 'Galle Fort Hall', city: 'galle', weeksAhead: 6, price: 600, capacity: 220, performers: ['Vimukthi Jayasundara', 'Anoma Rajakaruna'] },
  { title: 'Kandy Documentary Cinema Forum', category: 'documentary', description: 'Documentary screenings and conversations on heritage, memory, and public culture.', venue: 'Kandy City Centre Auditorium', city: 'kandy', weeksAhead: 7, price: 500, capacity: 180, performers: ['Anoma Rajakaruna', 'Asoka Handagama'] },
  { title: 'Kurunegala Nadagam Theatre Evening', category: 'drama', description: 'Traditional and modern Sinhala drama evening inspired by Nadagam storytelling and regional folk theatre.', venue: 'Kurunegala Cultural Centre', city: 'kurunegala', weeksAhead: 2, price: 600, capacity: 300, performers: ['Rajitha Dissanayake', 'Saumya Liyanage'] },
  { title: 'Lionel Wendt Modern Drama Season', category: 'theatre', description: 'Contemporary Sinhala theatre season with social drama, political theatre, and post-show discussions.', venue: 'Lionel Wendt Theatre', city: 'colombo', weeksAhead: 3, price: 2000, capacity: 320, performers: ['Dharmasiri Bandaranayake', 'Kaushalya Fernando', 'Sriyantha Mendis'] },
  { title: 'Jaffna Tamil Theatre Festival', category: 'theatre', description: 'Tamil theatre festival featuring contemporary plays and dialogue on identity and cultural memory.', venue: 'Jaffna Cultural Centre', city: 'jaffna', weeksAhead: 5, price: 800, capacity: 250, performers: ['Rajitha Dissanayake', 'Kaushalya Fernando'] },
  { title: 'Galle Kolam Masked Drama Night', category: 'drama', description: 'Southern masked drama and folk theatre traditions presented for a contemporary audience.', venue: 'Galle Fort Amphitheatre', city: 'galle', weeksAhead: 4, price: 700, capacity: 300, performers: ['Sriyantha Mendis', 'Mahendra Perera'] },
  { title: 'Kandy Historical Stage Drama', category: 'drama', description: 'Historical Sinhala stage drama with film and theatre actors exploring royal court narratives.', venue: 'Kandy Arts Association Hall', city: 'kandy', weeksAhead: 6, price: 1200, capacity: 350, performers: ['Jayantha Chandrasiri', 'Ravindra Randeniya', 'Sanath Gunathilake'] },
  { title: 'Batticaloa Community Theatre Night', category: 'drama', description: 'Community theatre and bilingual stage performances from eastern province cultural groups.', venue: 'Batticaloa Cultural Hall', city: 'batticaloa', weeksAhead: 7, price: 400, capacity: 220, performers: ['Saumya Liyanage', 'Bimal Jayakody'] },
  { title: 'Kandy Kandyan Dance Night', category: 'dance', description: 'Kandyan dance, drum, and ritual performance evening with traditional and contemporary segments.', venue: 'Kandy Lake Club', city: 'kandy', weeksAhead: 2, price: 2500, capacity: 500, performers: ['Dr. Ravibandu Vidyapathi', 'Prof. Mudiyanse Dissanayake'] },
  { title: 'Colombo Contemporary Dance Festival', category: 'dance', description: 'Contemporary Sri Lankan choreography with fusion works and new movement experiments.', venue: 'Nelum Pokuna Theatre', city: 'colombo', weeksAhead: 4, price: 2200, capacity: 900, performers: ['Chandana Wickramasinghe', 'Channa Wijewardena', 'Upeka Chitrasena'] },
  { title: 'Galle Low Country Dance and Kolam Show', category: 'dance', description: 'Low country dance, masked movement, and southern ritual performance traditions.', venue: 'Galle Fort Grounds', city: 'galle', weeksAhead: 5, price: 1000, capacity: 400, performers: ['Channa Wijewardena', 'Dr. Ravibandu Vidyapathi'] },
  { title: 'Jaffna Bharatanatyam Evening', category: 'dance', description: 'Tamil classical Bharatanatyam repertoire with devotional and contemporary items.', venue: 'Jaffna Cultural Centre', city: 'jaffna', weeksAhead: 3, price: 900, capacity: 300, performers: ['Thaji Dias', 'Sandhya Murali'] },
  { title: 'Kurunegala Sabaragamuwa Folk Dance Night', category: 'dance', description: 'Regional folk dance and drumming from the North Western and Sabaragamuwa traditions.', venue: 'Kurunegala Municipal Grounds', city: 'kurunegala', weeksAhead: 6, price: 500, capacity: 500, performers: ['Prof. Mudiyanse Dissanayake', 'Dr. Ravibandu Vidyapathi'] },
  { title: 'Anuradhapura Ritual Dance Gathering', category: 'dance', description: 'Ritual dance, devotional rhythm, and heritage performance in the ancient city.', venue: 'Anuradhapura Cultural Centre', city: 'anuradhapura', weeksAhead: 8, price: 500, capacity: 500, performers: ['Dr. Ravibandu Vidyapathi', 'Chandana Wickramasinghe'] },
  { title: 'Matara Folk Dance Showcase', category: 'dance', description: 'Southern folk dances and village festival choreography performed by leading dance artists.', venue: 'Matara Cultural Centre', city: 'matara', weeksAhead: 9, price: 450, capacity: 260, performers: ['Channa Wijewardena', 'Upeka Chitrasena'] },
  { title: 'BnS Live at Sugathadasa', category: 'music', description: 'Bathiya and Santhush perform contemporary Sinhala pop, folk-hop, and fusion hits.', venue: 'Sugathadasa Indoor Stadium', city: 'colombo', weeksAhead: 2, price: 5000, capacity: 5000, performers: ['Bathiya Jayakody', 'Santhush Weeraman'] },
  { title: 'Yohani Sanuka Windy Pop Night', category: 'music', description: 'Contemporary Sinhala and Tamil pop night with young Sri Lankan artists.', venue: 'Viharamahadevi Open Air Theatre', city: 'colombo', weeksAhead: 3, price: 2500, capacity: 1200, performers: ['Yohani de Silva', 'Sanuka Wickramasinghe', 'Windy Goonatillake'] },
  { title: 'Nanda Malini Folk and Classical Evening', category: 'music', description: 'Folk, devotional, and classical Sinhala songs in an intimate theatre concert.', venue: 'Lionel Wendt Theatre', city: 'colombo', weeksAhead: 5, price: 3000, capacity: 320, performers: ['Nanda Malini', 'Deepika Priyadarshani'] },
  { title: 'Victor Ratnayake and Sunil Edirisinghe Classics', category: 'music', description: 'Sinhala light classical concert with veteran vocalists and orchestral backing.', venue: 'BMICH', city: 'colombo', weeksAhead: 6, price: 3500, capacity: 1500, performers: ['Victor Ratnayake', 'Sunil Edirisinghe', 'Edward Jayakody'] },
  { title: 'Jaffna Carnatic and Tamil Music Festival', category: 'music', description: 'Tamil classical, devotional, and contemporary music performances for northern audiences.', venue: 'Jaffna Cultural Centre', city: 'jaffna', weeksAhead: 4, price: 1000, capacity: 350, performers: ['Thaji Dias', 'Sandhya Murali', 'Iraj Weeraratne'] },
  { title: 'Galle Southern Baila Festival', category: 'music', description: 'A festive southern baila and pop concert with danceable Sinhala music.', venue: 'Galle Fort Grounds', city: 'galle', weeksAhead: 7, price: 2000, capacity: 1500, performers: ['Nirosha Virajini', 'Bachi Susan', 'Lahiru Perera'] },
  { title: 'Kandy Drumming and Fusion Night', category: 'music', description: 'Kandyan drumming, folk fusion, and contemporary arrangements from leading artists.', venue: 'Kandy Arts Association Hall', city: 'kandy', weeksAhead: 8, price: 1800, capacity: 400, performers: ['Dr. Ravibandu Vidyapathi', 'Ridma Weerawardena'] },
  { title: 'Kurunegala Folk Music Night', category: 'music', description: 'North Western province folk songs, ballads, and rural Sinhala musical traditions.', venue: 'Kurunegala Town Hall', city: 'kurunegala', weeksAhead: 4, price: 500, capacity: 400, performers: ['Karunarathna Divulgane', 'Damith Asanka'] },
  { title: 'Colombo Hip Hop and Urban Fusion Showcase', category: 'music', description: 'Sinhala and Tamil hip-hop, rap, and urban fusion night for Colombo audiences.', venue: 'Colombo Racecourse', city: 'colombo', weeksAhead: 5, price: 2500, capacity: 800, performers: ['Iraj Weeraratne', 'Ashanthi de Alwis', 'Randhir Witana'] },
  { title: 'Negombo Choir and Devotional Music Evening', category: 'music', description: 'Catholic hymns, devotional Sinhala songs, and choral arrangements in Negombo.', venue: 'Negombo Town Hall', city: 'negombo', weeksAhead: 7, price: 700, capacity: 300, performers: ['Edward Jayakody', 'Deepika Priyadarshani'] },
  { title: 'Anuradhapura Vesak Devotional Concert', category: 'music', description: 'Devotional Sinhala music for Vesak season near the sacred city of Anuradhapura.', venue: 'Mahamevnawa Park', city: 'anuradhapura', weeksAhead: 8, price: 400, capacity: 2000, performers: ['Nanda Malini', 'Edward Jayakody', 'Amarasiri Peiris'] },
  { title: 'Trincomalee Tamil Pop and Fusion Night', category: 'music', description: 'Tamil pop, Sinhala fusion, and multilingual Sri Lankan music by contemporary artists.', venue: 'Trincomalee Beach Stage', city: 'trincomalee', weeksAhead: 9, price: 1000, capacity: 700, performers: ['Umaria Sinhawansa', 'Umara Sinhawansa', 'Windy Goonatillake'] },
  { title: 'Colombo Batik and Handloom Craft Fair', category: 'craft', description: 'Traditional craft, batik, handloom, and visual arts market with demonstrations.', venue: 'Diyatha Uyana', city: 'colombo', weeksAhead: 3, price: 0, capacity: 1000, performers: [] },
  { title: 'Galle Contemporary Art Exhibition', category: 'art', description: 'Contemporary visual arts and gallery exhibition from southern province creators.', venue: 'Galle Fort Gallery', city: 'galle', weeksAhead: 5, price: 300, capacity: 200, performers: [] },
];

function eventDate(weeksAhead: number) {
  const date = new Date();
  date.setDate(date.getDate() + weeksAhead * 7);
  date.setHours(19, 0, 0, 0);
  return date;
}

async function upsertArtist(input: ArtistSeed) {
  const existing = await prisma.artist.findFirst({ where: { name: input.name } });
  const data = {
    name: input.name,
    profession: input.profession,
    genre: input.genre,
    location: input.location,
    bio: input.bio,
  };
  if (existing) {
    return prisma.artist.update({ where: { id: existing.id }, data });
  }
  return prisma.artist.create({ data });
}

async function upsertEvent(input: EventSeed, organizerId: string) {
  const existing = await prisma.event.findFirst({ where: { title: input.title } });
  const data = {
    title: input.title,
    description: input.description,
    eventDate: eventDate(input.weeksAhead),
    location: `${input.venue}, ${input.city}`,
    venue: input.venue,
    city: input.city,
    category: input.category,
    price: input.price,
    capacity: input.capacity,
    organizerId,
  };
  if (existing) {
    return prisma.event.update({ where: { id: existing.id }, data });
  }
  return prisma.event.create({ data });
}

async function main() {
  console.log('Seeding Rasaswadaya with living Sri Lankan artists and diverse events...');

  const organizer = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'ORGANIZER'] as any } },
  }) || await prisma.user.findFirst();

  if (!organizer) {
    throw new Error('No user exists to own seeded events. Create at least one user first.');
  }

  const artistIdsByName = new Map<string, string>();
  let artistCount = 0;
  for (const artist of artists) {
    const saved = await upsertArtist(artist);
    artistIdsByName.set(saved.name, saved.id);
    artistCount += 1;
    process.stdout.write(`\r  Upserted ${artistCount}/${artists.length} artists`);
  }
  console.log('');

  let eventCount = 0;
  let performanceCount = 0;
  for (const event of events) {
    const savedEvent = await upsertEvent(event, organizer.id);
    eventCount += 1;
    for (const performerName of event.performers) {
      const artistId = artistIdsByName.get(performerName);
      if (!artistId) continue;
      await prisma.performance.upsert({
        where: { artistId_eventId: { artistId, eventId: savedEvent.id } },
        update: {},
        create: { artistId, eventId: savedEvent.id },
      });
      performanceCount += 1;
    }
    process.stdout.write(`\r  Upserted ${eventCount}/${events.length} events`);
  }
  console.log('');

  const [totalArtists, totalEvents, totalPerformances, categories] = await Promise.all([
    prisma.artist.count(),
    prisma.event.count(),
    prisma.performance.count(),
    prisma.event.groupBy({ by: ['category'], _count: true }),
  ]);

  console.log('\n=== SEED COMPLETE ===');
  console.log(`Artists attempted: ${artists.length}`);
  console.log(`Events attempted: ${events.length}`);
  console.log(`Performances linked: ${performanceCount}`);
  console.log(`Total artists in DB: ${totalArtists}`);
  console.log(`Total events in DB:  ${totalEvents}`);
  console.log(`Total performances in DB: ${totalPerformances}`);
  console.log('Event categories:');
  for (const category of categories) {
    console.log(`  ${category.category}: ${category._count}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });