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
      if (job.status === "completed" || job.status === "in_progress") {
        for (const step of job.steps || []) {
          if (step.conclusion === "failure") {
            failedSteps.push({
              jobId: job.id,
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

async function fetchJobLogs(token, jobId) {
  try {
    const octokit = github.getOctokit(token);
    const { context } = github;

    const { data } = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
      owner: context.repo.owner,
      repo: context.repo.repo,
      job_id: jobId,
    });

    return data;
  } catch (e) {
    core.warning(`Could not fetch job logs: ${e.message}`);
    return null;
  }
}

async function collectLogs(token) {
  const logs = [];
  const failedSteps = await getFailedSteps(token);

  // Fetch actual job logs from GitHub API
  const jobIds = [...new Set(failedSteps.map(s => s.jobId))];
  for (const jobId of jobIds) {
    if (jobId) {
      core.info(`Fetching logs for job ${jobId}...`);
      const jobLogs = await fetchJobLogs(token, jobId);
      if (jobLogs) {
        logs.push(jobLogs);
      }
    }
  }

  // Also check GITHUB_STEP_SUMMARY
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const summaryPath = process.env.GITHUB_STEP_SUMMARY;
      if (fs.existsSync(summaryPath)) {
        logs.push(fs.readFileSync(summaryPath, "utf8"));
      }
    } catch (e) {
      // ignore
    }
  }

  // Check for common log files
  const workspace = process.env.GITHUB_WORKSPACE || ".";
  const logPatterns = [
    "npm-debug.log",
    "yarn-error.log",
    "pnpm-debug.log",
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
      // ignore
    }
  }

  // Check env vars
  if (process.env.BUILD_LOG) {
    logs.push(process.env.BUILD_LOG);
  }
  if (process.env.TEST_OUTPUT) {
    logs.push(process.env.TEST_OUTPUT);
  }

  if (logs.length === 0) {
    return {
      logs: "No logs collected. The action runs after the failed step completes.",
      failedSteps
    };
  }

  // Combine and limit size
  let combined = logs.join("\n\n");
  if (combined.length > 50000) {
    combined = combined.substring(combined.length - 50000);
  }

  return { logs: combined, failedSteps };
}

module.exports = { collectLogs, getFailedSteps };
