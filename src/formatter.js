function formatSummary(result, failedSteps = [], context = {}) {
  const parts = [];

  // Header
  parts.push("## Logytics Analysis\n");

  // Workflow info
  const workflowInfo = [];
  if (context.workflowName) workflowInfo.push(`Workflow: ${context.workflowName}`);
  if (context.branch) workflowInfo.push(`Branch: ${context.branch}`);
  if (context.commitSha) workflowInfo.push(`Commit: ${context.commitSha.substring(0, 7)}`);
  if (workflowInfo.length > 0) {
    parts.push(`**${workflowInfo.join(" | ")}**\n`);
  }

  // Recurring warning
  if (result.isRecurring) {
    parts.push(`> ⚠️ **Recurring Failure** - This issue has occurred ${result.occurrences} times\n`);
  }

  // Failed Steps
  if (failedSteps.length > 0) {
    parts.push("### Failed Steps\n");
    failedSteps.forEach(step => {
      parts.push(`- ❌ **${step.jobName}** → ${step.stepName}`);
    });
    parts.push("");
  }

  // Root Cause
  if (result.rootCause) {
    parts.push("### Root Cause\n");
    parts.push(result.rootCause);
    parts.push("");
  }

  // Key Error
  if (result.keyError) {
    parts.push("### Key Error\n");
    parts.push("```");
    parts.push(result.keyError);
    parts.push("```");
    parts.push("");
  }

  // Explanation
  if (result.explanation) {
    parts.push("### Explanation\n");
    parts.push(result.explanation);
    parts.push("");
  }

  // Suggested Fix
  if (result.suggestedFix) {
    parts.push("### Suggested Fix\n");
    // Format bullet points properly - convert "1. " or "- " inline to newlines
    let fix = result.suggestedFix;
    // Convert numbered lists that might be inline
    fix = fix.replace(/(\d+)\.\s+/g, '\n$1. ');
    // Convert bullet points that might be inline
    fix = fix.replace(/\s+-\s+/g, '\n- ');
    // Clean up any double newlines
    fix = fix.replace(/\n\n+/g, '\n\n');
    // Trim leading newline if added
    fix = fix.trim();
    parts.push(fix);
    parts.push("");
  }

  // Code Example
  if (result.codeExample) {
    parts.push("### Example Fix\n");
    parts.push("```" + (result.codeLanguage || ""));
    parts.push(result.codeExample);
    parts.push("```");
    parts.push("");
  }

  // Confidence
  if (result.confidence) {
    const emoji = result.confidence >= 80 ? "🟢" : result.confidence >= 50 ? "🟡" : "🔴";
    parts.push("### Confidence\n");
    parts.push(`${emoji} **${result.confidence}%**\n`);
  }

  // Fix PR
  if (result.fixPrUrl) {
    parts.push("### 🔧 Auto-Fix PR\n");
    parts.push(`A fix has been automatically generated: [View PR](${result.fixPrUrl})\n`);
  }

  // Footer
  parts.push("---");
  parts.push("*Powered by [Logytics](https://logytics.dev)*");
  parts.push("*Job summary generated at run-time*");

  return parts.join("\n");
}

module.exports = { formatSummary };
