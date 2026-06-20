const fs = require("fs");
const path = require("path");
const github = require("@actions/github");
const core = require("@actions/core");

async function getFailedSteps(token) {
  const failedSteps = [];

  try {
    const octokit = github.getOctokit(token);
    const { context } = github;

    const { data: jobs } = await octokit.rest.actions.listJobsForWorkflowRun({
      owner: context.repo.owner,
      repo: context.repo.repo,
      run_id: context.runId,
    });

    for (const job of jobs.jobs) {
      if (job.status === "completed") {
        for (const step of job.steps || []) {
          if (step.conclusion === "failure") {
            failedSteps.push({
              jobName: job.name,
              stepName: step.name,
              stepNumber: step.number,
              startedAt: step.started_at,
              completedAt: step.completed_at,
            });
          }
        }
      }
    }
  } catch (e) {
    core.warning(`Could not fetch failed steps: ${e.message}`);
  }

  return failedSteps;
}

async function collectLogs(token) {
  const logs = [];
  const failedSteps = await getFailedSteps(token);

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const summaryPath = process.env.GITHUB_STEP_SUMMARY;
      if (fs.existsSync(summaryPath)) {
        logs.push(fs.readFileSync(summaryPath, "utf8"));
      }
    } catch (e) {
    }
  }

  const workspace = process.env.GITHUB_WORKSPACE || ".";

  const logPatterns = [
    "npm-debug.log",
    "yarn-error.log",
    "pnpm-debug.log",
    ".npm/_logs/*.log",
    "jest.log",
    "test-results.log",
  ];

  for (const pattern of logPatterns) {
    const fullPath = path.join(workspace, pattern);
    try {
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const content = fs.readFileSync(fullPath, "utf8");
        if (content.length < 100000) {
          logs.push(`=== ${pattern} ===\n${content}`);
        }
      }
    } catch (e) {
    }
  }

  if (process.env.BUILD_LOG) {
    logs.push(process.env.BUILD_LOG);
  }

  if (process.env.TEST_OUTPUT) {
    logs.push(process.env.TEST_OUTPUT);
  }

  if (logs.length === 0) {
    return {
      logs: "No logs collected. Ensure previous steps output logs to standard files.",
      failedSteps
    };
  }

  return { logs: logs.join("\n\n"), failedSteps };
}

module.exports = { collectLogs, getFailedSteps };
