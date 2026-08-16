import dotenv from 'dotenv';
import { sendAdminSmsNotification } from './src/utils/sms.js';
dotenv.config();

const booking = {
  id: 'TESTSMS1',
  branch: 'branch-1',
  name: 'Test User',
  phone: '+919999999999',
  service: 'Test Service',
  date: '2026-05-23',
  timeSlot: '10:00 AM',
  duration: 2,
  totalPrice: 1000,
  paymentType: 'advance',
  amountPaid: 500,
  balanceAmount: 500,
};

const result = await sendAdminSmsNotification(booking);
console.log('WhatsApp Gateway admin notification result:', result);
