import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

// ── Unsplash image helpers (real CDN URLs) ────────────────────────────────────
const IMGS = {
  // Vegetables
  tomato:      'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&h=600&fit=crop',
  microgreens: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&h=600&fit=crop',
  spinach:     'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&h=600&fit=crop',
  carrot:      'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&h=600&fit=crop',
  broccoli:    'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=600&h=600&fit=crop',
  cucumber:    'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=600&h=600&fit=crop',
  // Honey & sweeteners
  honey:       'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&h=600&fit=crop',
  jaggery:     'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&h=600&fit=crop',
  dates:       'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&h=600&fit=crop',
  // Fruits
  mango:       'https://images.unsplash.com/photo-1601493700631-2851bdcb6b4b?w=600&h=600&fit=crop',
  strawberry:  'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&h=600&fit=crop',
  banana:      'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&h=600&fit=crop',
  pomegranate: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&h=600&fit=crop',
  // Super foods
  chia:        'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=600&h=600&fit=crop',
  quinoa:      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=600&fit=crop',
  flaxseed:    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=600&fit=crop',
  moringa:     'https://images.unsplash.com/photo-1564671165093-20688ff1fffa?w=600&h=600&fit=crop',
  // Frozen snacks
  samosa:      'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=600&fit=crop',
  rolls:       'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop',
  // Herbs & spices
  turmeric:    'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&h=600&fit=crop',
  ginger:      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&h=600&fit=crop',
  coriander:   'https://images.unsplash.com/photo-1515586000433-45406d8e6662?w=600&h=600&fit=crop',
  garlic:      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&h=600&fit=crop',
};

