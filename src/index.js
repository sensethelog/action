const core = require("@actions/core");
const github = require("@actions/github");
const { collectLogs } = require("./collector");
const { cleanLogs } = require("./logCleaner");
const { generateSignature } = require("./signature");
const { sendToApi } = require("./apiClient");
const { formatSummary } = require("./formatter");
const { createFixPR } = require("./fixGenerator");

async function run() {
  try {
    const apiKey = core.getInput("sensethelog-api-key", { required: true });
    const apiUrl = core.getInput("api-url") || "https://api.sensethelog.com";
    const openaiKey = core.getInput("openai-api-key");
    const githubToken = core.getInput("github-token") || process.env.GITHUB_TOKEN;
    const makeFix = core.getInput("make-fix") === "true";
    const workflowRunId = core.getInput("workflow-run-id");

    const { context } = github;
    const repo = `${context.repo.owner}/${context.repo.repo}`;

    // Use workflow_run context if available, otherwise current context
    const commitSha = context.payload.workflow_run?.head_sha || context.sha;
    const workflowName = context.payload.workflow_run?.name || context.workflow;
    const runId = workflowRunId || context.payload.workflow_run?.id || context.runId;
    const branch = context.payload.workflow_run?.head_branch || context.ref?.replace("refs/heads/", "") || "unknown";
    const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;

    core.info(`SenseTheLog: Analyzing workflow run ${runId}...`);
    core.info(`SenseTheLog: Branch: ${branch}`);
    core.info("SenseTheLog: Collecting CI logs...");
    const { logs: rawLogs, failedSteps } = await collectLogs(githubToken, runId);

    if (failedSteps.length > 0) {
      core.info(`SenseTheLog: Found ${failedSteps.length} failed step(s)`);
      failedSteps.forEach(step => {
        core.info(`  - ${step.jobName} > ${step.stepName}`);
      });
    }

    core.info("SenseTheLog: Processing logs...");
    const cleanedLogs = cleanLogs(rawLogs);
    const signature = generateSignature(cleanedLogs);

    core.info(`SenseTheLog: Detected signature: ${signature}`);

    const payload = {
      repo,
      commitSha,
      workflowName,
      branch,
      runId: String(runId),
      runUrl,
      logs: cleanedLogs,
      signature,
      failedSteps,
      generateCodeFix: makeFix,
    };

    core.info("SenseTheLog: Sending to API...");
    const result = await sendToApi(apiUrl, apiKey, payload, openaiKey);

    // Map API response (failures array) to formatter format (errors array)
    if (result.failures && result.failures.length > 0) {
      result.errors = result.failures;
      core.info(`SenseTheLog: Found ${result.failures.length} error(s)`);
    }

    core.setOutput("failure-id", result.id);
    core.setOutput("signature", result.signature);
    core.setOutput("is-recurring", result.isRecurring);
    core.setOutput("root-cause", result.rootCause || "");
    core.setOutput("suggested-fix", result.suggestedFix || "");
    core.setOutput("failed-steps", JSON.stringify(failedSteps));
    core.setOutput("error-count", result.failures?.length || 1);

    // Create fix PR if requested and code fix is available
    let fixPrUrl = null;
    if (makeFix && result.codeFix) {
      core.info("SenseTheLog: Creating fix PR...");
      fixPrUrl = await createFixPR(githubToken, result, context);
      if (fixPrUrl) {
        core.setOutput("fix-pr-url", fixPrUrl);
        core.info(`SenseTheLog: Fix PR created: ${fixPrUrl}`);
      }
    }

    // Add PR link to summary if created
    if (fixPrUrl) {
      result.fixPrUrl = fixPrUrl;
    }

    const summaryContext = {
      workflowName: context.workflow,
      branch: context.ref?.replace("refs/heads/", "") || "unknown",
      commitSha: context.sha,
    };
    const summary = formatSummary(result, failedSteps, summaryContext);
    await core.summary.addRaw(summary).write();

    if (result.isRecurring) {
      core.warning(`SenseTheLog: This is a recurring failure (seen ${result.occurrences} times)`);
    }

    core.info("SenseTheLog: Analysis complete");
  } catch (error) {
    core.setFailed(`SenseTheLog error: ${error.message}`);
  }
}

run();
