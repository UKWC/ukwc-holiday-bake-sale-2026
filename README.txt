UKWC 2026 HOLIDAY BAKE SALE - NETLIFY SITE

FILES:
index.html - holiday-themed order form
thank-you.html - confirmation for Square or check
netlify/functions/create-payment-link.js - Square payment and Google Sheet integration
netlify.toml - Netlify functions settings

SETUP:
1. In Google Apps Script, run setupSheet and testOrder. Confirm the Orders tab and test email.
2. Deploy Apps Script: Deploy > Manage deployments > Edit > New version > Deploy.
   Use access: Anyone. The script URL is already included in create-payment-link.js.
3. Upload the entire folder to your Git repository and deploy with Netlify.
4. Set Netlify environment variables:
   SQUARE_ACCESS_TOKEN = your existing Square production access token
   SQUARE_LOCATION_ID = your existing Square location ID
   PUBLIC_SITE_URL = your new bake sale Netlify site URL (recommended)
   Netlify also provides URL automatically, which is used as a fallback.
5. Redeploy after setting variables. Test a check order, then a small Square order.
6. Embed your new Netlify site URL in Wix.

IMPORTANT:
- Square orders are recorded as PENDING, not PAID. Confirm actual payment in Square before marking Paid.
- The quantity limits in the form are per-order maximums. They are not globally decremented as other customers order; manually monitor availability in the sheet.
- The check payment page provides Karen Bennett's mailing address.
- The testOrder function sends its test notification only to amtaylor22@gmail.com.
- Real orders notify klhb253@aol.com and ukwctreasurer@gmail.com.
- Prices and products are defined in BOTH index.html and create-payment-link.js; update both together if they change.
- The Apps Script code must use the same product IDs as the website.
