const core = require("@actions/core");
const github = require("@actions/github");
const { collectLogs } = require("./collector");
const { cleanLogs } = require("./logCleaner");
const { generateSignature } = require("./signature");
const { sendToApi } = require("./apiClient");
const { formatSummary } = require("./formatter");

async function run() {
  try {
    const apiKey = core.getInput("logytics-api-key", { required: true });
    const apiUrl = core.getInput("api-url") || "https://website-production-28cf.up.railway.app";
    const openaiKey = core.getInput("openai-api-key");
    const githubToken = core.getInput("github-token") || process.env.GITHUB_TOKEN;

    const { context } = github;
    const repo = `${context.repo.owner}/${context.repo.repo}`;
    const commitSha = context.sha;
    const workflowName = context.workflow;

    core.info("Logytics: Collecting CI logs...");
    const { logs: rawLogs, failedSteps } = await collectLogs(githubToken);

    if (failedSteps.length > 0) {
      core.info(`Logytics: Found ${failedSteps.length} failed step(s)`);
      failedSteps.forEach(step => {
        core.info(`  - ${step.jobName} > ${step.stepName}`);
      });
    }

    core.info("Logytics: Processing logs...");
    const cleanedLogs = cleanLogs(rawLogs);
    const signature = generateSignature(cleanedLogs);

    core.info(`Logytics: Detected signature: ${signature}`);

    const payload = {
      repo,
      commitSha,
      workflowName,
      logs: cleanedLogs,
      signature,
      failedSteps,
    };

    core.info("Logytics: Sending to API...");
    const result = await sendToApi(apiUrl, apiKey, payload, openaiKey);

    core.setOutput("failure-id", result.id);
    core.setOutput("signature", result.signature);
    core.setOutput("is-recurring", result.isRecurring);
    core.setOutput("root-cause", result.rootCause || "");
    core.setOutput("suggested-fix", result.suggestedFix || "");
    core.setOutput("failed-steps", JSON.stringify(failedSteps));

    const summary = formatSummary(result, failedSteps);
    await core.summary.addRaw(summary).write();

    if (result.isRecurring) {
      core.warning(`Logytics: This is a recurring failure (seen ${result.occurrences} times)`);
    }

    core.info("Logytics: Analysis complete");
  } catch (error) {
    core.setFailed(`Logytics error: ${error.message}`);
  }
}

run();
