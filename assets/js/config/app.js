/* config/app.js — product branding (Release 5.2).
   The application name/tagline/version/copyright live here so branding is never
   hardcoded again. The business's OWN name (state.business.name) is separate and
   overrides the header once configured; this is the platform identity. */
const APP_NAME      = "Washly";
const APP_NAME_AR   = "واشلي";
const APP_TAGLINE   = "أدِر غسيل السيارات، الملابس، السجاد، تغيير الزيت والمتجر من منصّة واحدة حديثة.";
const APP_VERSION   = "1.2.0";
const APP_COPYRIGHT = "© " + "Washly — منصّة إدارة الأعمال";

Object.assign(App.config, { APP_NAME, APP_NAME_AR, APP_TAGLINE, APP_VERSION, APP_COPYRIGHT });
