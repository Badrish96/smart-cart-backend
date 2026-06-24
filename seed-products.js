require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const Product = require('./src/models/Product');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ADMIN_USER_ID = '6a3bd3e606654ce4f3b705ba';

// Upload multiple image URLs to Cloudinary and return [{url, publicId}]
async function uploadImages(urls) {
  const results = await Promise.all(
    urls.map((url) =>
      cloudinary.uploader
        .upload(url, { folder: 'smart-cart/products', resource_type: 'image' })
        .then((r) => ({ url: r.secure_url, publicId: r.public_id }))
        .catch((e) => { console.warn(`  ⚠ Failed to upload ${url}: ${e.message}`); return null; })
    )
  );
  return results.filter(Boolean);
}

// ─── EXISTING PRODUCTS TO UPDATE ────────────────────────────────────────────

const UPDATES = [
  {
    _id: '6a3bfe6be6cb9987a0081033',
    data: {
      brand: 'Noise',
      sku: 'AUD-HDPHN-AIRWAVE-MAX-6-BLK',
      discount: 5,
      tags: ['wireless', 'noise-cancelling', 'ldac', 'anc'],
      weight: { value: 304, unit: 'g' },
      dimensions: { length: 17.6, width: 17.6, height: 19.1, unit: 'cm' },
      keyFeatures: [
        'Hi-Res LDAC Audio: Experience detailed sound with deep bass and clear vocals.',
        'Dual Drivers: Enhanced depth and separation for a fuller listening experience.',
        'Adaptive ANC up to 45 dB: Block distractions for uninterrupted listening anywhere.',
        'Spatial Audio: Adds depth and dimension for a more immersive soundstage.',
        'Up to 120 Hours Playtime: Long-lasting battery for extended use without charging.',
        'Instacharge: Quick top-up for hours of playback in minutes.',
        'Low Latency up to 80 ms: Smooth audio sync for gaming and streaming.',
        'BT v5.3: Stable, efficient wireless connectivity.',
        'Comfort Cushions: Soft, ergonomic fit for all-day listening comfort.',
      ],
      specifications: [
        { key: 'Wireless Range', value: '10 m' },
        { key: 'Auto Pairing', value: 'Yes' },
        { key: 'Compatibility', value: 'Android & iOS' },
        { key: 'Playtime', value: 'Up to 120 hours' },
        { key: 'Charging Port', value: 'C-type' },
        { key: 'Water Resistance', value: 'IPX5' },
        { key: 'Fast Charge (Instacharge)', value: '10 minutes charge = 15 hours playback (at 60% volume)' },
        { key: 'Bluetooth Version', value: '5.3' },
        { key: 'Low Latency', value: '80 ms' },
      ],
    },
  },
  {
    _id: '6a3be9df1416c8f42dfa9827',
    data: {
      brand: 'Skullcandy',
      sku: 'SKL-CRUSHER-WLSS-BLK',
      discount: 10,
      tags: ['wireless', 'bass', 'skullcandy', 'haptic'],
      weight: { value: 276, unit: 'g' },
      dimensions: { length: 18.5, width: 16.0, height: 8.5, unit: 'cm' },
      keyFeatures: [
        'Adjustable Sensory Bass: Dual Sensory Haptic Bass — feel deep, adjustable bass vibrations.',
        '50 Hours Battery Life: Extended playtime for all-day listening without interruption.',
        'Rapid Charge Technology: 10-minute charge delivers 3 hours of playtime.',
        'Active Noise Isolation: Memory foam ear cushions for passive noise cancellation.',
        'Flat-Folding Design: Collapsible and travel-friendly build.',
        'AUX-In Support: Wired listening option via 3.5mm cable.',
        'Voice Assistant Compatible: Works with Siri and Google Assistant.',
        'Built-in Microphone & Controls: Easy access to volume, calls, and track selection.',
      ],
      specifications: [
        { key: 'Bluetooth Version', value: '5.0' },
        { key: 'Playtime', value: 'Up to 50 hours' },
        { key: 'Rapid Charge', value: '10 min charge = 3 hrs playback' },
        { key: 'Charging Port', value: 'Micro-USB' },
        { key: 'Bass Slider', value: 'Adjustable haptic bass' },
        { key: 'Wired Mode', value: '3.5mm AUX' },
        { key: 'Compatibility', value: 'Android & iOS' },
        { key: 'Foldable', value: 'Yes' },
      ],
    },
  },
];

