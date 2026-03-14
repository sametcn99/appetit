const appsJsonUrl = new URL("../apps.json", import.meta.url);
const sitemapUrl = new URL("../sitemap.xml", import.meta.url);

function normalizeBaseUrl(url) {
    return String(url || "https://apps.sametcc.me").replace(/\/+$/, "");
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function toIsoDate(value = new Date()) {
    return value.toISOString().slice(0, 10);
}

function buildUrlSet(data) {
    const baseUrl = normalizeBaseUrl(data.store?.url);
    const today = toIsoDate();
    const urls = [];
    const seen = new Set();

    function addUrl(loc, changefreq, priority) {
        if (!loc || seen.has(loc)) return;
        seen.add(loc);
        urls.push({ loc, lastmod: today, changefreq, priority });
    }

    addUrl(`${baseUrl}/`, "daily", "1.0");
    addUrl(`${baseUrl}/#/discover`, "weekly", "0.9");

    for (const category of data.categories || []) {
        if (!category?.id) continue;
        addUrl(`${baseUrl}/#/${category.id}`, "weekly", "0.7");
    }

    for (const app of data.apps || []) {
        if (!app?.id) continue;
        const firstCategory = Array.isArray(app.category) ? app.category.find(Boolean) : undefined;
        const view = firstCategory || "discover";
        addUrl(`${baseUrl}/#/${view}/${app.id}`, "monthly", "0.6");
    }

    return urls;
}

function buildSitemapXml(entries) {
    const body = entries
        .map(
            (entry) => `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`
        )
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function main() {
    const raw = await Bun.file(appsJsonUrl).text();
    const data = JSON.parse(raw);
    const entries = buildUrlSet(data);
    const xml = buildSitemapXml(entries);
    await Bun.write(sitemapUrl, xml);
    console.log(`Wrote ${entries.length} sitemap entries to ${sitemapUrl.pathname}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});