import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-production';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.PORT = '0';

  process.env.SMTP_HOST = 'localhost';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_USER = 'test@test.com';
  process.env.SMTP_PASS = 'test';
  process.env.EMAIL_USER = 'test@test.com';
  process.env.EMAIL_PASS = 'test';
  process.env.HF_TOKEN = 'test-hf-token';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.AI_SERVICE_URL = 'http://localhost:8000';

  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
