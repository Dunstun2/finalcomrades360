# Safaricom Daraja API Setup Guide

This guide will help you configure real M-Pesa payments for your system.

## 1. Create a Safaricom Developer Account
1. Visit the [Safaricom Developer Portal](https://developer.safaricom.co.ke/).
2. Click on "Sign Up" and follow the instructions to create your account.
3. Verify your email and log in.

## 2. Create a Sandbox App
Before going live, you must test your integration in the Sandbox environment.
1. Go to **My Apps** in the developer portal.
2. Click **Create New App**.
3. Select **Lipa Na M-Pesa Sandbox** (and any other APIs you might need, like C2B or B2C).
4. Give your app a name (e.g., `Comrades360 Sandbox`).
5. Once created, you will see your **Consumer Key** and **Consumer Secret**.

## 3. Obtain Test Credentials
For testing (Sandbox), you need:
- **Test Shortcode**: Usually `174379` (standard for sandbox).
- **Test Passkey**: You can find this by clicking on **Simulate** or **Go to Test** for Lipa Na M-Pesa. It's a long string of characters.
- **Test Phone Number**: Use your own Safaricom number to receive the STK push.

## 4. Configure Environment Variables
Update your `backend/.env` file with the following:

```env
# M-Pesa Configuration (Sandbox example)
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your_real_consumer_key_here
MPESA_CONSUMER_SECRET=your_real_consumer_secret_here
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_real_passkey_here
MPESA_MOCK_MODE=false

# IMPORTANT: Public URL for callbacks
# Safaricom needs to reach your server. 
# Use Ngrok if developing locally: e.g., https://abc-123.ngrok-free.app
BASE_URL=https://your-public-url.com
MPESA_CALLBACK_URL=https://your-public-url.com/api/payments/mpesa/callback
```

## 5. Local Testing with Ngrok
If you are developing locally:
1. Download and run [Ngrok](https://ngrok.com/).
2. Start it for your backend port: `ngrok http 5002`
3. Copy the `https://...` URL provided by Ngrok.
4. Update `BASE_URL` and `MPESA_CALLBACK_URL` in your `.env` with this Ngrok URL.

## 6. Going Production
When you're ready to go live:
1. Log in to the portal and click **Go Live**.
2. Follow the "Apply for Production" process (requires business documents).
3. Update `MPESA_ENVIRONMENT=production` and use your live credentials.
