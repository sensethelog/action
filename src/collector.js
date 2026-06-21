const fs = require("fs");
const path = require("path");
const github = require("@actions/github");
const core = require("@actions/core");

async function getFailedSteps(token, runId) {
  const failedSteps = [];

  try {
    const octokit = github.getOctokit(token);
    const { context } = github;

    const { data: jobs } = await octokit.rest.actions.listJobsForWorkflowRun({
      owner: context.repo.owner,
      repo: context.repo.repo,
      run_id: runId,
    });

    core.info(`Found ${jobs.jobs.length} job(s) in workflow run`);

    for (const job of jobs.jobs) {
      core.info(`Job: ${job.name} (status: ${job.status}, conclusion: ${job.conclusion}, steps: ${job.steps?.length || 0})`);

      if (job.status === "completed" || job.status === "in_progress") {
        for (const step of job.steps || []) {
          // Check ALL possible failure indicators
          const isFailed =
            step.conclusion === "failure" ||
            step.conclusion === "cancelled" ||
            step.conclusion === "timed_out" ||
            step.outcome === "failure" ||
            step.outcome === "cancelled" ||
            step.outcome === "timed_out" ||
            step.status === "failure";

          core.info(`  Step: ${step.name} | status=${step.status} | conclusion=${step.conclusion} | outcome=${step.outcome} | failed=${isFailed}`);

          if (isFailed) {
            failedSteps.push({
              jobId: job.id,
              jobName: job.name,
              stepName: step.name,
              stepNumber: step.number,
              startedAt: step.started_at,
              completedAt: step.completed_at,
              continueOnError: step.outcome === "failure" && step.conclusion !== "failure",
            });
          }
        }
      }
    }

    core.info(`Found ${failedSteps.length} failed step(s)`);
  } catch (e) {
    core.warning(`Could not fetch failed steps: ${e.message}`);
  }

  return failedSteps;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJobLogs(token, jobId) {
  try {
    const { context } = github;

    // Use direct fetch with proper headers
    const url = `https://api.github.com/repos/${context.repo.owner}/${context.repo.repo}/actions/jobs/${jobId}/logs`;
    core.info(`Fetching logs from: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'sensethelog-action'
      },
      redirect: 'follow'
    });

    core.info(`API response status: ${response.status}`);

    if (response.ok) {
      const text = await response.text();
      core.info(`Got ${text.length} bytes of logs`);
      return text;
    } else {
      const errorText = await response.text();
      core.warning(`API returned ${response.status}: ${errorText.substring(0, 200)}`);
      return null;
    }
  } catch (e) {
    core.warning(`Could not fetch job logs: ${e.message}`);
    return null;
  }
}

async function getAnnotations(token) {
  try {
    const octokit = github.getOctokit(token);
    const { context } = github;

    // Get check runs for this commit
    const { data: checkRuns } = await octokit.rest.checks.listForRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: context.sha,
    });

    const annotations = [];
    for (const check of checkRuns.check_runs) {
      if (check.output && check.output.annotations_count > 0) {
        const { data: annotationData } = await octokit.rest.checks.listAnnotations({
          owner: context.repo.owner,
          repo: context.repo.repo,
          check_run_id: check.id,
        });
        annotations.push(...annotationData);
      }
    }

    core.info(`Found ${annotations.length} annotations`);
    return annotations;
  } catch (e) {
    core.warning(`Could not fetch annotations: ${e.message}`);
    return [];
  }
}

async function collectLogs(token, runId) {
  const logs = [];
  const failedSteps = await getFailedSteps(token, runId);

  core.info(`Collecting logs for workflow run: ${runId}`);

  // Try to get annotations (error messages from checks)
  const annotations = await getAnnotations(token);
  if (annotations.length > 0) {
    const annotationText = annotations.map(a =>
      `${a.path || ''}:${a.start_line || ''} ${a.annotation_level}: ${a.message}`
    ).join('\n');
    logs.push(`=== Annotations ===\n${annotationText}`);
    core.info(`Annotation preview: ${annotationText.substring(0, 300)}`);
  }

  // Try to fetch job logs
  try {
    const octokit = github.getOctokit(token);
    const { context } = github;

    const { data: jobs } = await octokit.rest.actions.listJobsForWorkflowRun({
      owner: context.repo.owner,
      repo: context.repo.repo,
      run_id: runId,
    });

    // Error patterns to detect in logs
    const errorPatterns = [
      /error[:\s]/i,
      /failed/i,
      /exception/i,
      /TypeError/i,
      /SyntaxError/i,
      /ReferenceError/i,
      /FAIL\s/,
      /exit code [1-9]/i,
      /Module not found/i,
      /Cannot resolve/i,
      /✖\s+\d+\s+problem/i,
      /no-unused-vars/i,
    ];

    core.info(`Total jobs in workflow: ${jobs.jobs.length}`);
    jobs.jobs.forEach(j => core.info(`  - ${j.name}: status=${j.status}, conclusion=${j.conclusion}`));

    // Fetch logs for ALL completed jobs - let AI analyze everything
    for (const job of jobs.jobs) {
      // Skip the analyze job itself
      if (job.name.toLowerCase().includes('analyze') || job.name.toLowerCase().includes('sensethelog')) {
        core.info(`Skipping analysis job: ${job.name}`);
        continue;
      }

      core.info(`\n>>> Processing job: ${job.name} | status=${job.status} | conclusion=${job.conclusion}`);

      if (job.status === "completed") {
        // Log all step details
        for (const step of job.steps || []) {
          core.info(`  Step: ${step.name} | conclusion=${step.conclusion} | outcome=${step.outcome}`);
        }

        // Fetch logs for ALL completed jobs (regardless of conclusion)
        core.info(`Fetching logs for job: ${job.name} (${job.id})...`);
        try {
          const jobLogs = await fetchJobLogs(token, job.id);
          core.info(`  Logs received: ${jobLogs ? jobLogs.length + ' bytes' : 'NULL'}`);

          if (jobLogs) {
            const logStr = typeof jobLogs === 'string' ? jobLogs : JSON.stringify(jobLogs);

            // Check if logs contain error patterns
            const matchedPatterns = errorPatterns.filter(p => p.test(logStr));
            const hasErrorInLogs = matchedPatterns.length > 0;
            core.info(`  Error patterns matched: ${matchedPatterns.length}`);

            // ALWAYS include logs if job failed OR has errors in logs
            // This ensures continue-on-error jobs are captured
            if (job.conclusion === "failure" || hasErrorInLogs) {
              // Tag logs with job name for multi-error analysis
              logs.push(`\n=== JOB: ${job.name} ===\n${logStr}`);
              core.info(`  ✓ Added logs from ${job.name}`);

              // If job succeeded but has errors, it's continue-on-error
              if (job.conclusion === "success" && hasErrorInLogs) {
                core.info(`  Continue-on-error detected in ${job.name}`);

                // Find the actual step name (skip setup steps)
                let stepName = null;
                const skipPatterns = ['checkout', 'set up job', 'setup node', 'install', 'cache', 'post ', 'complete job', 'this step runs'];

                for (const step of job.steps || []) {
                  const stepLower = step.name.toLowerCase();
                  if (skipPatterns.some(s => stepLower.includes(s))) continue;
                  stepName = step.name;
                  break;
                }

                if (!stepName) stepName = "Linting/Build step";

                // Add to failed steps
                const alreadyTracked = failedSteps.some(s => s.jobName === job.name);
                if (!alreadyTracked) {
                  failedSteps.push({
                    jobId: job.id,
                    jobName: job.name,
                    stepName: stepName,
                    continueOnError: true,
                  });
                  core.info(`  Added to failedSteps: ${job.name} -> ${stepName}`);
                }
              }
            } else {
              core.info(`  ✗ No errors detected in ${job.name}`);
            }
          }
        } catch (fetchErr) {
          core.warning(`Job logs not available for ${job.name}: ${fetchErr.message}`);
        }
      }
    }
  } catch (e) {
    core.warning(`Could not list jobs: ${e.message}`);
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
  core.info(`Workspace: ${workspace}`);

  const logPatterns = [
    "test-output.log",
    "npm-debug.log",
    "yarn-error.log",
    "pnpm-debug.log",
    "jest.log",
    "test-results.log",
    "build.log",
    "error.log",
  ];

  for (const pattern of logPatterns) {
    const fullPath = path.join(workspace, pattern);
    const exists = fs.existsSync(fullPath);
    core.info(`Checking ${fullPath}: ${exists ? 'EXISTS' : 'not found'}`);
    try {
      if (exists && fs.statSync(fullPath).isFile()) {
        const content = fs.readFileSync(fullPath, "utf8");
        core.info(`Read ${content.length} bytes from ${pattern}`);
        if (content.length < 100000) {
          logs.push(`=== ${pattern} ===\n${content}`);
        }
      }
    } catch (e) {
      core.warning(`Error reading ${pattern}: ${e.message}`);
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

  // Combine logs - keep more for better analysis
  let combined = logs.join("\n\n");
  core.info(`Total combined logs: ${combined.length} bytes from ${logs.length} sources`);

  // Limit to 100KB but keep from the end (most recent/relevant)
  if (combined.length > 100000) {
    combined = combined.substring(combined.length - 100000);
    core.info(`Truncated to last 100KB`);
  }

  return { logs: combined, failedSteps };
}

module.exports = { collectLogs, getFailedSteps };
