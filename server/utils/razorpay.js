import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayInstance = null;

function getInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables.');
  }
  if (!razorpayInstance || razorpayInstance.key_id !== keyId) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

export async function createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  const razorpay = getInstance();
  // Razorpay expects amount in paise (multiply by 100)
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    notes,
  });
  return order;
}

export function verifyPaymentSignature(orderId, paymentId, signature) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expectedSignature === signature;
}

export async function processRefund(paymentId, amount) {
  const razorpay = getInstance();
  const refund = await razorpay.payments.refund(paymentId, {
    amount: Math.round(amount * 100),
  });
  return refund;
}

export async function createPayout({ accountNumber, ifsc, name, amount, currency = 'INR' }) {
  const razorpay = getInstance();
  // Create a contact first
  const contact = await razorpay.contacts.create({
    name,
    contact: accountNumber,
    type: 'vendor',
  });
  // Create a fund account
  const fundAccount = await razorpay.fundAccounts.create({
    contact_id: contact.id,
    account_type: 'bank_account',
    bank_account: {
      name,
      ifsc,
      account_number: accountNumber,
    },
  });
  // Initiate payout
  const payout = await razorpay.payouts.create({
    account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
    fund_account_id: fundAccount.id,
    amount: Math.round(amount * 100),
    currency,
    mode: 'IMPS',
    purpose: 'vendor_payment',
  });
  return payout;
}
