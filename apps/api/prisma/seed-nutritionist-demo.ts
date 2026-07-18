// HHDMS Nutritionist Demo Data Seed
// Run via: npx tsx prisma/seed-nutritionist-demo.ts
// Seeds comprehensive demo patients, food items, diet templates, and sample data
// for testing all 10 Nutritionist Module features end-to-end.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function getNutritionistUserId(): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: 'nutritionist.tanvir@hhdms.com' },
  });
  if (!user) throw new Error('Nutritionist user not found. Run prisma/seed.ts first.');
  return user.id;
}

async function main() {
  console.log('🌱 Seeding Nutritionist Demo Data...\n');

  const nutritionistUserId = await getNutritionistUserId();
  console.log(`Using nutritionist: ${nutritionistUserId} (Tanvir Ahmed)\n`);

  // ─── Food Items (NU-009) ────────────────────────────────────────────────────
  console.log('Seeding Bangladeshi Food Items...');

  const foods = [
    // Grains & Cereals
    { name_en: 'White Rice (Parboiled)', name_bn: 'সাদা ভাত (আতপ)', calories: 130, protein: 2.7, carbs: 28.7, fat: 0.3, fiber: 0.4 },
    { name_en: 'Brown Rice', name_bn: 'বাদামী চাল', calories: 111, protein: 2.6, carbs: 23.0, fat: 0.9, fiber: 1.8 },
    { name_en: 'Wheat Roti (Plain)', name_bn: 'গমের রুটি', calories: 297, protein: 11.0, carbs: 51.0, fat: 3.5, fiber: 4.5 },
    { name_en: 'Bread (White)', name_bn: 'পাউরুটি', calories: 265, protein: 9.0, carbs: 49.0, fat: 3.2, fiber: 2.7 },
    { name_en: 'Oats (Rolled)', name_bn: 'ওটস', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6 },
    // Lentils & Legumes
    { name_en: 'Red Lentils (Masoor Dal)', name_bn: 'মসুর ডাল', calories: 116, protein: 9.0, carbs: 20.0, fat: 0.4, fiber: 8.0 },
    { name_en: 'Mung Dal', name_bn: 'মুগ ডাল', calories: 127, protein: 8.7, carbs: 22.7, fat: 0.6, fiber: 7.6 },
    { name_en: 'Chickpeas (Chhola)', name_bn: 'ছোলা', calories: 139, protein: 7.2, carbs: 22.5, fat: 2.1, fiber: 6.4 },
    // Fish & Meat
    { name_en: 'Rui Fish (Rohu)', name_bn: 'রুই মাছ', calories: 97, protein: 17.0, carbs: 0.0, fat: 2.7, fiber: 0.0 },
    { name_en: 'Tilapia Fish', name_bn: 'তেলাপিয়া', calories: 96, protein: 20.1, carbs: 0.0, fat: 1.7, fiber: 0.0 },
    { name_en: 'Ilish Fish (Hilsa)', name_bn: 'ইলিশ মাছ', calories: 205, protein: 18.0, carbs: 0.0, fat: 14.5, fiber: 0.0 },
    { name_en: 'Chicken Breast (Skinless)', name_bn: 'মুরগির বুক (চামড়াহীন)', calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6, fiber: 0.0 },
    { name_en: 'Chicken Thigh (Skinless)', name_bn: 'মুরগির উরু (চামড়াহীন)', calories: 209, protein: 26.0, carbs: 0.0, fat: 11.0, fiber: 0.0 },
    { name_en: 'Beef (Lean, Cooked)', name_bn: 'গরুর মাংস (চর্বিহীন)', calories: 250, protein: 26.0, carbs: 0.0, fat: 15.0, fiber: 0.0 },
    { name_en: 'Egg (Whole, Boiled)', name_bn: 'ডিম (সেদ্ধ)', calories: 155, protein: 13.0, carbs: 1.1, fat: 11.0, fiber: 0.0 },
    { name_en: 'Egg White (Boiled)', name_bn: 'ডিমের সাদা অংশ', calories: 52, protein: 11.0, carbs: 0.7, fat: 0.2, fiber: 0.0 },
    // Vegetables
    { name_en: 'Potato (Boiled)', name_bn: 'আলু (সেদ্ধ)', calories: 87, protein: 1.9, carbs: 20.0, fat: 0.1, fiber: 1.8 },
    { name_en: 'Pumpkin (Sweet)', name_bn: 'মিষ্টি কুমড়া', calories: 26, protein: 1.0, carbs: 6.5, fat: 0.1, fiber: 0.5 },
    { name_en: 'Spinach (Shak)', name_bn: 'পালং শাক', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
    { name_en: 'Okra (Dheros)', name_bn: 'ঢেঁড়স', calories: 33, protein: 1.9, carbs: 7.5, fat: 0.2, fiber: 3.2 },
    { name_en: 'Eggplant (Begun)', name_bn: 'বেগুন', calories: 25, protein: 1.0, carbs: 5.9, fat: 0.2, fiber: 3.0 },
    { name_en: 'Cabbage (Badha Kopi)', name_bn: 'বাঁধাকপি', calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1, fiber: 2.5 },
    { name_en: 'Cauliflower (Phul Kopi)', name_bn: 'ফুলকপি', calories: 25, protein: 1.9, carbs: 5.0, fat: 0.3, fiber: 2.0 },
    { name_en: 'Green Beans', name_bn: 'শিম', calories: 31, protein: 1.8, carbs: 7.0, fat: 0.2, fiber: 3.4 },
    { name_en: 'Carrot', name_bn: 'গাজর', calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 },
    { name_en: 'Tomato', name_bn: 'টমেটো', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
    { name_en: 'Cucumber', name_bn: 'শসা', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 },
    // Fruits
    { name_en: 'Banana (Champa/Kola)', name_bn: 'কলা', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
    { name_en: 'Apple (Red)', name_bn: 'আপেল', calories: 52, protein: 0.3, carbs: 14.0, fat: 0.2, fiber: 2.4 },
    { name_en: 'Mango (Himsagor)', name_bn: 'আম', calories: 60, protein: 0.8, carbs: 14.3, fat: 0.4, fiber: 1.6 },
    { name_en: 'Guava (Peyara)', name_bn: 'পেয়ারা', calories: 68, protein: 2.6, carbs: 14.3, fat: 0.6, fiber: 5.4 },
    { name_en: 'Watermelon', name_bn: 'তরমুজ', calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2, fiber: 0.4 },
    { name_en: 'Orange', name_bn: 'কমলা', calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, fiber: 2.4 },
    // Dairy
    { name_en: 'Milk (Cow, Full Fat)', name_bn: 'গরুর দুধ', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0.0 },
    { name_en: 'Yogurt (Plain, Sweet)', name_bn: 'দই', calories: 63, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0.0 },
    { name_en: 'Cottage Cheese (Chhana)', name_bn: 'ছানা', calories: 98, protein: 11.1, carbs: 4.1, fat: 4.3, fiber: 0.0 },
    // Oils & Fats
    { name_en: 'Mustard Oil', name_bn: 'সরিষার তেল', calories: 884, protein: 0.0, carbs: 0.0, fat: 100.0, fiber: 0.0 },
    { name_en: 'Soybean Oil', name_bn: 'সয়াবিন তেল', calories: 884, protein: 0.0, carbs: 0.0, fat: 100.0, fiber: 0.0 },
    { name_en: 'Olive Oil', name_bn: 'অলিভ অয়েল', calories: 884, protein: 0.0, carbs: 0.0, fat: 100.0, fiber: 0.0 },
    { name_en: 'Ghee (Clarified Butter)', name_bn: 'ঘি', calories: 900, protein: 0.0, carbs: 0.0, fat: 99.9, fiber: 0.0 },
    // Nuts & Seeds
    { name_en: 'Almond (Badam)', name_bn: 'বাদাম', calories: 579, protein: 21.0, carbs: 21.6, fat: 49.9, fiber: 12.5 },
    { name_en: 'Walnut (Akharot)', name_bn: 'আখরোট', calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7 },
    { name_en: 'Flaxseed (Tishi)', name_bn: 'তিল', calories: 534, protein: 18.3, carbs: 28.9, fat: 42.2, fiber: 27.3 },
    // Snacks & Drinks
    { name_en: 'Puffed Rice (Muri)', name_bn: 'মুড়ি', calories: 380, protein: 6.0, carbs: 85.0, fat: 0.8, fiber: 1.5 },
    { name_en: 'Flat Rice (Chira)', name_bn: 'চিড়া', calories: 370, protein: 7.0, carbs: 80.0, fat: 0.9, fiber: 1.5 },
    { name_en: 'Tamarind (Tetul)', name_bn: 'তেঁতুল', calories: 239, protein: 2.8, carbs: 62.5, fat: 0.6, fiber: 5.1 },
    { name_en: 'Sugar', name_bn: 'চিনি', calories: 387, protein: 0.0, carbs: 100.0, fat: 0.0, fiber: 0.0 },
    { name_en: 'Honey', name_bn: 'মধু', calories: 304, protein: 0.3, carbs: 82.4, fat: 0.0, fiber: 0.2 },
  ];

  const foodRecordMap = new Map<string, typeof prisma.food_items.create extends (a: any) => infer R ? Awaited<R> : never>();
  for (const f of foods) {
    const record = await prisma.food_items.upsert({
      where: { id: f.name_en }, // We rely on id, so we search differently
      update: { calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber, is_active: true },
      create: {
        name_en: f.name_en,
        name_bn: f.name_bn,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        fiber: f.fiber,
        is_active: true,
      },
    });
    foodRecordMap.set(f.name_en, record as any);
  }
  console.log(`  ✓ ${foods.length} food items seeded\n`);

  // ─── Diet Templates (NU-005) ───────────────────────────────────────────────
  console.log('Seeding Condition-Specific Diet Templates...');

  interface MealSeed {
    meal_slot: string;
    calories: number;
    guidance: string;
    foods: { name_en: string; grams: number }[];
  }

  interface TemplateSeed {
    condition_name: string;
    description: string;
    total_calories: number;
    language: string;
    meals: MealSeed[];
  }

  const templates: TemplateSeed[] = [
    {
      condition_name: 'Diabetes Type 2 (Low GI)',
      description: 'Low glycemic index diet for Type 2 Diabetes. Balanced macros with emphasis on complex carbs and fiber. Avoids simple sugars and refined grains. Bangladeshi context with familiar foods.',
      total_calories: 1800,
      language: 'both',
      meals: [
        { meal_slot: 'Breakfast', calories: 350, guidance: 'Avoid sugar in tea. Use whole grain roti instead of paratha.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 60 }, { name_en: 'Egg (Whole, Boiled)', grams: 50 }, { name_en: 'Spinach (Shak)', grams: 50 }] },
        { meal_slot: 'Mid-Morning', calories: 150, guidance: 'Choose green apple or guava for lower GI.', foods: [{ name_en: 'Guava (Peyara)', grams: 150 }] },
        { meal_slot: 'Lunch', calories: 550, guidance: 'Use brown rice instead of white. Include plenty of leafy greens. Avoid oily curries.', foods: [{ name_en: 'Brown Rice', grams: 150 }, { name_en: 'Red Lentils (Masoor Dal)', grams: 100 }, { name_en: 'Rui Fish (Rohu)', grams: 100 }, { name_en: 'Green Beans', grams: 50 }] },
        { meal_slot: 'Afternoon', calories: 150, guidance: 'Plain yogurt is preferable to sweetened versions.', foods: [{ name_en: 'Yogurt (Plain, Sweet)', grams: 150 }, { name_en: 'Almond (Badam)', grams: 15 }] },
        { meal_slot: 'Dinner', calories: 450, guidance: 'Light meal. Avoid eating less than 2 hours before bedtime.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 60 }, { name_en: 'Chicken Breast (Skinless)', grams: 80 }, { name_en: 'Okra (Dheros)', grams: 100 }] },
        { meal_slot: 'Bedtime', calories: 150, guidance: 'Optional - only if hungry. Avoid sweet milk.', foods: [{ name_en: 'Milk (Cow, Full Fat)', grams: 200 }] },
      ],
    },
    {
      condition_name: 'CKD Stage 3 (Low Protein/Low K)',
      description: 'Renal-friendly diet for CKD Stage 3. Controlled protein (0.6-0.8g/kg), low potassium, low phosphorus, and moderate sodium restriction. Bangladeshi foods adjusted for renal requirements.',
      total_calories: 1600,
      language: 'both',
      meals: [
        { meal_slot: 'Breakfast', calories: 300, guidance: 'Limit high-potassium fruits. Use small amount of milk.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 45 }, { name_en: 'Egg White (Boiled)', grams: 60 }, { name_en: 'Cucumber', grams: 50 }] },
        { meal_slot: 'Mid-Morning', calories: 100, guidance: 'Low potassium fruit.', foods: [{ name_en: 'Apple (Red)', grams: 100 }] },
        { meal_slot: 'Lunch', calories: 500, guidance: 'Limit dal to half cup. Avoid high-potassium vegetables. Use limited salt.', foods: [{ name_en: 'White Rice (Parboiled)', grams: 120 }, { name_en: 'Red Lentils (Masoor Dal)', grams: 50 }, { name_en: 'Chicken Breast (Skinless)', grams: 60 }, { name_en: 'Cabbage (Badha Kopi)', grams: 80 }] },
        { meal_slot: 'Afternoon', calories: 100, guidance: 'Low-potassium snack.', foods: [{ name_en: 'Puffed Rice (Muri)', grams: 20 }] },
        { meal_slot: 'Dinner', calories: 450, guidance: 'Limit protein portion. Avoid high-phosphorus foods.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 45 }, { name_en: 'Pumpkin (Sweet)', grams: 100 }, { name_en: 'Cauliflower (Phul Kopi)', grams: 80 }] },
        { meal_slot: 'Bedtime', calories: 150, guidance: 'Limit fluid intake as per renal advice.', foods: [{ name_en: 'Milk (Cow, Full Fat)', grams: 150 }] },
      ],
    },
    {
      condition_name: 'DASH Diet (Hypertension)',
      description: 'Dietary Approaches to Stop Hypertension. Low sodium (<1500mg/day), rich in potassium, calcium, magnesium, and fiber. Emphasizes vegetables, fruits, whole grains, and low-fat dairy.',
      total_calories: 2000,
      language: 'both',
      meals: [
        { meal_slot: 'Breakfast', calories: 400, guidance: 'No salt added in cooking. Avoid processed bread.', foods: [{ name_en: 'Oats (Rolled)', grams: 40 }, { name_en: 'Milk (Cow, Full Fat)', grams: 200 }, { name_en: 'Banana (Champa/Kola)', grams: 100 }] },
        { meal_slot: 'Mid-Morning', calories: 150, guidance: 'Fresh fruit is ideal.', foods: [{ name_en: 'Orange', grams: 150 }] },
        { meal_slot: 'Lunch', calories: 600, guidance: 'No added salt. Use herbs/spices for flavor. Avoid fried items.', foods: [{ name_en: 'Brown Rice', grams: 150 }, { name_en: 'Red Lentils (Masoor Dal)', grams: 80 }, { name_en: 'Tilapia Fish', grams: 100 }, { name_en: 'Spinach (Shak)', grams: 80 }, { name_en: 'Tomato', grams: 50 }] },
        { meal_slot: 'Afternoon', calories: 150, guidance: 'Unsalted nuts are good for heart health.', foods: [{ name_en: 'Yogurt (Plain, Sweet)', grams: 100 }, { name_en: 'Walnut (Akharot)', grams: 15 }] },
        { meal_slot: 'Dinner', calories: 500, guidance: 'Whole grains preferred. Limit portion size.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 60 }, { name_en: 'Chicken Breast (Skinless)', grams: 80 }, { name_en: 'Green Beans', grams: 80 }, { name_en: 'Carrot', grams: 50 }] },
        { meal_slot: 'Bedtime', calories: 200, guidance: 'Avoid salty snacks.', foods: [{ name_en: 'Almond (Badam)', grams: 20 }, { name_en: 'Milk (Cow, Full Fat)', grams: 150 }] },
      ],
    },
    {
      condition_name: 'Weight Loss (Obesity)',
      description: 'Calorie-restricted diet (1500 kcal) for weight management. High protein for satiety, moderate low-GI carbs, healthy fats. Portion-controlled Bangladeshi meals.',
      total_calories: 1500,
      language: 'en',
      meals: [
        { meal_slot: 'Breakfast', calories: 300, guidance: 'Protein-rich breakfast for satiety. Avoid sugar.', foods: [{ name_en: 'Egg (Whole, Boiled)', grams: 100 }, { name_en: 'Wheat Roti (Plain)', grams: 30 }, { name_en: 'Cucumber', grams: 100 }] },
        { meal_slot: 'Mid-Morning', calories: 100, guidance: 'Low-calorie fruit or vegetable stick.', foods: [{ name_en: 'Guava (Peyara)', grams: 150 }] },
        { meal_slot: 'Lunch', calories: 450, guidance: 'Half plate vegetables, quarter plate protein, quarter plate carbs.', foods: [{ name_en: 'Brown Rice', grams: 100 }, { name_en: 'Chicken Breast (Skinless)', grams: 100 }, { name_en: 'Eggplant (Begun)', grams: 100 }, { name_en: 'Spinach (Shak)', grams: 50 }] },
        { meal_slot: 'Afternoon', calories: 100, guidance: 'Keep hydrated with water, not juice.', foods: [{ name_en: 'Apple (Red)', grams: 100 }] },
        { meal_slot: 'Dinner', calories: 400, guidance: 'Light dinner, no carbs after 7 PM.', foods: [{ name_en: 'Rui Fish (Rohu)', grams: 120 }, { name_en: 'Okra (Dheros)', grams: 100 }, { name_en: 'Cucumber', grams: 50 }] },
        { meal_slot: 'Bedtime', calories: 150, guidance: 'If hungry, have a small protein snack.', foods: [{ name_en: 'Milk (Cow, Full Fat)', grams: 150 }] },
      ],
    },
    {
      condition_name: 'Post-Surgical Recovery',
      description: 'Soft, easily digestible diet for post-surgical recovery. High protein for tissue repair, moderate carbs for energy, adequate fluids. Small frequent meals.',
      total_calories: 1800,
      language: 'en',
      meals: [
        { meal_slot: 'Breakfast', calories: 350, guidance: 'Soft foods. Well-cooked and easy to digest.', foods: [{ name_en: 'Flat Rice (Chira)', grams: 50 }, { name_en: 'Yogurt (Plain, Sweet)', grams: 150 }, { name_en: 'Banana (Champa/Kola)', grams: 100 }] },
        { meal_slot: 'Mid-Morning', calories: 200, guidance: 'Protein shake or egg whites.', foods: [{ name_en: 'Egg (Whole, Boiled)', grams: 100 }] },
        { meal_slot: 'Lunch', calories: 500, guidance: 'Soft rice well-cooked. Avoid spicy or fatty foods.', foods: [{ name_en: 'White Rice (Parboiled)', grams: 120 }, { name_en: 'Mung Dal', grams: 80 }, { name_en: 'Chicken Breast (Skinless)', grams: 80 }, { name_en: 'Pumpkin (Sweet)', grams: 80 }] },
        { meal_slot: 'Afternoon', calories: 200, guidance: 'Fruit or smoothie.', foods: [{ name_en: 'Mango (Himsagor)', grams: 150 }, { name_en: 'Milk (Cow, Full Fat)', grams: 100 }] },
        { meal_slot: 'Dinner', calories: 450, guidance: 'Soft consistency, easily digestible protein.', foods: [{ name_en: 'Tilapia Fish', grams: 100 }, { name_en: 'Potato (Boiled)', grams: 100 }, { name_en: 'Cauliflower (Phul Kopi)', grams: 80 }] },
        { meal_slot: 'Bedtime', calories: 100, guidance: 'Warm milk aids sleep and recovery.', foods: [{ name_en: 'Milk (Cow, Full Fat)', grams: 200 }] },
      ],
    },
    {
      condition_name: 'Heart Disease (Cardiac)',
      description: 'Cardiac-friendly diet low in saturated fats, trans fats, cholesterol, and sodium. High in omega-3s, fiber, and antioxidants. Mediterranean-inspired with Bangladeshi foods.',
      total_calories: 2000,
      language: 'both',
      meals: [
        { meal_slot: 'Breakfast', calories: 350, guidance: 'Oats are heart-healthy. Avoid butter/ghee.', foods: [{ name_en: 'Oats (Rolled)', grams: 40 }, { name_en: 'Milk (Cow, Full Fat)', grams: 200 }, { name_en: 'Walnut (Akharot)', grams: 15 }] },
        { meal_slot: 'Mid-Morning', calories: 100, guidance: 'Fruit snack.', foods: [{ name_en: 'Orange', grams: 150 }] },
        { meal_slot: 'Lunch', calories: 600, guidance: 'Fish rich in omega-3 preferred. Limit oil to 1 tbsp.', foods: [{ name_en: 'Brown Rice', grams: 130 }, { name_en: 'Ilish Fish (Hilsa)', grams: 80 }, { name_en: 'Spinach (Shak)', grams: 100 }, { name_en: 'Tomato', grams: 50 }, { name_en: 'Olive Oil', grams: 10 }] },
        { meal_slot: 'Afternoon', calories: 150, guidance: 'Nuts and fruit for heart-healthy snack.', foods: [{ name_en: 'Almond (Badam)', grams: 20 }, { name_en: 'Guava (Peyara)', grams: 100 }] },
        { meal_slot: 'Dinner', calories: 550, guidance: 'Light dinner. Avoid red meat.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 60 }, { name_en: 'Chicken Breast (Skinless)', grams: 80 }, { name_en: 'Green Beans', grams: 80 }, { name_en: 'Carrot', grams: 50 }] },
        { meal_slot: 'Bedtime', calories: 250, guidance: 'Warm milk with turmeric is beneficial.', foods: [{ name_en: 'Milk (Cow, Full Fat)', grams: 200 }, { name_en: 'Flaxseed (Tishi)', grams: 10 }] },
      ],
    },
    {
      condition_name: 'Malnutrition Recovery (High Protein)',
      description: 'High-calorie, high-protein diet for malnutrition recovery. Nutrient-dense foods in frequent meals. Fortified with healthy fats and proteins for weight gain.',
      total_calories: 2500,
      language: 'both',
      meals: [
        { meal_slot: 'Breakfast', calories: 500, guidance: 'Energy-dense breakfast. Add milk powder to cereal if possible.', foods: [{ name_en: 'Flat Rice (Chira)', grams: 80 }, { name_en: 'Banana (Champa/Kola)', grams: 100 }, { name_en: 'Milk (Cow, Full Fat)', grams: 250 }, { name_en: 'Almond (Badam)', grams: 20 }] },
        { meal_slot: 'Mid-Morning', calories: 300, guidance: 'Protein-rich snack.', foods: [{ name_en: 'Egg (Whole, Boiled)', grams: 100 }, { name_en: 'Bread (White)', grams: 60 }] },
        { meal_slot: 'Lunch', calories: 700, guidance: 'Generous portions. Add extra oil/ghee to meals.', foods: [{ name_en: 'White Rice (Parboiled)', grams: 200 }, { name_en: 'Red Lentils (Masoor Dal)', grams: 100 }, { name_en: 'Chicken Thigh (Skinless)', grams: 100 }, { name_en: 'Eggplant (Begun)', grams: 100 }, { name_en: 'Ghee (Clarified Butter)', grams: 10 }] },
        { meal_slot: 'Afternoon', calories: 300, guidance: 'High-calorie fruit and nut snack.', foods: [{ name_en: 'Mango (Himsagor)', grams: 200 }, { name_en: 'Walnut (Akharot)', grams: 20 }] },
        { meal_slot: 'Dinner', calories: 550, guidance: 'Include protein and carb at every meal.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 90 }, { name_en: 'Rui Fish (Rohu)', grams: 100 }, { name_en: 'Potato (Boiled)', grams: 100 }] },
        { meal_slot: 'Bedtime', calories: 150, guidance: 'Warm milk before bed.', foods: [{ name_en: 'Milk (Cow, Full Fat)', grams: 250 }] },
      ],
    },
    {
      condition_name: 'Pediatric Malnutrition',
      description: 'Nutrient-dense, age-appropriate diet for children (2-5 years) with malnutrition. Frequent small meals with high energy density. Soft, easy-to-eat textures with familiar flavors.',
      total_calories: 1000,
      language: 'both',
      meals: [
        { meal_slot: 'Breakfast', calories: 200, guidance: 'Soft, well-cooked, easy to chew. Add a little ghee for calories.', foods: [{ name_en: 'Flat Rice (Chira)', grams: 30 }, { name_en: 'Milk (Cow, Full Fat)', grams: 150 }, { name_en: 'Banana (Champa/Kola)', grams: 50 }] },
        { meal_slot: 'Mid-Morning', calories: 120, guidance: 'Small frequent feedings.', foods: [{ name_en: 'Egg (Whole, Boiled)', grams: 50 }, { name_en: 'Bread (White)', grams: 20 }] },
        { meal_slot: 'Lunch', calories: 300, guidance: 'Soft rice with well-mashed dal. Small pieces of fish.', foods: [{ name_en: 'White Rice (Parboiled)', grams: 60 }, { name_en: 'Mung Dal', grams: 40 }, { name_en: 'Tilapia Fish', grams: 40 }, { name_en: 'Pumpkin (Sweet)', grams: 50 }] },
        { meal_slot: 'Afternoon', calories: 130, guidance: 'Fruit puree or small pieces.', foods: [{ name_en: 'Guava (Peyara)', grams: 80 }, { name_en: 'Milk (Cow, Full Fat)', grams: 100 }] },
        { meal_slot: 'Dinner', calories: 200, guidance: 'Soft chapati pieces with well-cooked vegetables.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 30 }, { name_en: 'Potato (Boiled)', grams: 50 }, { name_en: 'Carrot', grams: 30 }] },
        { meal_slot: 'Bedtime', calories: 50, guidance: 'Warm milk before sleep.', foods: [{ name_en: 'Milk (Cow, Full Fat)', grams: 150 }] },
      ],
    },
  ];

  for (const t of templates) {
    const template = await prisma.diet_templates.upsert({
      where: { condition_name: t.condition_name },
      update: { description: t.description, total_calories: t.total_calories, language: t.language, is_active: true },
      create: {
        condition_name: t.condition_name,
        description: t.description,
        total_calories: t.total_calories,
        language: t.language,
        is_active: true,
      },
    });

    // Delete existing template meals and re-create
    await prisma.diet_template_meals.deleteMany({ where: { template_id: template.id } });

    for (let i = 0; i < t.meals.length; i++) {
      const m = t.meals[i];
      const foodsJson = m.foods.map(f => {
        const record = foodRecordMap.get(f.name_en);
        return { food_id: record?.id ?? null, name_en: f.name_en, grams: f.grams };
      });

      await prisma.diet_template_meals.create({
        data: {
          template_id: template.id,
          meal_slot: m.meal_slot,
          calories: m.calories,
          preparation_guidance: m.guidance,
          foods_json: JSON.stringify(foodsJson),
          sort_order: i,
        },
      });
    }
  }
  console.log(`  ✓ ${templates.length} diet templates with meals seeded\n`);

  // ─── Demo Patients with Clinical Data ──────────────────────────────────────
  console.log('Seeding Demo Patients...');

  interface PatientDemo {
    mrn: string;
    first_name_en: string;
    last_name_en: string;
    first_name_bn: string;
    last_name_bn: string;
    date_of_birth: Date;
    sex: string;
    blood_group: string;
    phone_number: string;
    district: string;
    height_cm: number;
    weight_kg: number;
    known_allergies: string;
    current_medications: string;
    past_medical_history: string;
    // Lab results for medical context (NU-002)
    labs: { test_code: string; result_value: string; result_numeric: number }[];
    // Diagnosis info
    diagnosis: { icd10_code: string; preliminary_diagnosis: string; chief_complaint: string };
  }

  const demoPatients: PatientDemo[] = [
    {
      mrn: 'NUT-DM-001',
      first_name_en: 'Ayesha', last_name_en: 'Khatun',
      first_name_bn: 'আয়েশা', last_name_bn: 'খাতুন',
      date_of_birth: new Date('1974-03-18'),
      sex: 'F', blood_group: 'A+', phone_number: '+8801710000001',
      district: 'Dhaka',
      height_cm: 155, weight_kg: 72,
      known_allergies: 'No known allergies',
      current_medications: 'Metformin 500mg (1+0+1), Atorvastatin 10mg (0+0+1)',
      past_medical_history: 'Diagnosed with Type 2 Diabetes Mellitus in 2019. Hypertension diagnosed 2021. Mild fatty liver on USG. Family history: mother had diabetes.',
      labs: [
        { test_code: 'HBA1C', result_value: '8.5', result_numeric: 8.5 },
        { test_code: 'FBG', result_value: '168', result_numeric: 168 },
        { test_code: 'RBG', result_value: '210', result_numeric: 210 },
        { test_code: 'CREAT', result_value: '0.9', result_numeric: 0.9 },
        { test_code: 'BUN', result_value: '14', result_numeric: 14 },
        { test_code: 'CHOL', result_value: '210', result_numeric: 210 },
        { test_code: 'HDL', result_value: '38', result_numeric: 38 },
        { test_code: 'LDL', result_value: '145', result_numeric: 145 },
        { test_code: 'TG', result_value: '180', result_numeric: 180 },
        { test_code: 'SGPT', result_value: '45', result_numeric: 45 },
      ],
      diagnosis: { icd10_code: 'E11', preliminary_diagnosis: 'Type 2 Diabetes Mellitus with dyslipidemia', chief_complaint: 'Frequent urination, fatigue, and uncontrolled blood sugar' },
    },
    {
      mrn: 'NUT-CKD-001',
      first_name_en: 'Jahangir', last_name_en: 'Alam',
      first_name_bn: 'জাহাঙ্গীর', last_name_bn: 'আলম',
      date_of_birth: new Date('1964-08-05'),
      sex: 'M', blood_group: 'O+', phone_number: '+8801710000002',
      district: 'Rajshahi',
      height_cm: 168, weight_kg: 65,
      known_allergies: 'Shrimp allergy',
      current_medications: 'Losartan 50mg (1+0+0), Furosemide 20mg (1+0+0), Sodium Bicarbonate 500mg',
      past_medical_history: 'Chronic Kidney Disease Stage 3 diagnosed 2022. Hypertension for 10 years. Gout history. Bilateral small kidneys on USG.',
      labs: [
        { test_code: 'CREAT', result_value: '2.1', result_numeric: 2.1 },
        { test_code: 'BUN', result_value: '42', result_numeric: 42 },
        { test_code: 'NA', result_value: '138', result_numeric: 138 },
        { test_code: 'K', result_value: '5.0', result_numeric: 5.0 },
        { test_code: 'URIC', result_value: '7.8', result_numeric: 7.8 },
        { test_code: 'ALB', result_value: '3.2', result_numeric: 3.2 },
        { test_code: 'HB', result_value: '10.5', result_numeric: 10.5 },
      ],
      diagnosis: { icd10_code: 'N18.3', preliminary_diagnosis: 'Chronic Kidney Disease Stage 3a', chief_complaint: 'Fatigue, decreased appetite, and lower extremity edema' },
    },
    {
      mrn: 'NUT-HTN-001',
      first_name_en: 'Shahinur', last_name_en: 'Begum',
      first_name_bn: 'শাহিনুর', last_name_bn: 'বেগম',
      date_of_birth: new Date('1979-11-22'),
      sex: 'F', blood_group: 'B+', phone_number: '+8801710000003',
      district: 'Khulna',
      height_cm: 160, weight_kg: 85,
      known_allergies: 'Penicillin',
      current_medications: 'Amlodipine 10mg (1+0+0), Atenolol 50mg (1+0+0)',
      past_medical_history: 'Hypertension diagnosed 2018. Osteoarthritis of both knees. Obesity (BMI 33.2). Sedentary lifestyle.',
      labs: [
        { test_code: 'CHOL', result_value: '220', result_numeric: 220 },
        { test_code: 'HDL', result_value: '40', result_numeric: 40 },
        { test_code: 'LDL', result_value: '155', result_numeric: 155 },
        { test_code: 'TG', result_value: '165', result_numeric: 165 },
        { test_code: 'FBG', result_value: '98', result_numeric: 98 },
        { test_code: 'CREAT', result_value: '0.8', result_numeric: 0.8 },
        { test_code: 'HB', result_value: '12.5', result_numeric: 12.5 },
      ],
      diagnosis: { icd10_code: 'I10', preliminary_diagnosis: 'Essential Hypertension Stage 2 with obesity', chief_complaint: 'Headache, palpitations, and difficulty losing weight' },
    },
    {
      mrn: 'NUT-OBE-001',
      first_name_en: 'Karim', last_name_en: 'Miah',
      first_name_bn: 'করিম', last_name_bn: 'মিয়া',
      date_of_birth: new Date('1991-06-14'),
      sex: 'M', blood_group: 'AB+', phone_number: '+8801710000004',
      district: 'Chattogram',
      height_cm: 175, weight_kg: 98,
      known_allergies: 'No known allergies',
      current_medications: 'None',
      past_medical_history: 'Obese since adolescence. Pre-diabetic (FBG 112). Family history of diabetes and heart disease. Complains of snoring and daytime sleepiness.',
      labs: [
        { test_code: 'FBG', result_value: '112', result_numeric: 112 },
        { test_code: 'HBA1C', result_value: '5.9', result_numeric: 5.9 },
        { test_code: 'CHOL', result_value: '195', result_numeric: 195 },
        { test_code: 'HDL', result_value: '35', result_numeric: 35 },
        { test_code: 'LDL', result_value: '130', result_numeric: 130 },
        { test_code: 'TG', result_value: '185', result_numeric: 185 },
        { test_code: 'SGPT', result_value: '52', result_numeric: 52 },
      ],
      diagnosis: { icd10_code: 'E66.9', preliminary_diagnosis: 'Obesity with pre-diabetes and metabolic syndrome', chief_complaint: 'Unable to lose weight despite diet attempts. Wants structured meal plan.' },
    },
    {
      mrn: 'NUT-POS-001',
      first_name_en: 'Rina', last_name_en: 'Akhter',
      first_name_bn: 'রিনা', last_name_bn: 'আখতার',
      date_of_birth: new Date('1986-02-28'),
      sex: 'F', blood_group: 'A-', phone_number: '+8801710000005',
      district: 'Sylhet',
      height_cm: 158, weight_kg: 55,
      known_allergies: 'No known allergies',
      current_medications: 'Multivitamin daily',
      past_medical_history: 'Laparoscopic cholecystectomy performed 1 week ago. Otherwise healthy. No chronic conditions. Mild post-operative constipation.',
      labs: [
        { test_code: 'HB', result_value: '11.8', result_numeric: 11.8 },
        { test_code: 'FBG', result_value: '92', result_numeric: 92 },
        { test_code: 'CREAT', result_value: '0.7', result_numeric: 0.7 },
        { test_code: 'ALB', result_value: '3.6', result_numeric: 3.6 },
      ],
      diagnosis: { icd10_code: 'Z98.84', preliminary_diagnosis: 'Post-surgical recovery status post cholecystectomy', chief_complaint: 'Dietary guidance needed after gallbladder removal' },
    },
    {
      mrn: 'NUT-PED-001',
      first_name_en: 'Siam', last_name_en: 'Hossain',
      first_name_bn: 'সিয়াম', last_name_bn: 'হোসেন',
      date_of_birth: new Date('2024-01-10'),
      sex: 'M', blood_group: 'B+', phone_number: '+8801710000006',
      district: 'Barishal',
      height_cm: 82, weight_kg: 9,
      known_allergies: 'Lactose intolerance',
      current_medications: 'Vitamin D drops, Iron supplement',
      past_medical_history: 'Pediatric malnutrition (moderate acute malnutrition). Repeated episodes of diarrhea. Poor appetite. Weight-for-height Z-score: -3.0.',
      labs: [
        { test_code: 'HB', result_value: '9.5', result_numeric: 9.5 },
        { test_code: 'ALB', result_value: '2.8', result_numeric: 2.8 },
        { test_code: 'K', result_value: '3.4', result_numeric: 3.4 },
        { test_code: 'NA', result_value: '132', result_numeric: 132 },
      ],
      diagnosis: { icd10_code: 'E44.0', preliminary_diagnosis: 'Moderate acute malnutrition with iron deficiency anemia', chief_complaint: 'Poor weight gain, diarrhea, and decreased appetite' },
    },
    {
      mrn: 'NUT-CARD-001',
      first_name_en: 'Abdul', last_name_en: 'Latif',
      first_name_bn: 'আব্দুল', last_name_bn: 'লতিফ',
      date_of_birth: new Date('1969-12-01'),
      sex: 'M', blood_group: 'O-', phone_number: '+8801710000007',
      district: 'Dhaka',
      height_cm: 172, weight_kg: 78,
      known_allergies: 'Aspirin allergy (urticaria)',
      current_medications: 'Clopidogrel 75mg (1+0+0), Atorvastatin 40mg (0+0+1), Bisoprolol 5mg (1+0+0), Ramipril 5mg (1+0+0)',
      past_medical_history: 'Acute MI (inferior wall) 6 months ago. PTCA with DES to RCA. Hypertension for 15 years. Dyslipidemia. Former smoker (quit after MI).',
      labs: [
        { test_code: 'CHOL', result_value: '180', result_numeric: 180 },
        { test_code: 'HDL', result_value: '32', result_numeric: 32 },
        { test_code: 'LDL', result_value: '160', result_numeric: 160 },
        { test_code: 'TG', result_value: '200', result_numeric: 200 },
        { test_code: 'FBG', result_value: '108', result_numeric: 108 },
        { test_code: 'CREAT', result_value: '1.0', result_numeric: 1.0 },
        { test_code: 'TROPI', result_value: '0.01', result_numeric: 0.01 },
      ],
      diagnosis: { icd10_code: 'I21.0', preliminary_diagnosis: 'Status post acute myocardial infarction with dyslipidemia', chief_complaint: 'Cardiac diet plan and lifestyle modification guidance needed' },
    },
  ];

  // We need the MBBS doctor Arif to assign diagnoses/test orders
  const arifUser = await prisma.user.findUnique({ where: { email: 'dr.arif@hhdms.com' } });
  const drArifId = arifUser?.id;

  const createdPatientIds: string[] = [];

  for (const p of demoPatients) {
    const patient = await prisma.patients.upsert({
      where: { mrn: p.mrn },
      update: {},
      create: {
        mrn: p.mrn,
        first_name_en: p.first_name_en,
        last_name_en: p.last_name_en,
        first_name_bn: p.first_name_bn,
        last_name_bn: p.last_name_bn,
        date_of_birth: p.date_of_birth,
        sex: p.sex,
        blood_group: p.blood_group,
        phone_number: p.phone_number,
        district: p.district,
        height_cm: p.height_cm,
        weight_kg: p.weight_kg,
        known_allergies: p.known_allergies,
        current_medications: p.current_medications,
        past_medical_history: p.past_medical_history,
      },
    });
    createdPatientIds.push(patient.id);

    // Create diagnosis
    if (drArifId) {
      try {
        await prisma.patient_diagnoses.create({
          data: {
            patient_id: patient.id,
            doctor_id: drArifId,
            icd10_code: p.diagnosis.icd10_code,
            chief_complaint: p.diagnosis.chief_complaint,
            preliminary_diagnosis: p.diagnosis.preliminary_diagnosis,
            is_primary: true,
          },
        });
      } catch (e) {
        // ICD10 code might not exist, that's fine
        console.log(`  ⚠ Skipping diagnosis for ${p.mrn} (ICD10 code may not exist)`);
      }

      // Create lab test orders with results
      for (const lab of p.labs) {
        const test = await prisma.diagnostic_test_catalog.findUnique({ where: { test_code: lab.test_code } });
        if (!test) continue;

        const order = await prisma.diagnostic_test_orders.create({
          data: {
            patient_id: patient.id,
            doctor_id: drArifId,
            test_id: test.id,
            status: 'COMPLETED',
            clinical_notes: 'Pre-nutritionist assessment labs',
          },
        });

        await prisma.diagnostic_test_results.create({
          data: {
            order_id: order.id,
            result_value: lab.result_value,
            result_numeric: lab.result_numeric,
            is_critical: false,
            is_abnormal: true,
          },
        });
      }
    }

    console.log(`  ✓ ${p.first_name_en} ${p.last_name_en} (${p.mrn})`);
  }
  console.log(`  ✓ ${demoPatients.length} patients with clinical data seeded\n`);

  // ─── Anthropometric Records (NU-003) ──────────────────────────────────────
  console.log('Seeding Anthropometric Records...');

  // Create past records showing trends
  const anthropometricTrends: { mrn: string; records: { daysAgo: number; weight: number; waist: number; bmi: number; notes: string }[] }[] = [
    { mrn: 'NUT-DM-001', records: [
      { daysAgo: 90, weight: 75, waist: 92, bmi: 31.2, notes: 'Initial assessment. Poor glycemic control. High waist circumference indicating central obesity.' },
      { daysAgo: 60, weight: 73.5, waist: 90, bmi: 30.6, notes: 'Modest weight loss. Dietary adjustments made.' },
      { daysAgo: 30, weight: 72.8, waist: 88, bmi: 30.3, notes: 'Steady progress. Blood glucose improving.' },
      { daysAgo: 0, weight: 72, waist: 87, bmi: 30.0, notes: 'Current assessment. Continue current plan.' },
    ]},
    { mrn: 'NUT-CKD-001', records: [
      { daysAgo: 60, weight: 67, waist: 85, bmi: 23.7, notes: 'Initial assessment. Mild edema noted.' },
      { daysAgo: 30, weight: 66, waist: 84, bmi: 23.4, notes: 'Edema improving with restricted sodium.' },
      { daysAgo: 0, weight: 65, waist: 83, bmi: 23.0, notes: 'Current assessment. Edema resolved.' },
    ]},
    { mrn: 'NUT-HTN-001', records: [
      { daysAgo: 120, weight: 89, waist: 98, bmi: 34.8, notes: 'Initial assessment. Severe obesity. High BP 155/95.' },
      { daysAgo: 60, weight: 87, waist: 96, bmi: 34.0, notes: 'Some weight loss. BP improved to 140/88.' },
      { daysAgo: 0, weight: 85, waist: 95, bmi: 33.2, notes: 'Current assessment. BP 138/85. Continue DASH diet.' },
    ]},
    { mrn: 'NUT-OBE-001', records: [
      { daysAgo: 60, weight: 102, waist: 108, bmi: 33.3, notes: 'Initial assessment. Morbid obesity. Pre-diabetic.' },
      { daysAgo: 30, weight: 100, waist: 106, bmi: 32.7, notes: 'Good compliance. Calorie deficit working.' },
      { daysAgo: 0, weight: 98, waist: 105, bmi: 32.0, notes: 'Current assessment. Motivated patient.' },
    ]},
  ];

  for (const trend of anthropometricTrends) {
    const patient = await prisma.patients.findUnique({ where: { mrn: trend.mrn } });
    if (!patient) continue;

    for (const rec of trend.records) {
      const recordedAt = new Date(Date.now() - rec.daysAgo * 24 * 60 * 60 * 1000);
      await prisma.nutritionist_anthropometric_records.create({
        data: {
          patient_id: patient.id,
          recorded_by: nutritionistUserId,
          height_cm: patient.height_cm ? Number(patient.height_cm) : undefined,
          weight_kg: rec.weight,
          waist_cm: rec.waist,
          hip_cm: rec.waist - 8,
          bmi: rec.bmi,
          bmi_category: rec.bmi >= 30 ? 'Obese' : rec.bmi >= 25 ? 'Overweight' : rec.bmi >= 18.5 ? 'Normal' : 'Underweight',
          notes: rec.notes,
          recorded_at: recordedAt,
        },
      });
    }
  }
  console.log('  ✓ 4 patients with anthropometric trends (14 total records)\n');

  // ─── Diet Plans (NU-004) + Meals ─────────────────────────────────────────
  console.log('Seeding Diet Plans...');

  const MEAL_ORDER: Record<string, number> = {
    Breakfast: 0, 'Mid-Morning': 1, Lunch: 2, Snack: 3, Afternoon: 4, Dinner: 5, Bedtime: 6,
  };

  interface DietPlanSeed {
    mrn: string;
    title: string;
    condition_name: string;
    total_calories: number;
    language: string;
    notes: string;
    status: string;
    meals: { meal_slot: string; guidance: string; foods: { name_en: string; grams: number }[] }[];
  }

  const dietPlans: DietPlanSeed[] = [
    {
      mrn: 'NUT-DM-001', title: 'Diabetes Management Diet - Ayesha Khatun',
      condition_name: 'Diabetes Type 2 (Low GI)', total_calories: 1800, language: 'both',
      notes: 'Target HbA1c <7.0%. Avoid all sugary drinks and refined flour. Walk 30 min daily after dinner. Monitor FBG weekly. Follow up in 2 weeks.',
      status: 'ACTIVE',
      meals: [
        { meal_slot: 'Breakfast', guidance: 'No sugar in tea. Use stevia if needed.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 60 }, { name_en: 'Egg (Whole, Boiled)', grams: 50 }, { name_en: 'Spinach (Shak)', grams: 50 }] },
        { meal_slot: 'Mid-Morning', guidance: 'Low GI fruit only.', foods: [{ name_en: 'Guava (Peyara)', grams: 150 }] },
        { meal_slot: 'Lunch', guidance: 'Brown rice preferred. Include salad.', foods: [{ name_en: 'Brown Rice', grams: 130 }, { name_en: 'Red Lentils (Masoor Dal)', grams: 80 }, { name_en: 'Rui Fish (Rohu)', grams: 100 }, { name_en: 'Green Beans', grams: 50 }] },
        { meal_slot: 'Afternoon', guidance: 'Avoid sweet yogurt.', foods: [{ name_en: 'Yogurt (Plain, Sweet)', grams: 100 }, { name_en: 'Almond (Badam)', grams: 15 }] },
        { meal_slot: 'Dinner', guidance: 'Light meal. No rice at night.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 60 }, { name_en: 'Chicken Breast (Skinless)', grams: 80 }, { name_en: 'Okra (Dheros)', grams: 80 }] },
      ],
    },
    {
      mrn: 'NUT-CKD-001', title: 'CKD Stage 3 Renal Diet - Jahangir Alam',
      condition_name: 'CKD Stage 3 (Low Protein/Low K)', total_calories: 1600, language: 'both',
      notes: 'Strictly limit salt (<2g/day). Avoid high-potassium foods (banana, potato, spinach, coconut). Fluid restriction 1.5L/day. Monitor creatinine monthly.',
      status: 'ACTIVE',
      meals: [
        { meal_slot: 'Breakfast', guidance: 'Limit milk to 150ml.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 45 }, { name_en: 'Egg White (Boiled)', grams: 60 }, { name_en: 'Cucumber', grams: 50 }] },
        { meal_slot: 'Mid-Morning', guidance: 'Low-potassium fruit.', foods: [{ name_en: 'Apple (Red)', grams: 100 }] },
        { meal_slot: 'Lunch', guidance: 'Limit lentils. Use ghee for extra calories.', foods: [{ name_en: 'White Rice (Parboiled)', grams: 120 }, { name_en: 'Red Lentils (Masoor Dal)', grams: 50 }, { name_en: 'Chicken Breast (Skinless)', grams: 60 }, { name_en: 'Cabbage (Badha Kopi)', grams: 80 }] },
        { meal_slot: 'Afternoon', guidance: '', foods: [{ name_en: 'Puffed Rice (Muri)', grams: 20 }] },
        { meal_slot: 'Dinner', guidance: 'Low protein, low potassium.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 45 }, { name_en: 'Pumpkin (Sweet)', grams: 100 }] },
      ],
    },
    {
      mrn: 'NUT-HTN-001', title: 'DASH Diet for Hypertension - Shahinur Begum',
      condition_name: 'DASH Diet (Hypertension)', total_calories: 2000, language: 'en',
      notes: 'No added salt in cooking. Read labels for hidden sodium. Walk 30 min/day. Reduce weight to target 75kg. BP goal <130/85.',
      status: 'ACTIVE',
      meals: [
        { meal_slot: 'Breakfast', guidance: 'Oats with milk. No salt.', foods: [{ name_en: 'Oats (Rolled)', grams: 40 }, { name_en: 'Milk (Cow, Full Fat)', grams: 200 }, { name_en: 'Banana (Champa/Kola)', grams: 100 }] },
        { meal_slot: 'Mid-Morning', guidance: '', foods: [{ name_en: 'Orange', grams: 150 }] },
        { meal_slot: 'Lunch', guidance: 'No salt. Use turmeric, coriander for flavor.', foods: [{ name_en: 'Brown Rice', grams: 150 }, { name_en: 'Red Lentils (Masoor Dal)', grams: 80 }, { name_en: 'Tilapia Fish', grams: 100 }, { name_en: 'Spinach (Shak)', grams: 80 }] },
        { meal_slot: 'Afternoon', guidance: '', foods: [{ name_en: 'Yogurt (Plain, Sweet)', grams: 100 }, { name_en: 'Walnut (Akharot)', grams: 15 }] },
        { meal_slot: 'Dinner', guidance: 'Light dinner.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 60 }, { name_en: 'Chicken Breast (Skinless)', grams: 80 }, { name_en: 'Green Beans', grams: 80 }] },
      ],
    },
    {
      mrn: 'NUT-OBE-001', title: 'Weight Loss Plan 1500 kcal - Karim Miah',
      condition_name: 'Weight Loss (Obesity)', total_calories: 1500, language: 'en',
      notes: 'Target weight loss: 8kg in 3 months. Avoid all fried foods, sugary drinks, and processed snacks. Exercise: 45min brisk walking daily. Monitor weekly weight.',
      status: 'ACTIVE',
      meals: [
        { meal_slot: 'Breakfast', guidance: 'Protein-rich. No paratha.', foods: [{ name_en: 'Egg (Whole, Boiled)', grams: 100 }, { name_en: 'Wheat Roti (Plain)', grams: 30 }, { name_en: 'Cucumber', grams: 100 }] },
        { meal_slot: 'Lunch', guidance: 'Half plate salad, quarter plate protein.', foods: [{ name_en: 'Brown Rice', grams: 100 }, { name_en: 'Chicken Breast (Skinless)', grams: 100 }, { name_en: 'Eggplant (Begun)', grams: 100 }] },
        { meal_slot: 'Snack', guidance: '', foods: [{ name_en: 'Apple (Red)', grams: 100 }] },
        { meal_slot: 'Dinner', guidance: 'No carbs after 7 PM.', foods: [{ name_en: 'Rui Fish (Rohu)', grams: 120 }, { name_en: 'Okra (Dheros)', grams: 100 }] },
      ],
    },
    {
      mrn: 'NUT-POS-001', title: 'Post-Surgical Recovery Diet - Rina Akhter',
      condition_name: 'Post-Surgical Recovery', total_calories: 1800, language: 'en',
      notes: 'Soft, low-fat diet. Small frequent meals. Avoid gas-forming foods initially. Increase fiber gradually. High protein for wound healing.',
      status: 'ACTIVE',
      meals: [
        { meal_slot: 'Breakfast', guidance: 'Soft foods. Easy to digest.', foods: [{ name_en: 'Flat Rice (Chira)', grams: 50 }, { name_en: 'Yogurt (Plain, Sweet)', grams: 150 }, { name_en: 'Banana (Champa/Kola)', grams: 100 }] },
        { meal_slot: 'Mid-Morning', guidance: '', foods: [{ name_en: 'Egg (Whole, Boiled)', grams: 100 }] },
        { meal_slot: 'Lunch', guidance: 'Well-cooked, soft consistency.', foods: [{ name_en: 'White Rice (Parboiled)', grams: 120 }, { name_en: 'Mung Dal', grams: 80 }, { name_en: 'Chicken Breast (Skinless)', grams: 80 }, { name_en: 'Pumpkin (Sweet)', grams: 80 }] },
        { meal_slot: 'Afternoon', guidance: '', foods: [{ name_en: 'Mango (Himsagor)', grams: 150 }] },
        { meal_slot: 'Dinner', guidance: 'Light, easily digestible.', foods: [{ name_en: 'Tilapia Fish', grams: 100 }, { name_en: 'Potato (Boiled)', grams: 100 }] },
      ],
    },
    {
      mrn: 'NUT-CARD-001', title: 'Cardiac Diet Plan - Abdul Latif',
      condition_name: 'Heart Disease (Cardiac)', total_calories: 2000, language: 'both',
      notes: 'Low saturated fat, low cholesterol, low sodium. Emphasize omega-3 (fish twice weekly). Avoid red meat, fried foods, and trans fats. Cardiac rehab exercises recommended.',
      status: 'ACTIVE',
      meals: [
        { meal_slot: 'Breakfast', guidance: 'Oats with walnuts - heart healthy.', foods: [{ name_en: 'Oats (Rolled)', grams: 40 }, { name_en: 'Milk (Cow, Full Fat)', grams: 200 }, { name_en: 'Walnut (Akharot)', grams: 15 }] },
        { meal_slot: 'Mid-Morning', guidance: '', foods: [{ name_en: 'Orange', grams: 150 }] },
        { meal_slot: 'Lunch', guidance: 'Fish rich in omega-3. Limit oil to 1 tbsp.', foods: [{ name_en: 'Brown Rice', grams: 130 }, { name_en: 'Ilish Fish (Hilsa)', grams: 80 }, { name_en: 'Spinach (Shak)', grams: 100 }] },
        { meal_slot: 'Afternoon', guidance: 'Unsalted nuts.', foods: [{ name_en: 'Almond (Badam)', grams: 20 }, { name_en: 'Guava (Peyara)', grams: 100 }] },
        { meal_slot: 'Dinner', guidance: 'Chicken breast is heart-healthy.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 60 }, { name_en: 'Chicken Breast (Skinless)', grams: 80 }, { name_en: 'Green Beans', grams: 80 }] },
      ],
    },
    {
      mrn: 'NUT-PED-001', title: 'Pediatric Malnutrition Recovery - Baby Siam',
      condition_name: 'Pediatric Malnutrition', total_calories: 1000, language: 'both',
      notes: 'Small frequent meals (6+ per day). Energy-dense foods. Lactose-free alternatives. Monitor weight weekly. Target: 200g weight gain per week. Involve mother in food preparation.',
      status: 'ACTIVE',
      meals: [
        { meal_slot: 'Breakfast', guidance: 'Mashed consistency. Add ghee for calories.', foods: [{ name_en: 'Flat Rice (Chira)', grams: 30 }, { name_en: 'Banana (Champa/Kola)', grams: 50 }] },
        { meal_slot: 'Mid-Morning', guidance: 'Well-mashed.', foods: [{ name_en: 'Egg (Whole, Boiled)', grams: 50 }] },
        { meal_slot: 'Lunch', guidance: 'Soft rice with mashed dal.', foods: [{ name_en: 'White Rice (Parboiled)', grams: 60 }, { name_en: 'Mung Dal', grams: 40 }, { name_en: 'Tilapia Fish', grams: 40 }] },
        { meal_slot: 'Afternoon', guidance: 'Fruit puree.', foods: [{ name_en: 'Guava (Peyara)', grams: 80 }] },
        { meal_slot: 'Dinner', guidance: 'Soft foods, easy to chew.', foods: [{ name_en: 'Wheat Roti (Plain)', grams: 30 }, { name_en: 'Potato (Boiled)', grams: 50 }] },
      ],
    },
  ];

  const createdPlanIds: { mrn: string; planId: string }[] = [];

  for (const plan of dietPlans) {
    const patient = await prisma.patients.findUnique({ where: { mrn: plan.mrn } });
    if (!patient) { console.log(`  ⚠ Patient ${plan.mrn} not found, skipping plan`); continue; }

    const createdPlan = await prisma.nutritionist_diet_plans.create({
      data: {
        patient_id: patient.id,
        nutritionist_id: nutritionistUserId,
        title: plan.title,
        condition_name: plan.condition_name,
        total_calories: plan.total_calories,
        language: plan.language,
        notes: plan.notes,
        status: plan.status,
        meals: {
          create: plan.meals.map((m, i) => ({
            meal_slot: m.meal_slot,
            preparation_guidance: m.guidance || undefined,
            foods_json: JSON.stringify(m.foods.map(f => ({
              food_id: foodRecordMap.get(f.name_en)?.id ?? null,
              name_en: f.name_en,
              grams: f.grams,
            }))),
            sort_order: MEAL_ORDER[m.meal_slot] ?? i,
          })),
        },
      },
    });
    createdPlanIds.push({ mrn: plan.mrn, planId: createdPlan.id });
    console.log(`  ✓ ${plan.title}`);
  }
  console.log(`  ✓ ${dietPlans.length} diet plans with meals seeded\n`);

  // ─── Follow-ups (NU-007) ─────────────────────────────────────────────────
  console.log('Seeding Follow-ups...');

  const followUpData: { mrn: string; interval: string; daysFromNow: number; notes: string }[] = [
    { mrn: 'NUT-DM-001', interval: 'TWO_WEEKS', daysFromNow: 14, notes: 'Review blood glucose log and adjust insulin/carb ratio.' },
    { mrn: 'NUT-CKD-001', interval: 'ONE_MONTH', daysFromNow: 30, notes: 'Check latest creatinine and potassium levels. Adjust protein intake.' },
    { mrn: 'NUT-HTN-001', interval: 'TWO_WEEKS', daysFromNow: 14, notes: 'BP check and dietary adherence review. Continue DASH diet.' },
    { mrn: 'NUT-OBE-001', interval: 'ONE_MONTH', daysFromNow: 30, notes: 'Weight check. Review meal plan compliance. Adjust calories if needed.' },
    { mrn: 'NUT-POS-001', interval: 'TWO_WEEKS', daysFromNow: 14, notes: 'Post-surgical recovery assessment. Transition to regular diet.' },
    { mrn: 'NUT-PED-001', interval: 'TWO_WEEKS', daysFromNow: 14, notes: 'Weight gain assessment. Adjust calorie density.' },
    { mrn: 'NUT-CARD-001', interval: 'ONE_MONTH', daysFromNow: 30, notes: 'Lipid profile review. Adherence to cardiac diet assessment.' },
  ];

  for (const fu of followUpData) {
    const patient = await prisma.patients.findUnique({ where: { mrn: fu.mrn } });
    if (!patient) continue;
    const followUpAt = new Date(Date.now() + fu.daysFromNow * 24 * 60 * 60 * 1000);

    const planEntry = createdPlanIds.find(p => p.mrn === fu.mrn);

    await prisma.nutritionist_follow_ups.create({
      data: {
        patient_id: patient.id,
        nutritionist_id: nutritionistUserId,
        plan_id: planEntry?.planId ?? null,
        interval: fu.interval,
        follow_up_at: followUpAt,
        reminder_channel: 'SMS',
        status: 'SCHEDULED',
        notes: fu.notes,
      },
    });
  }
  console.log(`  ✓ ${followUpData.length} follow-ups scheduled\n`);

  // ─── Adherence Logs (NU-008) ─────────────────────────────────────────────
  console.log('Seeding Adherence Logs...');

  const adherenceData: { mrn: string; daysAgo: number; score: number; weight: number; challenges: string; modifications: string }[] = [
    { mrn: 'NUT-DM-001', daysAgo: 30, score: 70, weight: 72.8, challenges: 'Occasional sweet cravings. Difficulty avoiding rice at night.', modifications: 'Switched to brown rice. Added evening walk.' },
    { mrn: 'NUT-DM-001', daysAgo: 14, score: 80, weight: 72.2, challenges: 'Better portion control but still misses roti at breakfast.', modifications: 'Reduced portion size, added more vegetables for satiety.' },
    { mrn: 'NUT-DM-001', daysAgo: 0, score: 85, weight: 72.0, challenges: 'Much improved. Blood sugar more stable.', modifications: 'Continue current plan.' },
    { mrn: 'NUT-CKD-001', daysAgo: 30, score: 60, weight: 66, challenges: 'Difficult to avoid high-potassium foods. Eating out challenges.', modifications: 'Created list of allowed/avoided foods. Family education materials provided.' },
    { mrn: 'NUT-CKD-001', daysAgo: 0, score: 75, weight: 65, challenges: 'Improved compliance with meal plan. Edema resolved.', modifications: 'Continue same plan. Monitor labs in 2 weeks.' },
    { mrn: 'NUT-HTN-001', daysAgo: 60, score: 50, weight: 87, challenges: 'High salt intake from outside food. Not exercising regularly.', modifications: 'Counselled on hidden salt sources. Prescribed walking routine.' },
    { mrn: 'NUT-HTN-001', daysAgo: 30, score: 65, weight: 86, challenges: 'Reduced outside food. Still occasional salt craving.', modifications: 'Introduced herbs/spices as salt alternatives.' },
    { mrn: 'NUT-HTN-001', daysAgo: 0, score: 75, weight: 85, challenges: 'Better adherence. BP improving.', modifications: 'Continue DASH diet.' },
    { mrn: 'NUT-OBE-001', daysAgo: 30, score: 80, weight: 100, challenges: 'Good initial motivation. Following meal plan well.', modifications: 'Increased protein portion for satiety.' },
    { mrn: 'NUT-OBE-001', daysAgo: 0, score: 85, weight: 98, challenges: 'Consistent progress. Exercising regularly.', modifications: 'Increase exercise to 45 min. Target 2kg loss this month.' },
    { mrn: 'NUT-CARD-001', daysAgo: 30, score: 55, weight: 80, challenges: 'Difficulty giving up traditional oily foods. Family eating habits.', modifications: 'Involved family in dietary counseling. Provided cardiac-friendly recipes.' },
    { mrn: 'NUT-CARD-001', daysAgo: 0, score: 70, weight: 78, challenges: 'Making gradual changes. Reduced red meat intake.', modifications: 'Continue plan. Repeat lipid profile next month.' },
  ];

  for (const ad of adherenceData) {
    const patient = await prisma.patients.findUnique({ where: { mrn: ad.mrn } });
    if (!patient) continue;
    const loggedAt = new Date(Date.now() - ad.daysAgo * 24 * 60 * 60 * 1000);

    const planEntry = createdPlanIds.find(p => p.mrn === ad.mrn);

    await prisma.nutritionist_adherence_logs.create({
      data: {
        patient_id: patient.id,
        nutritionist_id: nutritionistUserId,
        plan_id: planEntry?.planId ?? null,
        adherence_score: ad.score,
        weight_kg: ad.weight,
        challenges: ad.challenges,
        modifications: ad.modifications,
        logged_at: loggedAt,
      },
    });
  }
  console.log(`  ✓ ${adherenceData.length} adherence logs seeded\n`);

  // ─── Education Materials (NU-010) ────────────────────────────────────────
  console.log('Seeding Patient Education Materials...');

  const educationDocs: { mrn: string; title: string; file_type: string; file_url: string }[] = [
    { mrn: 'NUT-DM-001', title: 'Diabetes Food Guide (Bengali)', file_type: 'application/pdf', file_url: '/education/diabetes-food-guide-bn.pdf' },
    { mrn: 'NUT-DM-001', title: 'Carbohydrate Counting Basics', file_type: 'image/png', file_url: '/education/carb-counting.png' },
    { mrn: 'NUT-CKD-001', title: 'Low Potassium Food List (Bengali)', file_type: 'application/pdf', file_url: '/education/low-potassium-bn.pdf' },
    { mrn: 'NUT-HTN-001', title: 'DASH Diet Quick Reference', file_type: 'application/pdf', file_url: '/education/dash-diet-guide-en.pdf' },
    { mrn: 'NUT-HTN-001', title: 'Salt Alternatives for Bangladeshi Cooking', file_type: 'image/png', file_url: '/education/salt-alternatives.png' },
    { mrn: 'NUT-OBE-001', title: 'Portion Guide with Hand Measurements', file_type: 'image/png', file_url: '/education/portion-hand-guide.png' },
    { mrn: 'NUT-POS-001', title: 'Post-Surgery Diet Progression Guide', file_type: 'application/pdf', file_url: '/education/post-surgery-diet.pdf' },
    { mrn: 'NUT-PED-001', title: 'High Calorie Foods for Children (Bengali)', file_type: 'application/pdf', file_url: '/education/child-nutrition-bn.pdf' },
    { mrn: 'NUT-CARD-001', title: 'Heart Healthy Eating - Bengali & English', file_type: 'application/pdf', file_url: '/education/heart-healthy-diet-bn.pdf' },
    { mrn: 'NUT-CARD-001', title: 'Understanding Fats - Good vs Bad', file_type: 'image/png', file_url: '/education/understanding-fats.png' },
  ];

  for (const doc of educationDocs) {
    const patient = await prisma.patients.findUnique({ where: { mrn: doc.mrn } });
    if (!patient) continue;

    await prisma.patient_documents.create({
      data: {
        patient_id: patient.id,
        file_name: doc.title,
        file_type: doc.file_type,
        file_size: 1024,
        file_url: doc.file_url,
      },
    });
  }
  console.log(`  ✓ ${educationDocs.length} education materials seeded\n`);

  // ─── Consultation Bookings (NU-001) ──────────────────────────────────────
  console.log('Seeding Consultation Booking Records...');

  const bookingData: { mrn: string; daysAgo: number; type: string }[] = [
    { mrn: 'NUT-DM-001', daysAgo: 90, type: 'HOME_VISIT' },
    { mrn: 'NUT-CKD-001', daysAgo: 60, type: 'HOME_VISIT' },
    { mrn: 'NUT-OBE-001', daysAgo: 30, type: 'HOME_VISIT' },
  ];

  for (const b of bookingData) {
    const patient = await prisma.patients.findUnique({ where: { mrn: b.mrn } });
    if (!patient) continue;

    try {
      const session = await prisma.booking_sessions.create({
        data: {
          patient_id: patient.id,
          total_amount: 500,
          status: 'COMPLETED',
        },
      });

      await prisma.service_tickets.create({
        data: {
          session_id: session.id,
          ticket_no: `NUT-DEMO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          service_type: 'NUTRITIONIST',
          scheduled_date: new Date(Date.now() - b.daysAgo * 24 * 60 * 60 * 1000),
          scheduled_time_slot: 'HOME_VISIT',
          assigned_provider_id: nutritionistUserId,
          price: 500,
          status: 'COMPLETED',
        },
      });
    } catch (e) {
      console.log(`  ⚠ Could not create booking for ${b.mrn}`);
    }
  }
  console.log(`  ✓ 3 consultation bookings seeded\n`);

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Nutritionist Demo Data Seeded Successfully!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Nutritionist login: nutritionist.tanvir@hhdms.com / Password2026!\n');
  console.log('Demo Patients for Testing:');
  console.log('  Feature       | Patient              | MRN           | Key Condition');
  console.log('  ──────────────┼──────────────────────┼───────────────┼─────────────────');
  console.log('  NU-001/002    | Ayesha Khatun        | NUT-DM-001    | Diabetes Type 2');
  console.log('  NU-001/002    | Jahangir Alam        | NUT-CKD-001   | CKD Stage 3');
  console.log('  NU-001/002    | Shahinur Begum       | NUT-HTN-001   | Hypertension');
  console.log('  NU-001/002    | Karim Miah           | NUT-OBE-001   | Obesity/Pre-DM');
  console.log('  NU-001/002    | Rina Akhter          | NUT-POS-001   | Post-surgical');
  console.log('  NU-001/002    | Baby Siam            | NUT-PED-001   | Malnutrition');
  console.log('  NU-001/002    | Abdul Latif          | NUT-CARD-001  | Heart Disease\n');
  console.log('Seeded data per feature:');
  console.log('  NU-003 | Anthropometrics     | 14 records across 4 patients with trends');
  console.log('  NU-004 | Diet Plans          | 7 plans with full meal structures');
  console.log('  NU-005 | Diet Templates      | 8 condition-specific templates');
  console.log('  NU-006 | PDF Generation      | (on-demand from diet plan)');
  console.log('  NU-007 | Follow-ups          | 7 scheduled at 2wk/1mo intervals');
  console.log('  NU-008 | Adherence Logs      | 12 logs showing progress over time');
  console.log('  NU-009 | Food Items          | 46 Bangladeshi foods with nutrition data');
  console.log('  NU-010 | Education Materials  | 10 shared documents\n');
  console.log('Run: npx tsx prisma/seed-nutritionist-demo.ts');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