async function main() {
  console.log('🌱 Seeding database...');

  // ── Site Settings ────────────────────────────────────────────────────────
  await prisma.siteSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      storeName: 'Organic Harvest',
      whatsappNumber: '8801712345678',
      phone: '01712345678',
      email: 'info@organicharvest.com',
      address: 'Dhaka, Bangladesh',
      heroTitle: 'Eat Pure, Eat Organic',
      heroSubtitle: 'Fresh from the farm to your table',
    },
  });

  // ── Delivery Config ──────────────────────────────────────────────────────
  await prisma.deliveryConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      insideDhaka: 60,
      outsideDhaka: 100,
      freeDeliveryAt: 1000,
    },
  });

  // ── Admin User ───────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Admin@1234', 10);
  await prisma.user.upsert({
    where: { phone: '01700000000' },
    update: {},
    create: {
      name: 'Admin',
      phone: '01700000000',
      email: 'admin@organicharvest.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // ── Brands ───────────────────────────────────────────────────────────────
  console.log('  → Creating brands...');
  const [greenvalley, pureroot, sunsoil, freshstream, urbanapiary, earthly, naturebite] =
    await Promise.all([
      prisma.brand.upsert({ where: { slug: 'greenvalley' },  update: {}, create: { name: 'GreenValley',  slug: 'greenvalley'  } }),
      prisma.brand.upsert({ where: { slug: 'pureroot' },     update: {}, create: { name: 'PureRoot',     slug: 'pureroot'     } }),
      prisma.brand.upsert({ where: { slug: 'sunsoil' },      update: {}, create: { name: 'SunSoil',      slug: 'sunsoil'      } }),
      prisma.brand.upsert({ where: { slug: 'freshstream' },  update: {}, create: { name: 'FreshStream',  slug: 'freshstream'  } }),
      prisma.brand.upsert({ where: { slug: 'urbanapiary' },  update: {}, create: { name: 'UrbanApiary',  slug: 'urbanapiary'  } }),
      prisma.brand.upsert({ where: { slug: 'earthly-farms' },update: {}, create: { name: 'Earthly Farms',slug: 'earthly-farms'} }),
      prisma.brand.upsert({ where: { slug: 'naturebite' },   update: {}, create: { name: 'NatureBite',   slug: 'naturebite'   } }),
    ]);

  // ── Categories ───────────────────────────────────────────────────────────
  console.log('  → Creating categories...');
  const [vegCat, honeyCat, frozenCat, superCat, fruitCat, herbCat] = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'fresh-vegetables' },
      update: {},
      create: { name: 'Fresh Vegetables', slug: 'fresh-vegetables', image: IMGS.spinach,   description: 'Farm-fresh organic vegetables harvested daily.',  sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { slug: 'organic-honey' },
      update: {},
      create: { name: 'Honey & Sweeteners', slug: 'organic-honey', image: IMGS.honey,     description: 'Pure organic honey and natural sweeteners.',       sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { slug: 'frozen-snacks' },
      update: {},
      create: { name: 'Frozen Snacks',    slug: 'frozen-snacks',   image: IMGS.samosa,    description: 'Healthy, preservative-free frozen snack options.',  sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { slug: 'super-foods' },
      update: {},
      create: { name: 'Super Foods',      slug: 'super-foods',     image: IMGS.chia,      description: 'Nutrient-dense superfoods for optimal health.',     sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { slug: 'fruits' },
      update: {},
      create: { name: 'Fruits',           slug: 'fruits',          image: IMGS.mango,     description: 'Seasonal and exotic organic fruits.',               sortOrder: 5 },
    }),
    prisma.category.upsert({
      where: { slug: 'herbs-spices' },
      update: {},
      create: { name: 'Herbs & Spices',   slug: 'herbs-spices',    image: IMGS.coriander, description: 'Fresh and dried organic herbs and spices.',         sortOrder: 6 },
    }),
  ]);

  // ── Products ─────────────────────────────────────────────────────────────
  console.log('  → Creating products...');

  const productData = [
    // ── Fresh Vegetables ──────────────────────────────────────────────────
    {
      name: 'Heirloom Rainbow Tomatoes 1kg',
      slug: 'heirloom-rainbow-tomatoes-1kg',
      description: 'A stunning mix of heirloom tomato varieties — red, yellow, and purple — bursting with rich flavour and nutrients. Grown without pesticides on certified organic farms.',
      price: 88, comparePrice: 110, images: [IMGS.tomato],
      stock: 50, weight: '1kg', isOrganic: true, isFeatured: true, isNewArrival: true,
      rating: 4.5, reviewCount: 32, categoryId: vegCat.id, brandId: greenvalley.id,
    },
    {
      name: 'Hydroponic Micro Greens 200g',
      slug: 'hydroponic-micro-greens-200g',
      description: 'Tender micro greens grown hydroponically without any soil pesticides. Packed with vitamins C, E, and K. Perfect for salads, sandwiches, and smoothies.',
      price: 55, images: [IMGS.microgreens],
      stock: 30, weight: '200g', isOrganic: true, isFeatured: true,
      rating: 4.3, reviewCount: 18, categoryId: vegCat.id,
    },
    {
      name: 'Organic Baby Spinach 500g',
      slug: 'organic-baby-spinach-500g',
      description: 'Tender young spinach leaves harvested before full maturity for maximum nutritional benefit. Certified organic and washed ready to eat.',
      price: 65, comparePrice: 80, images: [IMGS.spinach],
      stock: 45, weight: '500g', isOrganic: true, isFeatured: true,
      rating: 4.7, reviewCount: 41, categoryId: vegCat.id, brandId: pureroot.id,
    },
    {
      name: 'Farm Fresh Carrots 1kg',
      slug: 'farm-fresh-carrots-1kg',
      description: 'Sweet, crunchy organic carrots straight from our partner farms in Munshiganj. High in beta-carotene and natural antioxidants.',
      price: 45, images: [IMGS.carrot],
      stock: 80, weight: '1kg', isOrganic: true,
      rating: 4.2, reviewCount: 15, categoryId: vegCat.id, brandId: earthly.id,
    },
    {
      name: 'Organic Broccoli 500g',
      slug: 'organic-broccoli-500g',
      description: 'Fresh organic broccoli florets, rich in vitamins and minerals. Air-flown within 24 hours of harvest to ensure maximum freshness.',
      price: 120, comparePrice: 150, images: [IMGS.broccoli],
      stock: 25, weight: '500g', isOrganic: true, isNewArrival: true,
      rating: 4.6, reviewCount: 22, categoryId: vegCat.id, brandId: greenvalley.id,
    },
    {
      name: 'Green Cucumber 1kg',
      slug: 'green-cucumber-1kg',
      description: 'Cool, crisp organic cucumbers. Perfect for salads, raita, or eating raw. Pesticide-free and farm-fresh.',
      price: 40, images: [IMGS.cucumber],
      stock: 60, weight: '1kg', isOrganic: false,
      rating: 4.0, reviewCount: 10, categoryId: vegCat.id,
    },

    // ── Honey & Sweeteners ────────────────────────────────────────────────
    {
      name: 'Premium Date Jaggery 1kg',
      slug: 'premium-date-jaggery-1kg',
      description: 'Pure khejurer gur (date palm jaggery) made from fresh date palm sap, traditionally harvested in the winter months of Bangladesh. A cultural treasure.',
      price: 700, comparePrice: 850, images: [IMGS.jaggery],
      stock: 100, weight: '1kg', isOrganic: true, isFeatured: true,
      rating: 4.8, reviewCount: 196, whatsappText: 'I want to order Premium Date Jaggery 1kg',
      categoryId: honeyCat.id, brandId: urbanapiary.id,
    },
    {
      name: 'Raw Sundarban Forest Honey 500g',
      slug: 'raw-sundarban-forest-honey-500g',
      description: 'Authentic wild honey sourced directly from the Sundarban mangrove forests. Unfiltered, unpasteurized, and packed with natural enzymes and antioxidants.',
      price: 850, comparePrice: 1000, images: [IMGS.honey],
      stock: 40, weight: '500g', isOrganic: true, isFeatured: true, isNewArrival: true,
      rating: 4.9, reviewCount: 87,
      categoryId: honeyCat.id, brandId: urbanapiary.id,
    },
    {
      name: 'Organic Medjool Dates 500g',
      slug: 'organic-medjool-dates-500g',
      description: 'Premium Medjool dates — the king of dates. Naturally sweet, soft, and caramel-like in flavour. Imported and stored at optimal temperature.',
      price: 600, comparePrice: 720, images: [IMGS.dates],
      stock: 55, weight: '500g', isOrganic: true,
      rating: 4.7, reviewCount: 52,
      categoryId: honeyCat.id, brandId: freshstream.id,
    },

    // ── Frozen Snacks ─────────────────────────────────────────────────────
    {
      name: 'Organic Vegetable Samosa 12pcs',
      slug: 'organic-vegetable-samosa-12pcs',
      description: 'Crispy samosas filled with a spiced mix of organic peas and potatoes. No preservatives, no artificial colours. Bake or air-fry in 15 minutes.',
      price: 180, comparePrice: 220, images: [IMGS.samosa],
      stock: 70, weight: '360g', isOrganic: true, isFeatured: true, isNewArrival: true,
      rating: 4.4, reviewCount: 38,
      categoryId: frozenCat.id, brandId: naturebite.id,
    },
    {
      name: 'Spring Rolls Chicken 10pcs',
      slug: 'spring-rolls-chicken-10pcs',
      description: 'Golden crispy spring rolls with a flavourful chicken and vegetable filling. Free from MSG and artificial additives. Ready in 10 minutes.',
      price: 220, comparePrice: 260, images: [IMGS.rolls],
      stock: 50, weight: '400g', isOrganic: false, isFeatured: true,
      rating: 4.2, reviewCount: 27,
      categoryId: frozenCat.id, brandId: naturebite.id,
    },

    // ── Super Foods ───────────────────────────────────────────────────────
    {
      name: 'Organic Chia Seeds 250g',
      slug: 'organic-chia-seeds-250g',
      description: 'Premium quality organic chia seeds — an excellent source of omega-3 fatty acids, fibre, protein, and calcium. Perfect for smoothies, puddings, and baking.',
      price: 290, comparePrice: 350, images: [IMGS.chia],
      stock: 90, weight: '250g', isOrganic: true, isFeatured: true,
      rating: 4.6, reviewCount: 74,
      categoryId: superCat.id, brandId: pureroot.id,
    },
    {
      name: 'White Quinoa 500g',
      slug: 'white-quinoa-500g',
      description: 'Certified organic white quinoa — a complete protein source containing all 9 essential amino acids. Gluten-free and incredibly versatile.',
      price: 380, comparePrice: 450, images: [IMGS.quinoa],
      stock: 60, weight: '500g', isOrganic: true, isFeatured: true,
      rating: 4.5, reviewCount: 55,
      categoryId: superCat.id, brandId: sunsoil.id,
    },
    {
      name: 'Golden Flaxseed 500g',
      slug: 'golden-flaxseed-500g',
      description: 'Cold-milled golden flaxseeds rich in omega-3s, lignans, and dietary fibre. Supports heart health, digestion, and hormone balance.',
      price: 200, images: [IMGS.flaxseed],
      stock: 75, weight: '500g', isOrganic: true, isNewArrival: true,
      rating: 4.3, reviewCount: 31,
      categoryId: superCat.id, brandId: pureroot.id,
    },
    {
      name: 'Organic Moringa Powder 150g',
      slug: 'organic-moringa-powder-150g',
      description: 'Pure moringa leaf powder from certified organic farms. Contains 92 nutrients and 46 antioxidants. Called the "miracle tree" for good reason.',
      price: 350, comparePrice: 420, images: [IMGS.moringa],
      stock: 45, weight: '150g', isOrganic: true, isFeatured: true, isNewArrival: true,
      rating: 4.7, reviewCount: 63,
      categoryId: superCat.id, brandId: earthly.id,
    },

    // ── Fruits ───────────────────────────────────────────────────────────
    {
      name: 'Organic Himsagar Mango 1kg',
      slug: 'organic-himsagar-mango-1kg',
      description: 'The legendary Himsagar — considered the finest mango in Bangladesh. Grown organically in Rajshahi. Sweet, fiberless, and incredibly aromatic.',
      price: 380, comparePrice: 460, images: [IMGS.mango],
      stock: 35, weight: '1kg', isOrganic: true, isFeatured: true, isNewArrival: true,
      rating: 4.9, reviewCount: 112,
      categoryId: fruitCat.id, brandId: greenvalley.id,
    },
    {
      name: 'Fresh Strawberries 250g',
      slug: 'fresh-strawberries-250g',
      description: 'Plump, juicy organic strawberries grown in the hills of Sylhet. Naturally sweet with no artificial ripening agents. Best within 3 days.',
      price: 280, comparePrice: 330, images: [IMGS.strawberry],
      stock: 20, weight: '250g', isOrganic: true, isNewArrival: true,
      rating: 4.8, reviewCount: 48,
      categoryId: fruitCat.id, brandId: freshstream.id,
    },
    {
      name: 'Organic Banana Bunch (~7pcs)',
      slug: 'organic-banana-bunch-7pcs',
      description: 'A hand of naturally ripened organic bananas from Sylhet. No carbide used. High in potassium, fibre, and natural sugars for sustained energy.',
      price: 85, comparePrice: 100, images: [IMGS.banana],
      stock: 55, weight: '~900g', isOrganic: true,
      rating: 4.4, reviewCount: 29,
      categoryId: fruitCat.id, brandId: earthly.id,
    },

    // ── Herbs & Spices ────────────────────────────────────────────────────
    {
      name: 'Organic Turmeric Powder 200g',
      slug: 'organic-turmeric-powder-200g',
      description: 'High-curcumin organic turmeric powder from Dinajpur. Stone-ground to preserve volatile oils and active compounds. 5.5%+ curcumin content.',
      price: 150, comparePrice: 180, images: [IMGS.turmeric],
      stock: 120, weight: '200g', isOrganic: true, isFeatured: true,
      rating: 4.7, reviewCount: 88,
      categoryId: herbCat.id, brandId: sunsoil.id,
    },
    {
      name: 'Fresh Ginger Root 500g',
      slug: 'fresh-ginger-root-500g',
      description: 'Pungent, aromatic organic ginger root from Jamalpur. Higher gingerol content than market ginger. Perfect for cooking, tea, and medicinal use.',
      price: 90, images: [IMGS.ginger],
      stock: 80, weight: '500g', isOrganic: true,
      rating: 4.5, reviewCount: 42,
      categoryId: herbCat.id, brandId: earthly.id,
    },
    {
      name: 'Organic Coriander Powder 100g',
      slug: 'organic-coriander-powder-100g',
      description: 'Freshly ground organic coriander with a bright, citrusy aroma. Essential spice in Bangladeshi cooking. Free from anti-caking agents.',
      price: 80, images: [IMGS.coriander],
      stock: 100, weight: '100g', isOrganic: true,
      rating: 4.3, reviewCount: 19,
      categoryId: herbCat.id, brandId: sunsoil.id,
    },
    {
      name: 'Organic Garlic Bulbs 500g',
      slug: 'organic-garlic-bulbs-500g',
      description: 'Fresh whole garlic bulbs grown organically without synthetic fertilizers. Allicin-rich for immune support. Full-flavoured and long-lasting.',
      price: 130, comparePrice: 155, images: [IMGS.garlic],
      stock: 65, weight: '500g', isOrganic: true, isNewArrival: true,
      rating: 4.6, reviewCount: 34,
      categoryId: herbCat.id, brandId: pureroot.id,
    },
  ];

  for (const p of productData) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }
  console.log(`  → Created ${productData.length} products`);

  // ── Coupons ──────────────────────────────────────────────────────────────
  console.log('  → Creating coupons...');
  await Promise.all([
    prisma.coupon.upsert({
      where: { code: 'ORGANIC10' },
      update: {},
      create: {
        code: 'ORGANIC10',
        description: '10% off your first order',
        discount: 10,
        type: 'PERCENTAGE',
        minOrder: 200,
        maxUses: 500,
        isActive: true,
      },
    }),
    prisma.coupon.upsert({
      where: { code: 'FLAT50' },
      update: {},
      create: {
        code: 'FLAT50',
        description: '৳50 flat off on orders above ৳500',
        discount: 50,
        type: 'FLAT',
        minOrder: 500,
        maxUses: 200,
        isActive: true,
      },
    }),
    prisma.coupon.upsert({
      where: { code: 'SUPER20' },
      update: {},
      create: {
        code: 'SUPER20',
        description: '20% off on super foods category',
        discount: 20,
        type: 'PERCENTAGE',
        minOrder: 300,
        maxUses: 100,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Seeding complete!');
  console.log(`   • 7 brands`);
  console.log(`   • 6 categories`);
  console.log(`   • ${productData.length} products`);
  console.log(`   • 3 coupons`);
  console.log(`   • Admin: phone=01700000000 / password=Admin@1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
