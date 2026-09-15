import express from 'express';
import crypto from 'crypto';
import { getBranchModels } from '../config/mongo.js';
import { branchDbs } from '../config/constants.js';
import { saveBookings } from '../utils/persistence.js';
import { sendBookingWhatsAppNotifications } from '../utils/whatsapp.js';

const router = express.Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_ENV = process.env.RAZORPAY_ENV || 'sandbox'; // sandbox or production
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';

const sendPaymentNotifications = (booking) => {
  sendBookingWhatsAppNotifications(booking).catch((err) =>
    console.error('✗ WhatsApp notification failed:', err)
  );
};

// Helper to get Razorpay auth header
const getRazorpayAuth = () => {
  const credentials = `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`;
  return 'Basic ' + Buffer.from(credentials).toString('base64');
};

// Razorpay Initiate
router.post('/razorpay/initiate', async (req, res) => {
  const { bookingId, amount, phone, bookingDetails } = req.body;
  const orderId = `order_${bookingId}_${Date.now()}`;

  try {
    // Create order on Razorpay with complete booking details in notes
    const orderPayload = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: bookingId,
      notes: {
        bookingId: bookingId,
        phone: phone,
        customerName: bookingDetails?.name || '',
        branch: bookingDetails?.branch || '',
        service: bookingDetails?.service || '',
        date: bookingDetails?.date || '',
        timeSlot: bookingDetails?.timeSlot || '',
        duration: bookingDetails?.duration || '',
        membersCount: bookingDetails?.membersCount || '',
        occasion: bookingDetails?.occasion || '',
        totalPrice: bookingDetails?.totalPrice || amount,
        paymentType: bookingDetails?.paymentType || '',
        amountPaid: amount,
        selectedCake: bookingDetails?.selectedCake?.name || 'None',
        extraDecorations: bookingDetails?.extraDecorations?.map(d => d.name).join(', ') || 'None'
      }
    };

    const response = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getRazorpayAuth()
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();
    
    if (data.id) {
      // Prepare checkout form data for client-side redirect
      res.json({ 
        success: true, 
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
        keyId: RAZORPAY_KEY_ID,
        redirectUrl: `${FRONTEND_URL}/booking-confirmed?orderId=${data.id}`
      });
    } else {
      console.error('Razorpay Error Response:', data);
      res.status(400).json({ success: false, message: data.error?.description || 'Payment initiation failed' });
    }
  } catch (error) {
    console.error('Razorpay Initiation Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during payment initiation' });
  }
});

