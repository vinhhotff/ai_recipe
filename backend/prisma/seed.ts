import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 12);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@recipeai.com' },
    update: {},
    create: {
      email: 'demo@recipeai.com',
      password: hashedPassword,
      name: 'Demo User',
      role: 'MEMBER',
      prefs: {
        diet: 'NONE',
        allergies: [],
        units: 'metric'
      }
    },
  });

  console.log('👤 Created demo user:', demoUser.email);

  // Create sample pantry items
  const pantryItems = [
    { name: 'Cà chua', normalized: 'tomato', quantity: 500, unit: 'g' },
    { name: 'Thịt gà', normalized: 'chicken_breast', quantity: 300, unit: 'g' },
    { name: 'Hành tây', normalized: 'onion', quantity: 2, unit: 'củ' },
    { name: 'Tỏi', normalized: 'garlic', quantity: 5, unit: 'tép' },
    { name: 'Cà rót', normalized: 'carrot', quantity: 200, unit: 'g' },
    { name: 'Khoai tây', normalized: 'potato', quantity: 400, unit: 'g' },
  ];

  for (const item of pantryItems) {
    await prisma.pantryItem.upsert({
      where: { 
        userId_name: {
          userId: demoUser.id,
          name: item.name
        }
      },
      update: {},
      create: {
        ...item,
        userId: demoUser.id,
      },
    });
  }

  console.log('🥬 Created sample pantry items');

  // Create sample recipe
  const sampleRecipe = await prisma.recipe.upsert({
    where: { slug: 'ga-rim-ca-chua-nhanh' },
    update: {},
    create: {
      title: 'Gà rim cà chua nhanh',
      slug: 'ga-rim-ca-chua-nhanh',
      servings: 2,
      totalCalories: 720,
      caloriesPer: 360,
      estimatedCost: 85000,
      difficulty: 'easy',
      ingredients: [
        { name: 'Thịt gà', normalized: 'chicken_breast', quantity: 300, unit: 'g' },
        { name: 'Cà chua', normalized: 'tomato', quantity: 2, unit: 'quả' },
        { name: 'Hành tây', normalized: 'onion', quantity: 1, unit: 'củ' },
        { name: 'Tỏi', normalized: 'garlic', quantity: 3, unit: 'tép' },
      ],
      steps: [
        { order: 1, text: 'Rửa sạch thịt gà, cắt thành miếng vừa ăn. Ướp với muối, tiêu trong 10 phút.', durationMinutes: 10 },
        { order: 2, text: 'Cà chua rửa sạch, cắt múi cau. Hành tây thái lát, tỏi băm nhỏ.', durationMinutes: 5 },
        { order: 3, text: 'Đun chảo với một chút dầu, phi thơm tỏi và hành tây.', durationMinutes: 2 },
        { order: 4, text: 'Cho thịt gà vào xào trên lửa lớn cho đến khi chín đều, khoảng 7-8 phút.', durationMinutes: 8 },
        { order: 5, text: 'Thêm cà chua vào, nêm nước mắm, đường. Đảo đều và rim trong 10-15 phút.', durationMinutes: 15 },
      ],
      nutrition: {
        protein_g: 45,
        fat_g: 12,
        carbs_g: 18,
        fiber_g: 4,
        sodium_mg: 850
      },
      tags: ['vietnamese', 'quick', 'healthy'],
      imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
      createdById: demoUser.id,
      isPublic: true,
    },
  });

  console.log('🍽️ Created sample recipe:', sampleRecipe.title);

  console.log('✅ Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });