const AmazonPaapi = require("amazon-paapi");
const fs = require("fs");

const client = new AmazonPaapi({
  accessKey: process.env.PAAPI_ACCESS_KEY,
  secretKey: process.env.PAAPI_SECRET_KEY,
  partnerTag: process.env.PAAPI_PARTNER_TAG,
  partnerType: "Associates",
  marketplace: "www.amazon.es",
});

(async () => {
  try {
    const result = await client.searchItems({
      Keywords: "",
      SearchIndex: "All",
      ItemCount: 20,
      Condition: "New",
      SortBy: "Featured"
    });

    const products = (result.ItemsResult?.Items || [])
      .map(item => {
        const asin = item.ASIN;
        const title = item.ItemInfo?.Title?.DisplayValue || "Produto Amazon";
        const image = item.Images?.Primary?.Medium?.URL || null;
        const offers = item.Offers?.Listings?.[0];

        if (!offers) return null;

        const price = offers.Price?.Amount || null;
        const oldPrice = offers.SavingBasis?.Amount || null;
        const discountPercent = offers.Savings?.Percentage || 0;

        return {
          asin,
          title,
          image,
          currentPrice: price ? `${price.toFixed(2)}€` : null,
          originalPrice: oldPrice ? `${oldPrice.toFixed(2)}€` : null,
          discountPercent,
          url: `https://www.amazon.es/dp/${asin}?tag=${process.env.PAAPI_PARTNER_TAG}`,
          updatedAt: new Date().toISOString()
        };
      })
      .filter(p => p && p.currentPrice && p.discountPercent > 0)
      .sort((a, b) => b.discountPercent - a.discountPercent);

    fs.writeFileSync("deals.json", JSON.stringify(products, null, 2));
    console.log(`✅ ${products.length} produtos atualizados`);
  } catch (error) {
    console.error("❌ Erro na API:", error);
    process.exit(1);
  }
})();
