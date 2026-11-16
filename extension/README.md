# PRAMAAN (प्रमाण) — Direct Email Dispatcher Extension

> **Official Browser Extension for Instant Certificate Generation & Automated Email Delivery**  
> Send Personalized PDF Certificates Directly from Any Browser Tab • Zero Need to Open the Web Dashboard

---

## 💡 What Makes This Extension Valuable?

You **do not need to open the website dashboard** to issue or email certificates.

From this extension popup, you can:
1. **Send a Certificate via Email in 5 Seconds**:
   - Pick the target event batch.
   - Type the attendee's name and email.
   - Click **"Generate & Send Certificate via Email"**.
   - The extension compiles the vector PDF certificate and sends it immediately to the recipient's inbox using Nodemailer!
   - You instantly get the sent email preview link and PDF download link.
2. **Dispatch Entire Batches with 1 Click**:
   - Go to the **"Batch Mail"** tab.
   - Click **"Dispatch All Certificates in Batch"** to trigger bulk delivery in the background.
3. **One-Click Retry for Failed Emails**:
   - Failed email deliveries can be retried immediately from the extension popup.
4. **Highlight & Send on ANY Webpage**:
   - Highlight any email address or student name on Google Sheets, Google Forms, Notion, or LMS.
   - Right-click and choose **"✉️ Send Certificate to '...' via PRAMAAN"**.
   - The popup opens with the details pre-filled, ready to send!

---

## 🚀 How to Install in Chrome / Edge / Brave

1. Open your browser and go to:
   - **Google Chrome**: `chrome://extensions`
   - **Microsoft Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`
2. Turn **ON** the switch called **"Developer mode"** (top-right corner).
3. Click the **"Load unpacked"** button (top-left corner).
4. Select this folder:
   ```
   C:\smartcertificate\extension
   ```
5. Click the puzzle piece icon on your browser toolbar and pin **PRAMAAN**.

---

## ✉️ How to Send Your First Certificate Email from the Extension

1. Make sure your local server is running (`npm start` in `C:\smartcertificate`).
2. Click the **PRAMAAN extension icon** in your browser toolbar.
3. In the **"Email Cert"** tab:
   - Select your batch (e.g., *Global Innovation Summit 2026*).
   - Enter **Recipient Name** (e.g., `Amit Sharma`).
   - Enter **Recipient Email** (e.g., your email to test).
   - Click **"Generate & Send Certificate via Email"**.
4. The extension shows a green success card:
   - Click **"Preview Sent Email"** to view the live Nodemailer message with your PDF certificate attached!
   - Click **"View PDF"** to open the vector certificate in a new tab.
