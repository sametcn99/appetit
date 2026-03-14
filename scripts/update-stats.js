const appsJsonUrl = new URL("../apps.json", import.meta.url);

function getRepoPath(githubUrl) {
    if (!githubUrl) return null;

    try {
        const url = new URL(githubUrl);
        if (url.hostname !== "github.com") return null;
        const repoPath = url.pathname.replace(/^\/+|\/+$/g, "");
        return repoPath || null;
    } catch {
        return null;
    }
}

async function fetchRepoStats(repoPath, token) {
    const headers = {
        Accept: "application/vnd.github+json",
        "User-Agent": "sametcn99-apps-stats-updater",
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`https://api.github.com/repos/${repoPath}`, {
        headers,
    });

    if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
    }

    const payload = await response.json();
    return {
        stars: payload.stargazers_count,
        forks: payload.forks_count,
    };
}

async function main() {
    const raw = await Bun.file(appsJsonUrl).text();
    const data = JSON.parse(raw);
    const token = Bun.env.GITHUB_TOKEN;

    for (const app of data.apps || []) {
        const repoPath = getRepoPath(app.github);
        if (!repoPath) continue;

        process.stdout.write(`Fetching ${app.name || repoPath} (${repoPath})... `);

        try {
            const stats = await fetchRepoStats(repoPath, token);
            app.stars = stats.stars;
            app.forks = stats.forks;
            console.log(`stars ${stats.stars} forks ${stats.forks}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.log(`FAILED (${message})`);
        }
    }

    await Bun.write(appsJsonUrl, `${JSON.stringify(data, null, "\t")}\n`);
    console.log(`Done. Updated ${appsJsonUrl.pathname}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});