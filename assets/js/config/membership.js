/* config/membership.js — membership plans + service packages (recurring revenue).
   Sold through finalizeInvoice (one posting path). Configurable. */
const MEMBERSHIP_PLANS = [
  { k:"basic",     label:"أساسي",     price:500,  days:30,  services:4,  discount:0,  priority:false, color:"#94a3b8" },
  { k:"silver",    label:"فضي",       price:900,  days:30,  services:8,  discount:5,  priority:false, color:"#8b98a6" },
  { k:"gold",      label:"ذهبي",      price:1500, days:30,  services:15, discount:10, priority:true,  color:"#e0a800" },
  { k:"diamond",   label:"ماسي",      price:2500, days:30,  services:0,  discount:15, priority:true, unlimited:true, color:"#3aa0e0" },
  { k:"unlimited", label:"غير محدود", price:3000, days:30,  services:0,  discount:20, priority:true, unlimited:true, color:"#7a5cff" },
  { k:"family",    label:"عائلي",     price:2000, days:30,  services:20, discount:10, priority:true,  color:"#26b06e" },
  { k:"fleet",     label:"أسطول",     price:5000, days:30,  services:60, discount:15, priority:true,  color:"#1c6ea4" }
];
const SERVICE_PACKAGES = [
  { k:"w5",        label:"5 غسلات",    price:900,   services:5,   days:90 },
  { k:"w10",       label:"10 غسلات",   price:1700,  services:10,  days:120 },
  { k:"monthly",   label:"شهري",       price:1200,  services:12,  days:30 },
  { k:"quarterly", label:"ربع سنوي",   price:3200,  services:40,  days:90 },
  { k:"yearly",    label:"سنوي",       price:11000, services:180, days:365 }
];
Object.assign(App.config, { MEMBERSHIP_PLANS, SERVICE_PACKAGES });
