import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSubscriptionPlans() {
  console.log('🌱 Seeding subscription plans...');

  // Free plan
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Free' },
    update: {},
    create: {
      name: 'Free',
      price: 0,
      yearlyPrice: 0,
      billingCycle: 'MONTHLY',
      features: {
        maxRecipeGenerations: 5,
        maxVideoGenerations: 1,
        maxCommunityPosts: 3,
        maxCommunityComments: 10,
        aiSuggestions: false,
        premiumTemplates: false,
        exportToPdf: false,
        prioritySupport: false
      },
      isActive: true,
      sortOrder: 0
    }
  });

  // Pro plan 
  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Pro' },
    update: {},
    create: {
      name: 'Pro',
      price: 99000, // 99,000 VND ~= $4 USD
      yearlyPrice: 990000, // 10 months price for yearly
      billingCycle: 'MONTHLY',
      features: {
        maxRecipeGenerations: 50,
        maxVideoGenerations: 10,
        maxCommunityPosts: 100,
        maxCommunityComments: 500,
        aiSuggestions: true,
        premiumTemplates: true,
        exportToPdf: true,
        prioritySupport: false
      },
      isActive: true,
      sortOrder: 1
    }
  });

  // Premium plan
  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Premium' },
    update: {},
    create: {
      name: 'Premium',
      price: 199000, // 199,000 VND ~= $8 USD
      yearlyPrice: 1990000, // 10 months price for yearly  
      billingCycle: 'MONTHLY',
      features: {
        maxRecipeGenerations: -1, // Unlimited
        maxVideoGenerations: 50,
        maxCommunityPosts: -1, // Unlimited
        maxCommunityComments: -1, // Unlimited
        aiSuggestions: true,
        premiumTemplates: true,
        exportToPdf: true,
        prioritySupport: true
      },
      isActive: true,
      sortOrder: 2
    }
  });

  console.log('✅ Created subscription plans:', {
    free: freePlan.id,
    pro: proPlan.id,
    premium: premiumPlan.id
  });

  return { freePlan, proPlan, premiumPlan };
}

async function seedDemoUser() {
  console.log('🌱 Seeding demo user...');

  // Create a demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@recipeapp.com' },
    update: {},
    create: {
      email: 'demo@recipeapp.com',
      password: '$2b$10$CwTycUXWue0Thq9StjUM0OBeHFIre5vKBMR6.9e5u7/n8Gqg/Fz72', // password: "demo123"
      name: 'Demo User',
      role: 'MEMBER',
      prefs: {
        diet: 'NONE',
        units: 'metric',
        allergies: []
      }
    }
  });

  console.log('✅ Created demo user:', demoUser.id);
  return demoUser;
}

async function seedDemoSubscription(user: any, plans: any) {
  console.log('🌱 Seeding demo subscription...');

  // Give demo user a Pro subscription
  const demoSubscription = await prisma.userSubscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      planId: plans.proPlan.id,
      status: 'ACTIVE',
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      usageQuota: {
        recipeGenerationsLeft: 50,
        videoGenerationsLeft: 10,
        communityPostsLeft: 100,
        communityCommentsLeft: 500
      },
      billingCycle: 'MONTHLY',
      autoRenew: true
    }
  });

  console.log('✅ Created demo subscription:', demoSubscription.id);
  return demoSubscription;
}

async function seedAnalyticsEvents(userId: string) {
  console.log('🌱 Seeding analytics events...');

  const events = [
    { eventType: 'RECIPE_GENERATION', metadata: { recipeId: 'demo-recipe-1', ingredients: ['tomato', 'onion'], cost: 0.02 } },
    { eventType: 'VIDEO_GENERATION', metadata: { videoId: 'demo-video-1', recipeId: 'demo-recipe-1', cost: 0.5 } },
    { eventType: 'COMMUNITY_POST', metadata: { postId: 'demo-post-1', recipeId: 'demo-recipe-1' } },
    { eventType: 'USER_LOGIN', metadata: { loginMethod: 'password' } },
    { eventType: 'RECIPE_VIEW', metadata: { recipeId: 'demo-recipe-1' } }
  ];

  for (const event of events) {
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventType: event.eventType as any,
        metadata: event.metadata,
        sessionId: 'demo-session-123'
      }
    });
  }

  console.log('✅ Created analytics events');
}

async function main() {
  try {
    const plans = await seedSubscriptionPlans();
    const user = await seedDemoUser();
    await seedDemoSubscription(user, plans);
    await seedAnalyticsEvents(user.id);
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