// Razorpay Callback (Webhook)
router.post('/razorpay/callback', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId: fallbackBookingId, amountPaid: fallbackAmountPaid, paymentType: fallbackPaymentType } = req.body;
  
  try {
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      console.log(`✅ Payment verified for order: ${razorpay_order_id}`);
      
      // Fetch the order from Razorpay to get the receipt (which holds our bookingId)
      let bookingId = fallbackBookingId || null;
      let paidAmount = Number(fallbackAmountPaid) || null;
      let paymentType = fallbackPaymentType || undefined;
      try {
        const orderRes = await fetch(`${RAZORPAY_BASE_URL}/orders/${razorpay_order_id}`, {
          method: 'GET',
          headers: {
            'Authorization': getRazorpayAuth(),
            'Accept': 'application/json'
          }
        });
        const orderData = await orderRes.json();
        // receipt is set to bookingId during order creation
        bookingId = orderData.receipt || orderData?.notes?.bookingId || bookingId;
        paidAmount = orderData?.amount ? orderData.amount / 100 : paidAmount;
        paymentType = orderData?.notes?.paymentType || paymentType;
        console.log(`📋 Resolved bookingId from Razorpay receipt: ${bookingId}`);
      } catch (fetchErr) {
        console.error('⚠️ Could not fetch Razorpay order details:', fetchErr.message);
      }
      
      if (bookingId) {
        // Update booking using the actual paid amount so advance payments stay partial
        const booking = await updateBookingPayment(bookingId, paidAmount, paymentType, 'razorpay');
        
        if (booking) {
          console.log(`✅ Booking ${bookingId} updated from Razorpay amount ₹${paidAmount ?? 0}`);
          return res.json({ success: true, message: 'Payment verified and booking updated', booking });
        }
      }
      
      res.json({ success: true, message: 'Payment verified' });
    } else {
      console.error('❌ Invalid signature for order:', razorpay_order_id);
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Razorpay Callback Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Razorpay Payment Status Check
router.post('/razorpay/status', async (req, res) => {
  const { orderId } = req.body;
  
  try {
    const response = await fetch(`${RAZORPAY_BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': getRazorpayAuth(),
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.id) {
      // Use receipt field which was set to bookingId during order creation
      const bookingId = data.receipt || null;
      
      // If payment status is paid, update booking
        if (data.status === 'paid' && bookingId) {
        console.log(`💳 Payment status PAID for order ${orderId}, updating booking ${bookingId}`);
        
        // Get payment details to know the amount paid
        const amount = data.amount / 100; // Convert from paise to rupees
        const paymentType = data?.notes?.paymentType || undefined;
        await updateBookingPayment(bookingId, amount, paymentType, 'razorpay');
      }
      
      res.json({ 
        success: true, 
        orderId: data.id,
        amount: data.amount,
        status: data.status,
        payments: data.payments
      });
    } else {
      res.status(404).json({ success: false, error: 'Order not found' });
    }
  } catch (error) {
    console.error('Razorpay Status Error:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// Helper to find and update booking across any storage
const updateBookingPayment = async (bookingId, amountPaid, paymentType, paymentMode) => {
  let amt = Number(amountPaid) || 0;
  const resolvedPaymentType = paymentType === 'full' || paymentType === 'advance'
    ? paymentType
    : undefined;
  
  // Try MongoDB branches
  const branchIds = ['branch-1', 'branch-2'];
  for (const branchId of branchIds) {
    const models = getBranchModels(branchId);
    if (models) {
      const booking = await models.Booking.findOne({ id: bookingId });
      if (booking) {
        // For Razorpay, never assume the full amount if the paid amount is unavailable.
        if (amountPaid === null || amountPaid === undefined) {
          amt = paymentMode === 'razorpay' ? (Number(booking.amountPaid) || 0) : booking.totalPrice;
        }
        
        const prevStatus = booking.paymentStatus;
        const newStatus = (amt >= booking.totalPrice) ? 'paid' : 'partially-paid';

        booking.paymentStatus = newStatus;
        booking.amountPaid = amt;
        booking.balanceAmount = Math.max(0, booking.totalPrice - amt);
        booking.paymentType = resolvedPaymentType || (amt >= booking.totalPrice ? 'full' : 'advance');
        if (paymentMode) booking.paymentMode = paymentMode;
        booking.updatedAt = new Date();
        await booking.save();
        
        console.log(`✅ Updated booking ${bookingId}: Status=${booking.paymentStatus}, Amount=₹${amt}/${booking.totalPrice}`);
        
        // Send customer/admin notifications when the payment first reaches advance or full status.
        const shouldSendNotifications = (newStatus === 'paid' || newStatus === 'partially-paid') && newStatus !== prevStatus;
        if (shouldSendNotifications) {
          sendPaymentNotifications(booking);
        } else {
          console.log(`ℹ️ Booking ${bookingId} status unchanged (${prevStatus}) — skipping duplicate payment notification`);
        }
        
        return booking;
      }
    }
  }

  // Try local file branches
  for (const branchId in branchDbs) {
    const booking = branchDbs[branchId].bookings.find(b => b.id === bookingId);
    if (booking) {
      // For Razorpay, never assume the full amount if the paid amount is unavailable.
      if (amountPaid === null || amountPaid === undefined) {
        amt = paymentMode === 'razorpay' ? (Number(booking.amountPaid) || 0) : booking.totalPrice;
      }
      
      const prevStatus = booking.paymentStatus;
      const newStatus = (amt >= booking.totalPrice) ? 'paid' : 'partially-paid';

      booking.paymentStatus = newStatus;
      booking.amountPaid = amt;
      booking.balanceAmount = Math.max(0, booking.totalPrice - amt);
      booking.paymentType = resolvedPaymentType || (amt >= booking.totalPrice ? 'full' : 'advance');
      if (paymentMode) booking.paymentMode = paymentMode;
      booking.updatedAt = new Date();
      await saveBookings(branchDbs);
      
      console.log(`✅ Updated booking ${bookingId}: Status=${booking.paymentStatus}, Amount=₹${amt}/${booking.totalPrice}`);
      
      // Send customer/admin notifications when the payment first reaches advance or full status.
      const shouldSendNotifications = (newStatus === 'paid' || newStatus === 'partially-paid') && newStatus !== prevStatus;
      if (shouldSendNotifications) {
        sendPaymentNotifications(booking);
      } else {
        console.log(`ℹ️ Booking ${bookingId} status unchanged (${prevStatus}) — skipping duplicate payment notification`);
      }
      
      return booking;
    }
  }
  
  return null;
};

router.post('/process', async (req, res) => {
  const { bookingId, amountPaid, paymentType } = req.body;
  try {
    const paymentMode = req.body.paymentMode;
    const booking = await updateBookingPayment(bookingId, amountPaid, paymentType, paymentMode);
    if (booking) {
      return res.json({ success: true, message: 'Payment processed', booking });
    }
    res.status(404).json({ error: 'Booking not found' });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});


router.get('/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  try {
    for (const branchId in branchDbs) {
      const models = getBranchModels(branchId);
      if (models) {
        const booking = await models.Booking.findOne({ id: bookingId });
        if (booking) return res.json({ bookingId: booking.id, paymentStatus: booking.paymentStatus });
      }
    }
    for (const branchId in branchDbs) {
      const booking = branchDbs[branchId].bookings.find(b => b.id === bookingId);
      if (booking) return res.json({ bookingId: booking.id, paymentStatus: booking.paymentStatus });
    }
    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;

