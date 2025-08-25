import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { products } from "@shared/schema";

// Official Voltvera products from the presentation
const voltveraProducts = [
  {
    name: "VERAPURE ALKALINE {Basic Model}",
    description: "Basic model alkaline water purifier with essential filtration technology for clean, healthy drinking water.",
    price: "11500.00",
    bv: "5750.00", 
    gst: "18.00",
    category: "water_purifier",
    purchaseType: "first_purchase" as const,
    imageUrl: null,
  },
  {
    name: "VERAPURE ALKALINE {Premium Model}",
    description: "Premium alkaline water purifier with advanced filtration and enhanced mineral retention technology.",
    price: "13500.00",
    bv: "6750.00",
    gst: "18.00", 
    category: "water_purifier",
    purchaseType: "first_purchase" as const,
    imageUrl: null,
  },
  {
    name: "VERAPURE+ ALKALINE {Elite}",
    description: "Elite model alkaline water purifier featuring premium build quality and superior filtration performance.",
    price: "19100.00",
    bv: "9550.00",
    gst: "18.00",
    category: "water_purifier", 
    purchaseType: "first_purchase" as const,
    imageUrl: null,
  },
  {
    name: "VERAPURE {SUPER PREMIUM}",
    description: "Super premium alkaline water purifier with cutting-edge technology and maximum filtration capacity.",
    price: "24000.00",
    bv: "12000.00",
    gst: "18.00",
    category: "water_purifier",
    purchaseType: "first_purchase" as const,
    imageUrl: null,
  },
  {
    name: "LED 32",
    description: "32-inch LED TV with crystal clear display, smart features, and energy-efficient technology.",
    price: "12500.00", 
    bv: "6250.00",
    gst: "28.00",
    category: "led_tv",
    purchaseType: "second_purchase" as const,
    imageUrl: null,
  },
  {
    name: "LED 43", 
    description: "43-inch LED TV with full HD display, advanced connectivity options, and premium viewing experience.",
    price: "19000.00",
    bv: "9500.00", 
    gst: "28.00",
    category: "led_tv",
    purchaseType: "second_purchase" as const,
    imageUrl: null,
  },
  {
    name: "LED 55",
    description: "55-inch large screen LED TV with 4K resolution, smart interface, and immersive entertainment features.",
    price: "42000.00",
    bv: "21000.00",
    gst: "28.00", 
    category: "led_tv",
    purchaseType: "second_purchase" as const,
    imageUrl: null,
  },
  {
    name: "BLDC FAN SANORITA",
    description: "Energy-efficient BLDC ceiling fan with stylish design, remote control, and superior air circulation.",
    price: "3800.00",
    bv: "1900.00",
    gst: "18.00",
    category: "ceiling_fan",
    purchaseType: "second_purchase" as const, 
    imageUrl: null,
  },
  {
    name: "BLDC FAN TEJAS",
    description: "Premium BLDC ceiling fan with modern aesthetics, variable speed control, and energy-saving technology.",
    price: "5700.00",
    bv: "2850.00",
    gst: "18.00",
    category: "ceiling_fan",
    purchaseType: "second_purchase" as const,
    imageUrl: null,
  },
  {
    name: "BLDC FAN Hunter",
    description: "High-performance BLDC ceiling fan with premium build quality, advanced motor technology, and superior durability.",
    price: "7600.00",
    bv: "3800.00", 
    gst: "18.00",
    category: "ceiling_fan",
    purchaseType: "second_purchase" as const,
    imageUrl: null,
  },
];

export async function seedProducts() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    console.log("Seeding official Voltvera products...");
    
    for (const product of voltveraProducts) {
      await db.insert(products).values(product).onConflictDoNothing();
      console.log(`✅ Added: ${product.name}`);
    }
    
    console.log(`✅ Successfully seeded ${voltveraProducts.length} official Voltvera products!`);
    
  } catch (error) {
    console.error("❌ Error seeding products:", error);
  } finally {
    await pool.end();
  }
}

// Run if called directly (ES module style)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProducts();
}