// ─── NEW PRODUCTS ────────────────────────────────────────────────────────────

const NEW_PRODUCTS = [
  {
    name: 'Sony WH-1000XM5',
    description: "Sony's flagship over-ear headphones featuring industry-leading noise cancellation with two processors controlling eight microphones. Redesigned for superior comfort and audio quality with 30-hour battery life and crystal-clear hands-free calling.",
    price: 299.99, category: 'Wireless', stock: 200, brand: 'Sony',
    sku: 'SNY-WH1000XM5-BLK', discount: 10,
    tags: ['wireless', 'noise-cancelling', 'sony', 'flagship', 'ldac'],
    weight: { value: 250, unit: 'g' },
    dimensions: { length: 17.6, width: 16.8, height: 7.3, unit: 'cm' },
    keyFeatures: [
      'Industry-Leading ANC: Dual processors control 8 microphones for best-in-class noise cancellation.',
      '30-Hour Battery Life: All-day listening with ANC enabled; 40 hours without.',
      'LDAC Hi-Res Wireless: Stream high-resolution audio at up to 990 kbps.',
      'Speak-to-Chat: Automatically pauses music when you start talking.',
      'Multipoint Connection: Connect to two Bluetooth devices simultaneously.',
      'Precise Voice Pickup: AI-based noise reduction for crystal clear calls.',
      'Touch Sensor Controls: Intuitive touch panel on ear cup for easy control.',
      'Soft Fit Leather: Ultra-comfortable lightweight design for extended wear.',
    ],
    specifications: [
      { key: 'Bluetooth Version', value: '5.2' },
      { key: 'Battery Life (ANC On)', value: '30 hours' },
      { key: 'Battery Life (ANC Off)', value: '40 hours' },
      { key: 'Quick Charge', value: '3 min charge = 3 hrs playback' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'Wired Mode', value: '3.5mm AUX' },
      { key: 'Codec Support', value: 'SBC, AAC, LDAC' },
      { key: 'Water Resistance', value: 'Not rated' },
      { key: 'Drivers', value: '30mm' },
      { key: 'Compatibility', value: 'Android & iOS' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2023/10/Sony-WXM5-Headphones-Featured-Image-1-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/10/Sony-WXM5-Headhones-Hero-Image-1-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2022/05/Sony-WH-1000XM5-headband-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2022/05/Sony-WH-1000XM5-touch-control-scaled-1.jpg',
      'https://www.soundguys.com/wp-content/uploads/2022/05/sony-wh-1000xm5-hero.jpg',
    ],
  },
  {
    name: 'Bose QuietComfort 45',
    description: 'The Bose QuietComfort 45 delivers legendary Bose noise cancellation in an all-new, more refined design. With 24-hour battery life, TriPort acoustic architecture, and comfortable cushioning, it is built for all-day comfort and quiet.',
    price: 249.99, category: 'Wireless', stock: 150, brand: 'Bose',
    sku: 'BSE-QC45-BLK', discount: 15,
    tags: ['wireless', 'noise-cancelling', 'bose', 'comfort'],
    weight: { value: 238, unit: 'g' },
    dimensions: { length: 18.4, width: 15.4, height: 7.3, unit: 'cm' },
    keyFeatures: [
      'Legendary Bose ANC: World-class noise cancellation blocks distractions effortlessly.',
      '24-Hour Battery: Full day of uninterrupted quiet listening on a single charge.',
      'Quiet and Aware Modes: Switch between full noise cancellation and ambient awareness.',
      'TriPort Acoustic Architecture: Deep, immersive sound from a compact form factor.',
      'USB-C Charging: Modern fast-charging port for convenience.',
      'Multipoint Bluetooth: Seamlessly switch between two paired devices.',
      'Comfortable Cushioning: Plush ear cushions and padded headband for all-day wear.',
      'Voice Assistant Ready: Works with Alexa, Google Assistant, and Siri.',
    ],
    specifications: [
      { key: 'Bluetooth Version', value: '5.1' },
      { key: 'Battery Life', value: '24 hours' },
      { key: 'Quick Charge', value: '15 min charge = 3 hrs playback' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'Wired Mode', value: '3.5mm (2.5mm headphone jack)' },
      { key: 'Noise Cancellation', value: 'Active (Quiet Mode)' },
      { key: 'Transparency Mode', value: 'Yes (Aware Mode)' },
      { key: 'Compatibility', value: 'Android & iOS' },
      { key: 'Weight', value: '238 g' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2021/10/SG_Bose-QC-45_5.jpg',
      'https://www.soundguys.com/wp-content/uploads/2021/10/SG_Bose-QC-45_9.jpg',
      'https://www.soundguys.com/wp-content/uploads/2021/10/SG_Bose-QC-45_13.jpg',
      'https://www.soundguys.com/wp-content/uploads/2021/10/SG_Bose-QC-45_8.jpg',
      'https://clearbuy-cloud.nyc3.digitaloceanspaces.com/media/3957/Bose-Quietcomfort-45.jpg',
    ],
  },
  {
    name: 'Sennheiser Momentum 4 Wireless',
    description: 'The Sennheiser Momentum 4 Wireless combines audiophile-grade sound with a staggering 60-hour battery life and adaptive noise cancellation. Built for the discerning listener who values natural, detailed audio over heavily processed sound.',
    price: 279.99, category: 'Wireless', stock: 120, brand: 'Sennheiser',
    sku: 'SEN-MOMENTUM4-BLK', discount: 5,
    tags: ['wireless', 'noise-cancelling', 'sennheiser', 'audiophile', 'ldac'],
    weight: { value: 293, unit: 'g' },
    dimensions: { length: 18.0, width: 16.5, height: 8.0, unit: 'cm' },
    keyFeatures: [
      '60-Hour Battery: Industry-leading battery life with ANC enabled.',
      'Adaptive ANC: Automatically adjusts noise cancellation to your environment.',
      'LDAC Support: High-resolution wireless audio for uncompromised quality.',
      'Smart Pause: Automatically pauses playback when headphones are removed.',
      'Transparent Hearing: Stay aware of your surroundings with a tap.',
      'Sennheiser Sound: Natural, balanced audio tuning straight out of the box.',
      'Foldable Design: Compact fold for easy storage and travel.',
      'Customizable via App: Fine-tune EQ and ANC with the Sennheiser Smart Control app.',
    ],
    specifications: [
      { key: 'Bluetooth Version', value: '5.2' },
      { key: 'Battery Life (ANC On)', value: '60 hours' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'Wired Mode', value: '3.5mm AUX' },
      { key: 'Codec Support', value: 'SBC, AAC, aptX, aptX Adaptive, LDAC' },
      { key: 'Multipoint', value: 'Yes (2 devices)' },
      { key: 'Transparency Mode', value: 'Yes' },
      { key: 'App Support', value: 'Sennheiser Smart Control' },
      { key: 'Foldable', value: 'Yes' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2022/08/sennheiser-momentum-4-wireless-stand-1-e1661526609208.jpg',
      'https://www.soundguys.com/wp-content/uploads/2022/08/sennheiser-momentum-4-wireless-connection.jpg',
      'https://www.soundguys.com/wp-content/uploads/2022/08/sennheiser-momentum-4-wireless-yoke-e1661526329885.jpg',
      'https://www.soundguys.com/wp-content/uploads/2022/08/sennheiser-momentum-4-wireless-pads-e1661526356769.jpg',
      'https://www.soundguys.com/wp-content/uploads/2022/08/sennheiser-momentum-4-wireless-wear-e1661526444346.jpg',
    ],
  },
  {
    name: 'Sony WF-1000XM5',
    description: "Sony's flagship true wireless earbuds with the world's smallest and lightest ANC earbuds design. Features the V2 processor and integrated processor QN2e for unrivalled noise cancellation and superior sound quality.",
    price: 249.99, category: 'Earbuds', stock: 180, brand: 'Sony',
    sku: 'SNY-WF1000XM5-BLK', discount: 8,
    tags: ['wireless', 'earbuds', 'noise-cancelling', 'sony', 'ldac'],
    weight: { value: 5.9, unit: 'g' },
    dimensions: { length: 3.0, width: 2.7, height: 2.4, unit: 'cm' },
    keyFeatures: [
      'Industry-Leading ANC: Dual chip processing delivers class-leading noise cancellation in earbuds.',
      '8+16 Hour Battery: 8 hrs on earbuds, 16 hrs extra from the charging case.',
      'LDAC Hi-Res Wireless: Up to 990 kbps high-resolution audio streaming.',
      'Speak-to-Chat: Automatically pauses music when you start talking.',
      'IPX4 Water Resistance: Splash-proof for workouts and light rain.',
      'Bluetooth 5.3: Stable multipoint connection to two devices simultaneously.',
      'DSEE Extreme: AI upscales compressed digital music in real-time.',
      'Precise Voice Pickup: Crystal clear calls in noisy environments.',
    ],
    specifications: [
      { key: 'Bluetooth Version', value: '5.3' },
      { key: 'Battery Life (Earbuds)', value: '8 hours (ANC on)' },
      { key: 'Battery Life (Case)', value: '16 hours additional' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'Wireless Charging', value: 'Yes (Qi)' },
      { key: 'Codec Support', value: 'SBC, AAC, LDAC' },
      { key: 'Water Resistance', value: 'IPX4' },
      { key: 'Driver Size', value: '8.4mm' },
      { key: 'Multipoint', value: 'Yes (2 devices)' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2023/07/DSC09557-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/07/DSC09583-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/07/DSC09563-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/07/DSC09596-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/07/DSC09556-scaled.jpg',
    ],
  },
  {
    name: 'Beats Studio Pro',
    description: 'Beats Studio Pro redefines professional wireless headphones with USB-C lossless audio, personalized spatial audio with head tracking, and up to 40 hours of battery life. The first Beats headphones to support USB audio passthrough.',
    price: 199.99, category: 'Wireless', stock: 200, brand: 'Beats',
    sku: 'BTS-STUDIOPRO-BLK', discount: 20,
    tags: ['wireless', 'noise-cancelling', 'beats', 'apple', 'spatial-audio'],
    weight: { value: 260, unit: 'g' },
    dimensions: { length: 19.0, width: 17.0, height: 8.5, unit: 'cm' },
    keyFeatures: [
      'USB-C Audio Passthrough: Listen losslessly via USB-C — unique to any Beats product.',
      '40-Hour Battery Life: All-day, all-night listening on a single charge.',
      'Personalized Spatial Audio: Immersive, theatre-like sound with dynamic head tracking.',
      'ANC & Transparency Mode: Block out the world or let it in with a single tap.',
      'Multipoint Connection: Switch seamlessly between Apple and Android devices.',
      'Bluetooth 5.3: Fast, efficient, and stable wireless connectivity.',
      'Built-in Voice Assistant: One-touch access to Siri or Google Assistant.',
      'Foldable Design: Compact fold for easy portability.',
    ],
    specifications: [
      { key: 'Bluetooth Version', value: '5.3' },
      { key: 'Battery Life', value: '40 hours (ANC on)' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'USB Audio', value: 'Yes (lossless via USB-C)' },
      { key: 'Wired Mode', value: '3.5mm AUX' },
      { key: 'Codec Support', value: 'SBC, AAC' },
      { key: 'Spatial Audio', value: 'Yes (with head tracking)' },
      { key: 'Foldable', value: 'Yes' },
      { key: 'Compatibility', value: 'Android & iOS (Apple optimized)' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2023/07/beats-studio-pro-miss-the-mark.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/07/beats-studio-pro-band.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/07/beats-studio-pro-contents.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/07/beats-studio-pro-controls-e1690900939149.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/07/beats-studio-pro-reverse-e1690900885278.jpg',
    ],
  },
  {
    name: 'Anker Soundcore Space Q45',
    description: 'The Soundcore Space Q45 delivers premium ANC performance and LDAC hi-res audio at a fraction of flagship prices. With up to 50 hours of battery life and adaptive noise cancellation, it punches well above its weight class.',
    price: 79.99, category: 'Wireless', stock: 400, brand: 'Soundcore',
    sku: 'SCR-SPACEQ45-BLK', discount: 5,
    tags: ['wireless', 'noise-cancelling', 'budget', 'anker', 'ldac'],
    weight: { value: 273, unit: 'g' },
    dimensions: { length: 18.5, width: 16.0, height: 8.0, unit: 'cm' },
    keyFeatures: [
      'Adaptive ANC: Three ANC modes automatically adapt to your environment.',
      '50-Hour Battery with ANC: Outstanding battery life at this price point.',
      'LDAC Hi-Res Wireless: High-resolution audio up to 990 kbps.',
      'Transparency Mode: Stay aware of your surroundings safely.',
      'Multipoint Connection: Connect to two devices simultaneously.',
      'Custom EQ via App: Fine-tune your sound with the Soundcore app.',
      'Foldable Design: Flat-fold design for easy packing and travel.',
      'USB-C Charging: Quick charge — 5 mins gives 4 hours of playtime.',
    ],
    specifications: [
      { key: 'Bluetooth Version', value: '5.3' },
      { key: 'Battery Life (ANC On)', value: '50 hours' },
      { key: 'Battery Life (ANC Off)', value: '65 hours' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'Quick Charge', value: '5 min = 4 hrs playback' },
      { key: 'Codec Support', value: 'SBC, AAC, LDAC' },
      { key: 'Wired Mode', value: '3.5mm AUX' },
      { key: 'Foldable', value: 'Yes' },
      { key: 'App Support', value: 'Soundcore App (iOS & Android)' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2022/08/ANKER_SOUNDCORE_Q45-1-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2022/08/ANKER_SOUNDCORE_Q45-6-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2022/08/ANKER_SOUNDCORE_Q45-3-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2022/08/ANKER_SOUNDCORE_Q45-8-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2022/08/ANKER_SOUNDCORE_Q45-2-scaled-e1662164828883.jpg',
    ],
  },
  {
    name: 'Audio-Technica ATH-M50xBT2',
    description: 'The ATH-M50xBT2 brings the legendary studio monitoring performance of the ATH-M50x to wireless, adding LDAC support and nearly 65 hours of battery life. The go-to choice for producers, engineers, and audiophiles who want studio accuracy untethered.',
    price: 149.99, category: 'Wireless', stock: 250, brand: 'Audio-Technica',
    sku: 'AT-ATHM50XBT2-BLK', discount: 0,
    tags: ['wireless', 'studio', 'audio-technica', 'ldac', 'monitoring'],
    weight: { value: 307, unit: 'g' },
    dimensions: { length: 18.0, width: 16.5, height: 8.5, unit: 'cm' },
    keyFeatures: [
      '65-Hour Battery: Best-in-class battery life for uninterrupted studio sessions.',
      'LDAC Support: Wireless hi-res audio streaming at up to 990 kbps.',
      'Studio-Tuned 45mm Drivers: The same acclaimed drivers from the wired ATH-M50x.',
      'USB-C Charging: Modern, fast charging with 10 min = 180 min playback.',
      'Foldable Design: Collapsible ear cups for compact storage in the included pouch.',
      'Multipoint Bluetooth: Connect to two devices simultaneously.',
      'Low-Latency Mode: Improved sync for video and gaming content.',
      'App Control: Manage settings and EQ via the A-T Connect app.',
    ],
    specifications: [
      { key: 'Bluetooth Version', value: '5.0' },
      { key: 'Battery Life', value: 'Up to 65 hours' },
      { key: 'Quick Charge', value: '10 min = 180 min playback' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'Wired Mode', value: '3.5mm AUX' },
      { key: 'Codec Support', value: 'SBC, AAC, LDAC' },
      { key: 'Driver Size', value: '45mm' },
      { key: 'Foldable', value: 'Yes' },
      { key: 'App Support', value: 'A-T Connect (iOS & Android)' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2021/10/audio-technica-ath-m50xbt2-bench-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2021/10/audio-technica-ath-m50xbt2-on-head-buttons1-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2021/10/audio-technica-ath-m50xbt2-accesories-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2021/10/audio-technica-ath-m50xbt2-ear-cushion-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2021/10/audio-technica-ath-m50xbt2-glam-scaled.jpg',
    ],
  },
  {
    name: 'Apple AirPods Max',
    description: "Apple's premium over-ear headphones combining the H2 chip's computational audio with an aluminum mesh canopy, memory foam ear cushions, and stainless steel headband. Delivers the deepest integration in the Apple ecosystem with Personalized Spatial Audio and Transparency mode.",
    price: 549.99, category: 'Wireless', stock: 80, brand: 'Apple',
    sku: 'APL-AIRPODSMAX-USB-C', discount: 0,
    tags: ['wireless', 'noise-cancelling', 'apple', 'premium', 'spatial-audio'],
    weight: { value: 385, unit: 'g' },
    dimensions: { length: 18.7, width: 16.8, height: 8.3, unit: 'cm' },
    keyFeatures: [
      'H2 Chip ANC: Apple H2 chip delivers computational noise cancellation across all frequencies.',
      'Personalized Spatial Audio: Dynamic head tracking for a cinema-like listening experience.',
      'Transparency Mode: Lets in exactly the right amount of outside sound.',
      '20-Hour Battery: Up to 20 hours of listening with ANC and Spatial Audio.',
      'Lossless Audio: 4 hours charge gives access to Apple Lossless via USB-C.',
      'Digital Crown: Precision volume control and effortless navigation.',
      'Aluminum Mesh Canopy: Distributes weight for a comfortable, balanced fit.',
      'Automatic Switching: Moves audio seamlessly between Apple devices.',
    ],
    specifications: [
      { key: 'Chip', value: 'Apple H2' },
      { key: 'Bluetooth Version', value: '5.3' },
      { key: 'Battery Life', value: '20 hours (ANC + Spatial Audio)' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'Lossless Audio', value: 'Yes (via USB-C cable)' },
      { key: 'Spatial Audio', value: 'Yes (with dynamic head tracking)' },
      { key: 'Transparency Mode', value: 'Yes' },
      { key: 'Water Resistance', value: 'Not rated' },
      { key: 'Compatibility', value: 'Apple ecosystem optimized; Bluetooth for Android' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2020/12/Apple-AirPods-Max-06-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2020/12/Apple-AirPods-Max-23-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2020/12/Apple-AirPods-Max-03-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2020/12/Apple-AirPods-Max-11-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2024/12/Airpods-Max-USB-C-Lilac-1-1.jpg',
    ],
  },
  {
    name: 'JBL Live 660NC',
    description: 'The JBL Live 660NC is an everyday wireless headphone with JBL Signature Sound, adaptive noise cancellation, and a 50-hour battery. Reliable, versatile, and packed with features at a mid-range price.',
    price: 99.99, category: 'Wireless', stock: 300, brand: 'JBL',
    sku: 'JBL-LIVE660NC-BLK', discount: 10,
    tags: ['wireless', 'noise-cancelling', 'jbl', 'everyday'],
    weight: { value: 244, unit: 'g' },
    dimensions: { length: 17.5, width: 16.5, height: 7.8, unit: 'cm' },
    keyFeatures: [
      '50-Hour Battery: Extended listening with up to 50 hours on a single charge.',
      'JBL Adaptive Noise Cancellation: Smart ANC that adjusts to your environment automatically.',
      'Voice Aware: Lets voices through at the tap of a button.',
      'Hands-Free Voice Assistant: Instant access to Alexa, Google Assistant, or Siri.',
      'USB-C Charging: Fast charge for modern convenience.',
      'Foldable Design: Flat-fold for compact storage with included carry pouch.',
      'JBL Signature Sound: Powerful bass and balanced mids and highs.',
      'JBL Headphones App: Full EQ customisation and ANC controls.',
    ],
    specifications: [
      { key: 'Bluetooth Version', value: '5.0' },
      { key: 'Battery Life', value: '50 hours (ANC on)' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'Wired Mode', value: '3.5mm AUX' },
      { key: 'Voice Aware', value: 'Yes' },
      { key: 'Foldable', value: 'Yes' },
      { key: 'App Support', value: 'JBL Headphones App' },
      { key: 'Compatibility', value: 'Android & iOS' },
      { key: 'Weight', value: '244 g' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2023/02/JBL-Live-660NC-flat-shot-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/02/JBL-Live-660NC-stand-shot-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/02/JBL-Live-660NC-headshot-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/02/JBL-Live-660NC-controls-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/02/JBL-Live-660NC-music-phone-scaled.jpg',
    ],
  },
  {
    name: 'Marshall Monitor II ANC',
    description: "Marshall's Monitor II ANC brings the iconic rock-and-roll aesthetic to premium wireless headphones. Featuring active noise cancellation, 30-hour battery, and a signature gold knob for intuitive control, built for those who want to stand out.",
    price: 249.99, category: 'Wireless', stock: 100, brand: 'Marshall',
    sku: 'MAR-MONITOR2ANC-BLK', discount: 25,
    tags: ['wireless', 'noise-cancelling', 'marshall', 'premium', 'retro'],
    weight: { value: 290, unit: 'g' },
    dimensions: { length: 18.0, width: 17.0, height: 8.5, unit: 'cm' },
    keyFeatures: [
      'Marshall Signature ANC: Active noise cancellation for focused listening anywhere.',
      '30-Hour Battery with ANC: Full day and night listening on a single charge.',
      'Iconic Knob Control: Gold multi-directional knob for volume and playback.',
      '3-Band Custom EQ: Shape your sound with bass, mid, and treble adjustments.',
      'Custom Ambient Sound Mode: Control how much outside sound you hear.',
      'Bluetooth 5.0: Stable wireless connection up to 10m.',
      '3.5mm Wired Mode: Enjoy music even when battery runs out.',
      'Foldable Design: Classic Marshall folding design for easy portability.',
    ],
    specifications: [
      { key: 'Bluetooth Version', value: '5.0' },
      { key: 'Battery Life (ANC On)', value: '30 hours' },
      { key: 'Battery Life (ANC Off)', value: '45 hours' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'Wired Mode', value: '3.5mm AUX' },
      { key: 'EQ', value: '3-band custom EQ' },
      { key: 'Codec Support', value: 'SBC, AAC, aptX' },
      { key: 'Foldable', value: 'Yes' },
      { key: 'Wireless Range', value: '10 m' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2020/03/Marshall-Monitor-II-ANC-5.jpg',
      'https://www.soundguys.com/wp-content/uploads/2020/03/Marshall-Monitor-II-ANC-1.jpg',
      'https://www.soundguys.com/wp-content/uploads/2020/03/Marshall-Monitor-II-ANC-8.jpg',
      'https://www.soundguys.com/wp-content/uploads/2020/03/Marshall-Monitor-II-ANC-4.jpg',
      'https://www.soundguys.com/wp-content/uploads/2020/03/Marshall-Monitor-II-ANC-7.jpg',
    ],
  },
  {
    name: 'Jabra Evolve2 85',
    description: 'The Jabra Evolve2 85 is a professional-grade wireless headset designed for enterprise users and remote workers. Featuring a retractable boom mic, 37-hour battery, and class-leading ANC, it excels equally in conference calls and personal listening.',
    price: 379.99, category: 'Wireless', stock: 60, brand: 'Jabra',
    sku: 'JAB-EV285-BLK', discount: 0,
    tags: ['wireless', 'noise-cancelling', 'jabra', 'professional', 'work', 'enterprise'],
    weight: { value: 349, unit: 'g' },
    dimensions: { length: 19.5, width: 18.0, height: 9.0, unit: 'cm' },
    keyFeatures: [
      'Retractable Boom Mic: Professional-grade microphone flips down for calls, up for music.',
      '37-Hour Battery: Full workday and beyond on a single charge.',
      'Class-Leading ANC: 10-microphone ANC system for total focus in open offices.',
      'Jabra Advanced ANC: Three ANC levels to match your environment.',
      'Multipoint Bluetooth: Connect to laptop and phone simultaneously.',
      'Busy Light: Built-in LED signals when you are on a call — Do Not Disturb.',
      'Jabra Sound+ App: Personalise sound, ANC, and call settings.',
      'UC & MS Certified: Works optimally with Teams, Zoom, and all major UC platforms.',
    ],
    specifications: [
      { key: 'Bluetooth Version', value: '5.2' },
      { key: 'Battery Life', value: '37 hours (ANC on)' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'Microphone', value: 'Retractable boom + 6 beamforming mics' },
      { key: 'Codec Support', value: 'SBC, AAC, aptX Adaptive' },
      { key: 'UC Certified', value: 'Microsoft Teams, Zoom, Google Meet' },
      { key: 'Busy Light', value: 'Yes (integrated LED)' },
      { key: 'App Support', value: 'Jabra Sound+' },
      { key: 'Multipoint', value: 'Yes (2 devices)' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2023/02/Jabra-Evolve2-85-Hero-Image-5-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/02/Jabra-Evolve2-85-Featured-Image-1-scaled-e1677185294339.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/02/Jabra-Evolve2-85-Buttons-Image-1-scaled-e1677185622594.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/02/Jabra-Evolve2-85-Microphone-Image-1-scaled-e1677185657677.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/02/Jabra-Evolve2-85-Hero-Image-2-scaled-e1677185683193.jpg',
    ],
  },
  {
    name: 'Skullcandy Crusher ANC 2',
    description: 'The Crusher ANC 2 combines Skullcandy\'s signature haptic bass experience with active noise cancellation, personal sound by Mimi, and 60 hours of battery. Designed for bass heads who also want silence.',
    price: 149.99, category: 'Wireless', stock: 200, brand: 'Skullcandy',
    sku: 'SKL-CRANC2-BLK', discount: 10,
    tags: ['wireless', 'noise-cancelling', 'skullcandy', 'bass', 'haptic'],
    weight: { value: 280, unit: 'g' },
    dimensions: { length: 18.5, width: 17.0, height: 8.5, unit: 'cm' },
    keyFeatures: [
      'Multi-Sensory Haptic Bass: Adjustable haptic drivers let you feel the bass as well as hear it.',
      '60-Hour Battery with ANC: Among the best battery life in its class.',
      'Active Noise Cancellation: 4 external microphones cancel ambient noise intelligently.',
      'Personal Sound by Mimi: Custom sound calibration based on your hearing profile.',
      'Skull-iQ Smart Feature: Voice control for Siri, Google, Alexa, and Skullcandy features.',
      'Stay-Aware Mode: Transparency mode for situational awareness.',
      'Bluetooth 5.2: Reliable multipoint connection to two devices.',
      'Quick Charge: 10 minutes charge = 4 hours playback.',
    ],
    specifications: [
      { key: 'Bluetooth Version', value: '5.2' },
      { key: 'Battery Life (ANC On)', value: '60 hours' },
      { key: 'Quick Charge', value: '10 min = 4 hrs playback' },
      { key: 'Charging Port', value: 'USB-C' },
      { key: 'Wired Mode', value: '3.5mm AUX' },
      { key: 'Haptic Bass Slider', value: 'Adjustable (0–100%)' },
      { key: 'Personal Sound', value: 'Yes (Mimi Technology)' },
      { key: 'Multipoint', value: 'Yes (2 devices)' },
      { key: 'Foldable', value: 'Yes' },
    ],
    imageUrls: [
      'https://www.soundguys.com/wp-content/uploads/2023/05/skullcandy-crusher-anc-2-centered-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/05/skullcandy-crusher-anc-2-in-case-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/05/skullcandy-crusher-anc-2-on-ears-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/05/skullcandy-crusher-anc-2-controls-scaled.jpg',
      'https://www.soundguys.com/wp-content/uploads/2023/05/skullcandy-crusher-anc-2-with-phone-scaled.jpg',
    ],
  },
];

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected\n');

  // 1. Update existing products
  console.log('── Updating existing products ──');
  for (const { _id, data } of UPDATES) {
    const product = await Product.findById(_id);
    if (!product) { console.log(`  ✗ Not found: ${_id}`); continue; }
    Object.assign(product, data);
    await product.save({ validateBeforeSave: false });
    console.log(`  ✓ Updated: ${product.name}`);
  }

  // 2. Insert new products (skip if SKU already exists)
  console.log('\n── Adding new products ──');
  for (const p of NEW_PRODUCTS) {
    const exists = await Product.findOne({ sku: p.sku });
    if (exists) { console.log(`  ↷ Skipped (already exists): ${p.name}`); continue; }

    console.log(`  ↑ Uploading images for: ${p.name}`);
    const images = await uploadImages(p.imageUrls);

    if (images.length === 0) {
      console.log(`  ✗ No images uploaded for ${p.name}, skipping.`);
      continue;
    }

    const { imageUrls, ...productData } = p;
    await Product.create({ ...productData, images, createdBy: ADMIN_USER_ID });
    console.log(`  ✓ Added: ${p.name} (${images.length} images)`);
  }

  console.log('\n✅ Seed complete.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
