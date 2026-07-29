/* config/inventory.js — Inventory module catalogs & defaults.
   Configurable lists the Inventory screen builds from (units, seed categories,
   alert thresholds). No hardcoded values at call sites. Gated by the
   `inventory` Feature Module. */
const INV_UNITS = ["قطعة","لتر","كيلو","علبة","كرتون","زجاجة","متر"];
const INV_DEFAULT_CATEGORIES = ["زيوت","مستلزمات غسيل","إكسسوارات","قطع غيار","أخرى"];
const INV_LOW_STOCK_DEFAULT = 5;   /* default reorder point for a new product */
const INV_EXPIRY_WARN_DAYS = 30;   /* flag products expiring within N days */

Object.assign(App.config, { INV_UNITS, INV_DEFAULT_CATEGORIES, INV_LOW_STOCK_DEFAULT, INV_EXPIRY_WARN_DAYS });
