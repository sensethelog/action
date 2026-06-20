function formatSummary(result, failedSteps = []) {
  const parts = [];

  parts.push("## Logytics Pro Analysis\n");

  if (result.isRecurring) {
    parts.push(`> **Warning**: This is a recurring failure (seen ${result.occurrences} times)\n`);
  }

  if (failedSteps.length > 0) {
    parts.push("### Failed Steps\n");
    parts.push(`| Job | Step | Started | Completed |`);
    parts.push(`| --- | --- | --- | --- |`);
    failedSteps.forEach(step => {
      const started = step.startedAt ? new Date(step.startedAt).toLocaleTimeString() : "-";
      const completed = step.completedAt ? new Date(step.completedAt).toLocaleTimeString() : "-";
      parts.push(`| ${step.jobName} | **${step.stepName}** | ${started} | ${completed} |`);
    });
    parts.push("");
  }

  parts.push("### Failure Details\n");
  parts.push(`| Property | Value |`);
  parts.push(`| --- | --- |`);
  parts.push(`| **Signature** | \`${result.signature}\` |`);
  parts.push(`| **Failure ID** | \`${result.id}\` |`);
  parts.push(`| **Recurring** | ${result.isRecurring ? "Yes" : "No"} |`);

  if (result.rootCause) {
    parts.push("\n### Root Cause\n");
    parts.push(result.rootCause);
  }

  if (result.suggestedFix) {
    parts.push("\n### Suggested Fix\n");
    parts.push(result.suggestedFix);
  }

  if (result.confidence) {
    parts.push(`\n*Analysis confidence: ${result.confidence}%*`);
  }

  parts.push("\n---");
  parts.push("*Powered by [Logytics Pro](https://logytics.dev)*");

  return parts.join("\n");
}

module.exports = { formatSummary };
