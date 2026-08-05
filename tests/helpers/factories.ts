import mongoose from 'mongoose';

export interface User {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'customer' | 'vendor' | 'admin';
  city: string;
  isActive: boolean;
  isVerified: boolean;
  save: () => Promise<User>;
}

export interface VendorDoc {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  businessName: string;
  serviceCategories: string[];
  verificationStatus: string;
  save: () => Promise<VendorDoc>;
}

export interface ServiceDoc {
  _id: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  title: string;
  category: string;
  description: string;
  pricing: { type: string; amount: number; unit: string };
  isActive: boolean;
}

export interface BookingDoc {
  _id: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  status: string;
  scheduledDate: Date;
  price: { amount: number; platformFee: number; vendorPayout: number };
}

export async function createUser(overrides: Partial<User> = {}): Promise<User> {
  const User = (await import('../../server/models/User.js')).default;
  const user = new User({
    name: overrides.name || 'Test User',
    email: overrides.email || `test${Date.now()}@example.com`,
    password: overrides.password || 'password123',
    phone: overrides.phone || '9876543210',
    role: overrides.role || 'customer',
    city: overrides.city || 'Mumbai',
    isActive: overrides.isActive ?? true,
    isVerified: overrides.isVerified ?? false,
  });
  await user.save();
  return user;
}

export async function createVendor(
  userOverride: Partial<User> = {},
  vendorOverride: Partial<VendorDoc> = {}
): Promise<{ user: User; vendor: VendorDoc }> {
  const user = await createUser({ ...userOverride, role: 'vendor' });
  const Vendor = (await import('../../server/models/Vendor.js')).default;
  const vendor = new Vendor({
    user: user._id,
    businessName: vendorOverride.businessName || 'Test Business',
    serviceCategories: vendorOverride.serviceCategories || ['plumbing'],
    verificationStatus: vendorOverride.verificationStatus || 'verified',
  });
  await vendor.save();

  (user as any).vendorId = vendor._id;
  return { user, vendor };
}

export async function createAdmin(overrides: Partial<User> = {}): Promise<User> {
  return createUser({ ...overrides, role: 'admin' });
}

export async function createService(
  vendorId: mongoose.Types.ObjectId,
  overrides: Partial<ServiceDoc> = {}
): Promise<ServiceDoc> {
  const Service = (await import('../../server/models/Service.js')).default;
  const service = new Service({
    vendor: vendorId,
    title: overrides.title || 'Test Service',
    category: overrides.category || 'plumbing',
    description: overrides.description || 'A test service description',
    pricing: overrides.pricing || { type: 'fixed', amount: 500, unit: 'per job' },
    isActive: overrides.isActive ?? true,
    location: overrides.location ?? { type: 'Point', coordinates: [72.8777, 19.0760] },
  });
  await service.save();
  return service;
}

export async function createCategory(overrides: any = {}): Promise<any> {
  const Category = (await import('../../server/models/Category.js')).default;
  const slug = overrides.slug || `test-cat-${Date.now()}`;
  const category = new Category({
    slug,
    name: overrides.name || 'Test Category',
    isActive: overrides.isActive ?? true,
    ...overrides,
  });
  await category.save();
  return category;
}

export async function createBooking(
  overrides: Partial<BookingDoc> = {}
): Promise<any> {
  const Booking = (await import('../../server/models/Booking.js')).default;
  const booking = new Booking({
    customer: overrides.customer || new mongoose.Types.ObjectId(),
    vendor: overrides.vendor || new mongoose.Types.ObjectId(),
    service: overrides.service || new mongoose.Types.ObjectId(),
    status: overrides.status || 'pending',
    scheduledDate: overrides.scheduledDate || new Date(Date.now() + 86400000),
    price: overrides.price || { amount: 500, platformFee: 50, vendorPayout: 450 },
  });
  await booking.save();
  return booking;
}
