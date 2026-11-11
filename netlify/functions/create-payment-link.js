const crypto = require('crypto');
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfIbk3jx-jlEvNKCZ-20O-kc4NAXMX1lM18kQti9jv7tIYblSh-w1Ii2E8N7ZOtBlKXg/exec';
const PRODUCTS = {
  creamHorns: ['Petit Cream Horns',6,12],candyCaneCookies:['Peppermint Candy Cane Cookies',8,6],
  pumpkinCupcakes:['Pumpkin Spice Cupcakes',10,6],redVelvetCupcakes:['Red Velvet Cupcakes',10,6],
  twixCookies:['Twix Cookies',10,8],cashewBrittle:['Cashew Brittle',10,9],
  plainFudge:['Chocolate Fudge - Plain',10,10],pecanFudge:['Chocolate Fudge - Pecans',10,10],
  peanutCandy:['Chocolate Peanut Candy',10,8],bourbonMolasses:['Bourbon Molasses Cookies',6,10],
  germanCake:['German Chocolate Cake',65,2],mintCookies:['Double Chocolate Mint Cookies',6,6],
  bourbonPie:['Chocolate Chip Pecan Bourbon Pie',20,4],oatmealCookies:['Raisin Oatmeal Cookies',4,99],
  treeCookies:['Christmas Tree Cookies',6,5]
};
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Method not allowed'});
 try{
  const d=JSON.parse(event.body||'{}');
  const name=String(d.name||'').trim(),email=String(d.email||'').trim(),phone=String(d.phone||'').trim();
  if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!phone)return reply(400,{ok:false,error:'Please enter your name, email, and phone.'});
  if(!['square','check'].includes(d.paymentMethod))return reply(400,{ok:false,error:'Choose a payment method.'});
  const items=Array.isArray(d.items)?d.items:[];
  if(!items.length)return reply(400,{ok:false,error:'Choose at least one product.'});
  let subtotalCents=0;const quantities={};
  for(const item of items){const p=PRODUCTS[item.id],q=Number(item.quantity);if(!p||!Number.isInteger(q)||q<1||q>p[2]||quantities[item.id])return reply(400,{ok:false,error:'Invalid product or quantity.'});quantities[item.id]=q;subtotalCents+=p[1]*q*100;}
  if((quantities.plainFudge||0)+(quantities.pecanFudge||0)>10)return reply(400,{ok:false,error:'Fudge is limited to 10 boxes total.'});
  const donationCents=Math.round(Number(d.donation||0)*100);
  if(!Number.isSafeInteger(donationCents)||donationCents<0||donationCents>10000000)return reply(400,{ok:false,error:'Invalid donation amount.'});
  const baseCents=subtotalCents+donationCents;
  const totalCents=d.paymentMethod==='square'?Math.ceil((baseCents+30)/(1-.029)):baseCents;
  const feeCents=totalCents-baseCents;
  const id=crypto.randomUUID();let paymentUrl=null,paymentLinkId='';
  if(d.paymentMethod==='square'){
   const token=process.env.SQUARE_ACCESS_TOKEN,locationId=process.env.SQUARE_LOCATION_ID;
   const siteUrl=process.env.PUBLIC_SITE_URL||process.env.URL;
   if(!token||!locationId||!siteUrl)throw Error('Square configuration is missing. Set SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID and PUBLIC_SITE_URL (or use Netlify URL).');
   const redirect=new URL('/thank-you.html?method=card',siteUrl).toString();
   const squareResponse=await fetch('https://connect.squareup.com/v2/online-checkout/payment-links',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Square-Version':'2024-01-18'},body:JSON.stringify({idempotency_key:id,quick_pay:{name:'UKWC 2026 Holiday Bake Sale Order',price_money:{amount:totalCents,currency:'USD'},location_id:locationId},checkout_options:{redirect_url:redirect,ask_for_shipping_address:false},pre_populated_data:{buyer_email:email},payment_note:'UKWC Bake Sale order '+id})});
   const square=await squareResponse.json();if(!squareResponse.ok||!square.payment_link?.url){console.error('Square checkout failed',square);throw Error('Unable to create Square checkout.');}
   paymentUrl=square.payment_link.url;paymentLinkId=square.payment_link.id||'';
  }
  const payload={orderId:id,name,email,phone,items,subtotal:subtotalCents/100,donation:donationCents/100,processingFee:feeCents/100,total:totalCents/100,paymentMethod:d.paymentMethod==='square'?'Square':'Check',pickupDetails:String(d.pickupDetails||'December 8 Holiday Luncheon').slice(0,300),notes:String(d.notes||'').slice(0,2000),paymentLinkId};
  const saved=await fetch(GOOGLE_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow'});
  const raw=await saved.text();let result;try{result=JSON.parse(raw);}catch{console.error('Apps Script non-JSON response',raw.slice(0,500));throw Error('Unable to save order to Google Sheet. Check Apps Script deployment access.');}
  if(!saved.ok||!result.ok)throw Error(result.error||'Unable to save order to Google Sheet.');
  return reply(200,{ok:true,orderId:id,paymentUrl,emailSent:result.emailSent});
 }catch(error){console.error('Bake sale order error',error);return reply(502,{ok:false,error:error.message||'Unable to complete order.'});}
};
