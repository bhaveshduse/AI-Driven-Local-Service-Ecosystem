import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Vendor from "./models/Vendor.js";
import Service from "./models/Service.js";
import Category from "./models/Category.js";

dotenv.config({ override: true });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/Swayam";

const NASHIK_CENTER = [73.7898, 19.9975];

const categoryImages = [
  "uploads/categories/category-1772124028748.jpg",
  "uploads/categories/category-1772128544484.jpg",
  "uploads/categories/category-6984fa309a1b312df562ac0b-1770479275503.jpeg",
];

const serviceImages = [
  "uploads/service-1771363190895.jpg",
  "uploads/service-1771363202632.jpg",
  "uploads/service-1771363401760.jpg",
  "uploads/service-1771363712677.jpg",
  "uploads/service-1771505013094.jpg",
  "uploads/service-1771505496361.webp",
  "uploads/service-1771505512996.avif",
  "uploads/service-1771505552442.jpeg",
  "uploads/service-1771505998461.avif",
  "uploads/service-1771506017459.avif",
  "uploads/service-1771506063897.jpeg",
  "uploads/service-1771506083469.jpeg",
  "uploads/service-1771506105526.jpeg",
  "uploads/service-1771506248672.jpeg",
  "uploads/service-1772218060259.jpeg",
  "uploads/service-1772220152631.jpeg",
  "uploads/service-1772220269577.jpeg",
  "uploads/service-1772221210169.jpeg",
  "uploads/service-1772222684536.jpeg",
  "uploads/service-1772222994415.jpeg",
  "uploads/service-1772223124547.jpeg",
  "uploads/service-1772223383822.jpeg",
  "uploads/service-1772223386279.jpeg",
  "uploads/service-1772223448740.jpeg",
  "uploads/service-1772223753212.jpeg",
  "uploads/service-1772223754537.jpeg",
  "uploads/service-1772223755800.jpeg",
  "uploads/service-1772223971865.jpeg",
];

const vendorImages = [
  "uploads/vendor-1770585035488.png",
  "uploads/vendor-1770585035538.png",
  "uploads/vendor-1770585063551.png",
  "uploads/vendor-1770585063569.png",
  "uploads/vendor-1770585098806.png",
  "uploads/vendor-1770585098834.png",
  "uploads/vendor-1770585513046.png",
  "uploads/vendor-1770585513165.png",
  "uploads/vendor-1770585636117.png",
  "uploads/vendor-1770900800928.png",
  "uploads/vendor-1770917738909.jpeg",
  "uploads/vendor-1776257982879.jpg",
  "uploads/vendor-1776258567476.jpg",
  "uploads/vendor-1776258597211.jpg",
  "uploads/vendor-1776260848412.jpg",
  "uploads/vendor-1776267857713.jpg",
  "uploads/vendor-1776269078183.jpg",
  "uploads/vendor-1776269733305.jpg",
];

const categories = [
  { slug: "plumbing", name: "Plumbing", icon: "🔧", image: categoryImages[0], description: "Pipe repair, leakage fix, installation", priority: 6 },
  { slug: "electrical", name: "Electrical", icon: "⚡", image: categoryImages[1], description: "Wiring, switch repair, fan/light installation", priority: 5 },
  { slug: "carpentry", name: "Carpentry", icon: "🔨", image: categoryImages[2], description: "Furniture repair, door/window work, woodwork", priority: 4 },
  { slug: "cleaning", name: "Cleaning", icon: "🧽", image: categoryImages[0], description: "Home cleaning, deep cleaning, kitchen/bathroom", priority: 3 },
  { slug: "painting", name: "Painting", icon: "🎨", image: categoryImages[1], description: "Interior/exterior painting, wall treatment", priority: 2 },
  { slug: "appliance-repair", name: "Appliance Repair", icon: "🔌", image: categoryImages[2], description: "Washing machine, fridge, AC repair", priority: 1 },
];

