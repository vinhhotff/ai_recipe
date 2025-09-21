import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedIngredients() {
  console.log('🌱 Seeding ingredients...');

  const ingredients = [
    { 
      name: 'Trứng gà', 
      description: 'Fresh chicken eggs',
      canonicalUnit: 'pcs',
      basePrice: '5000', // 5,000 VND per piece
      currency: 'VND'
    },
    { 
      name: 'Cà chua', 
      description: 'Fresh tomatoes',
      canonicalUnit: 'kg',
      basePrice: '25000', // 25,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Hành tây', 
      description: 'Yellow onions',
      canonicalUnit: 'kg',
      basePrice: '18000', // 18,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Tỏi', 
      description: 'Garlic cloves',
      canonicalUnit: 'kg',
      basePrice: '35000', // 35,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Thịt bò', 
      description: 'Beef meat',
      canonicalUnit: 'kg',
      basePrice: '280000', // 280,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Thịt heo', 
      description: 'Pork meat',
      canonicalUnit: 'kg',
      basePrice: '120000', // 120,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Thịt gà', 
      description: 'Chicken meat',
      canonicalUnit: 'kg',
      basePrice: '85000', // 85,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Gạo', 
      description: 'White rice',
      canonicalUnit: 'kg',
      basePrice: '22000', // 22,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Mì sợi', 
      description: 'Noodles',
      canonicalUnit: 'kg',
      basePrice: '15000', // 15,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Dầu ăn', 
      description: 'Cooking oil',
      canonicalUnit: 'l',
      basePrice: '45000', // 45,000 VND per liter
      currency: 'VND'
    },
    { 
      name: 'Muối', 
      description: 'Salt',
      canonicalUnit: 'kg',
      basePrice: '8000', // 8,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Đường', 
      description: 'Sugar',
      canonicalUnit: 'kg',
      basePrice: '18000', // 18,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Nước mắm', 
      description: 'Fish sauce',
      canonicalUnit: 'l',
      basePrice: '35000', // 35,000 VND per liter
      currency: 'VND'
    },
    { 
      name: 'Sốt soya', 
      description: 'Soy sauce',
      canonicalUnit: 'l',
      basePrice: '28000', // 28,000 VND per liter
      currency: 'VND'
    },
    { 
      name: 'Ớt', 
      description: 'Chili peppers',
      canonicalUnit: 'kg',
      basePrice: '60000', // 60,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Khoai tây', 
      description: 'Potatoes',
      canonicalUnit: 'kg',
      basePrice: '15000', // 15,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Cà rốt', 
      description: 'Carrots',
      canonicalUnit: 'kg',
      basePrice: '22000', // 22,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Rau muống', 
      description: 'Water spinach',
      canonicalUnit: 'kg',
      basePrice: '12000', // 12,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Bắp cải', 
      description: 'Cabbage',
      canonicalUnit: 'kg',
      basePrice: '8000', // 8,000 VND per kg
      currency: 'VND'
    },
    { 
      name: 'Chanh', 
      description: 'Lemon/Lime',
      canonicalUnit: 'pcs',
      basePrice: '2000', // 2,000 VND per piece
      currency: 'VND'
    },
  ];

  for (const ingredient of ingredients) {
    await prisma.ingredient.upsert({
      where: { name: ingredient.name },
      update: {},
      create: ingredient,
    });
  }

  console.log('✅ Ingredients seeded successfully!');
}

seedIngredients()
  .catch((e) => {
    console.error('❌ Error seeding ingredients:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
