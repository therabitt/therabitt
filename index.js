require("dotenv").config();
const Mustache = require("mustache");
const fs = require("fs");
const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GH_ACCESS_TOKEN,
  userAgent: "readme v1.0.0",
  baseUrl: "https://api.github.com",
});

async function grabDataFromAllRepositories() {
  const options = { per_page: 100 };
  const request = await octokit.rest.repos.listForAuthenticatedUser(options);
  return request.data;
}

function calculateTotalStars(data) {
  return data.reduce((sum, repo) => sum + repo.stargazers_count, 0);
}

async function calculateTotalCommits(data) {
  const githubUsername = process.env.GH_USERNAME;
  let totalCommits = 0;

  for (const repo of data) {
    try {
      const { data: stats } = await octokit.rest.repos.getContributorsStats({
        owner: githubUsername,
        repo: repo.name,
      });

      if (Array.isArray(stats)) {
        const contributor = stats.find((item) => item.author.login === githubUsername);
        if (contributor) {
          totalCommits += contributor.weeks
            .reduce((sum, week) => sum + week.c, 0);
        }
      }
    } catch (e) {}
  }
  return totalCommits;
}

async function updateReadme(userData) {
  const template = fs.readFileSync("./main.mustache", "utf8");
  const output = Mustache.render(template, userData);
  fs.writeFileSync("README.md", output);
}

async function main() {
  const repoData = await grabDataFromAllRepositories();
  const totalStars = calculateTotalStars(repoData);
  const totalCommits = await calculateTotalCommits(repoData);
  const colors = ["474342", "fbedf6", "c9594d", "f8b9b2", "ae9c9d"];
  await updateReadme({ totalStars, totalCommits, colors });
}

main();