const vendors = [
  {
    user: { name: "Rajesh Patil", email: "rajesh.patil@example.com", phone: "9876543210", password: "Vendor@123" },
    vendor: { businessName: "Patil Plumbing Works", primaryCategory: "plumbing", serviceCategories: ["plumbing"], experience: 8, description: "Professional plumbing services in Nashik. Pipe fitting, leakage repair, bathroom renovation.", portfolio: [vendorImages[0], vendorImages[1]] },
    services: [
      { title: "Pipe Leakage Repair", category: "plumbing", description: "Expert diagnosis and repair of all types of pipe leaks. Includes water supply, drainage, and concealed pipes.", pricing: { type: "fixed", amount: 500, unit: "per job" }, duration: { estimated: 60, unit: "minutes" }, tags: ["leak", "pipe", "plumbing"], images: [serviceImages[0], serviceImages[1]] },
      { title: "Bathroom Fitting Installation", category: "plumbing", description: "Complete bathroom fitting installation including taps, shower, WC, and basin.", pricing: { type: "custom", amount: 2500, unit: "per job" }, duration: { estimated: 180, unit: "minutes" }, tags: ["bathroom", "installation", "fitting"], images: [serviceImages[2], serviceImages[3]] },
    ],
  },
  {
    user: { name: "Suresh Jadhav", email: "suresh.jadhav@example.com", phone: "9876543211", password: "Vendor@123" },
    vendor: { businessName: "Jadhav Electricals", primaryCategory: "electrical", serviceCategories: ["electrical"], experience: 12, description: "Licensed electrician with 12+ years experience. Home wiring, inverter setup, board repair.", portfolio: [vendorImages[2], vendorImages[3]] },
    services: [
      { title: "Switch Board Repair", category: "electrical", description: "Repair or replace faulty switch boards, MCBs, and RCCBs. Safety inspection included.", pricing: { type: "fixed", amount: 400, unit: "per job" }, duration: { estimated: 45, unit: "minutes" }, tags: ["switch", "board", "repair"], images: [serviceImages[4], serviceImages[5]] },
      { title: "Fan & Light Installation", category: "electrical", description: "Ceiling fan, exhaust fan, LED light, tube light installation and replacement.", pricing: { type: "fixed", amount: 300, unit: "per item" }, duration: { estimated: 30, unit: "minutes" }, tags: ["fan", "light", "installation"], images: [serviceImages[6], serviceImages[7]] },
    ],
  },
  {
    user: { name: "Priya More", email: "priya.more@example.com", phone: "9876543212", password: "Vendor@123" },
    vendor: { businessName: "Sparkle Home Cleaning", primaryCategory: "cleaning", serviceCategories: ["cleaning"], experience: 5, description: "Professional home cleaning service. Eco-friendly products, trained staff, satisfaction guaranteed.", portfolio: [vendorImages[4], vendorImages[5]] },
    services: [
      { title: "Deep Home Cleaning", category: "cleaning", description: "Complete deep cleaning of 1BHK/2BHK/3BHK. Includes kitchen, bathrooms, floors, windows.", pricing: { type: "fixed", amount: 1500, unit: "per visit" }, duration: { estimated: 240, unit: "minutes" }, tags: ["deep-clean", "home", "full"], images: [serviceImages[8], serviceImages[9]] },
      { title: "Kitchen Deep Cleaning", category: "cleaning", description: "Intensive kitchen cleaning including chimney, tiles, sink, cabinets, and countertop degreasing.", pricing: { type: "fixed", amount: 800, unit: "per visit" }, duration: { estimated: 120, unit: "minutes" }, tags: ["kitchen", "deep-clean"], images: [serviceImages[10], serviceImages[11]] },
    ],
  },
  {
    user: { name: "Anil Deshmukh", email: "anil.deshmukh@example.com", phone: "9876543213", password: "Vendor@123" },
    vendor: { businessName: "Deshmukh Wood Works", primaryCategory: "carpentry", serviceCategories: ["carpentry"], experience: 15, description: "Traditional and modern carpentry. Custom furniture, door/window repair, modular work.", portfolio: [vendorImages[6], vendorImages[7]] },
    services: [
      { title: "Door & Window Repair", category: "carpentry", description: "Repair or replace door hinges, locks, frames, window panels, and glass fitting.", pricing: { type: "fixed", amount: 600, unit: "per job" }, duration: { estimated: 90, unit: "minutes" }, tags: ["door", "window", "repair"], images: [serviceImages[12], serviceImages[13]] },
      { title: "Custom Furniture Making", category: "carpentry", description: "Customized wooden furniture — shelves, cots, tables, wardrobes. Free consultation and measurement.", pricing: { type: "custom", amount: 5000, unit: "per piece" }, duration: { estimated: 480, unit: "minutes" }, tags: ["furniture", "custom", "woodwork"], images: [serviceImages[14], serviceImages[15]] },
    ],
  },
  {
    user: { name: "Kavita Sharma", email: "kavita.sharma@example.com", phone: "9876543214", password: "Vendor@123" },
    vendor: { businessName: "ColorCraft Painters", primaryCategory: "painting", serviceCategories: ["painting"], experience: 7, description: "Interior and exterior painting specialists. Asian Paints and Berger authorized applicator.", portfolio: [vendorImages[8], vendorImages[9]] },
    services: [
      { title: "Interior Wall Painting", category: "painting", description: "Complete interior wall painting with primer + 2 coats. Includes surface preparation and masking.", pricing: { type: "custom", amount: 3000, unit: "per room" }, duration: { estimated: 480, unit: "minutes" }, tags: ["interior", "wall", "painting"], images: [serviceImages[16], serviceImages[17]] },
      { title: "Exterior Building Painting", category: "painting", description: "Weather-resistant exterior painting. Surface cleaning, putty, primer, and paint application.", pricing: { type: "custom", amount: 5000, unit: "per sq ft" }, duration: { estimated: 600, unit: "minutes" }, tags: ["exterior", "building", "painting"], images: [serviceImages[18], serviceImages[19]] },
    ],
  },
];

const customers = [
  { name: "Amit Kumar", email: "amit.kumar@example.com", phone: "9876543220", password: "User@123", city: "Nashik", profileImage: vendorImages[10] },
  { name: "Neha Gupta", email: "neha.gupta@example.com", phone: "9876543221", password: "User@123", city: "Nashik", profileImage: vendorImages[11] },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // --- Admin ---
    const adminExists = await User.findOne({ email: "dusebhavesh6@gmail.com" });
    if (adminExists) {
      adminExists.password = "BhaveshDuse";
      adminExists.isActive = true;
      adminExists.isVerified = true;
      await adminExists.save();
      console.log("Admin user updated.");
    } else {
      await User.create({
        name: "Bhavesh Duse",
        email: "dusebhavesh6@gmail.com",
        password: "BhaveshDuse",
        phone: "9999999999",
        city: "Nashik",
        role: "admin",
        isActive: true,
        isVerified: true,
      });
      console.log("Admin user created.");
    }

    // --- Categories ---
    for (const cat of categories) {
      const exists = await Category.findOne({ slug: cat.slug });
      if (exists) {
        exists.image = cat.image;
        await exists.save();
        console.log(`Category updated: ${cat.name}`);
      } else {
        await Category.create(cat);
        console.log(`Category created: ${cat.name}`);
      }
    }

    // --- Customers ---
    for (const c of customers) {
      const exists = await User.findOne({ email: c.email });
      if (exists) {
        exists.profileImage = c.profileImage;
        await exists.save();
        console.log(`Customer updated: ${c.name}`);
      } else {
        await User.create({ ...c, role: "customer", isActive: true, isVerified: true });
        console.log(`Customer created: ${c.name}`);
      }
    }

    // --- Vendors ---
    for (const v of vendors) {
      const existingUser = await User.findOne({ email: v.user.email });

      const lng = NASHIK_CENTER[0] + (Math.random() - 0.5) * 0.04;
      const lat = NASHIK_CENTER[1] + (Math.random() - 0.5) * 0.04;

      let user;
      if (existingUser) {
        user = existingUser;
        console.log(`Vendor user exists: ${v.user.name}`);
      } else {
        user = await User.create({
          ...v.user,
          city: "Nashik",
          role: "vendor",
          isActive: true,
          isVerified: true,
          address: {
            street: "College Road",
            state: "Maharashtra",
            zipCode: "422005",
            coordinates: [lng, lat],
          },
        });
      }

      let vendorDoc = await Vendor.findOne({ user: user._id });
      if (vendorDoc) {
        vendorDoc.portfolio = v.vendor.portfolio;
        await vendorDoc.save();
        console.log(`Vendor updated: ${v.vendor.businessName}`);
      } else {
        vendorDoc = await Vendor.create({
          user: user._id,
          businessName: v.vendor.businessName,
          primaryCategory: v.vendor.primaryCategory,
          serviceCategories: v.vendor.serviceCategories,
          experience: v.vendor.experience,
          description: v.vendor.description,
          portfolio: v.vendor.portfolio,
          verificationStatus: "verified",
          serviceArea: { radius: 15, cities: ["Nashik"] },
          workingLocation: { type: "Point", coordinates: [lng, lat] },
          availability: {
            schedule: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => ({
              day,
              startTime: "09:00",
              endTime: "18:00",
              available: true,
            })),
          },
        });
        console.log(`Vendor created: ${v.vendor.businessName}`);
      }

      // Update or create services with images
      for (const s of v.services) {
        const existingService = await Service.findOne({ vendor: vendorDoc._id, title: s.title });
        if (existingService) {
          existingService.images = s.images;
          existingService.pricing = s.pricing;
          existingService.duration = s.duration;
          await existingService.save();
          console.log(`  Service updated: ${s.title}`);
        } else {
          await Service.create({
            ...s,
            vendor: vendorDoc._id,
            location: { type: "Point", coordinates: [lng, lat] },
            isActive: true,
          });
          console.log(`  Service created: ${s.title}`);
        }
      }
    }

    console.log("\nSeed complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
