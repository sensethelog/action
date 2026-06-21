function formatFix(fix) {
  if (!fix) return "";
  // Convert numbered lists that might be inline
  fix = fix.replace(/(\d+)\.\s+/g, '\n$1. ');
  // Convert bullet points that might be inline
  fix = fix.replace(/\s+-\s+/g, '\n- ');
  // Clean up any double newlines
  fix = fix.replace(/\n\n+/g, '\n\n');
  return fix.trim();
}

function formatSingleError(error, index) {
  const parts = [];
  const num = index + 1;

  parts.push(`### ${num}. ${error.jobName || 'Error'}\n`);

  if (error.keyError) {
    parts.push("**Error:**");
    parts.push("```");
    parts.push(error.keyError);
    parts.push("```");
    parts.push("");
  }

  if (error.rootCause) {
    parts.push(`**Root Cause:** ${error.rootCause}\n`);
  }

  if (error.explanation) {
    parts.push(`**Explanation:** ${error.explanation}\n`);
  }

  if (error.suggestedFix) {
    parts.push("**Suggested Fix:**");
    parts.push(formatFix(error.suggestedFix));
    parts.push("");
  }

  if (error.codeExample) {
    parts.push("**Example Fix:**");
    parts.push("```" + (error.codeLanguage || ""));
    parts.push(error.codeExample);
    parts.push("```");
    parts.push("");
  }

  if (error.confidence) {
    const emoji = error.confidence >= 80 ? "🟢" : error.confidence >= 50 ? "🟡" : "🔴";
    parts.push(`**Confidence:** ${emoji} ${error.confidence}%\n`);
  }

  return parts.join("\n");
}

function formatSummary(result, failedSteps = [], context = {}) {
  const parts = [];

  // Header
  parts.push("## SenseTheLog Analysis\n");

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
      const continueTag = step.continueOnError ? " *(continue-on-error)*" : "";
      parts.push(`- ❌ **${step.jobName}** → ${step.stepName}${continueTag}`);
    });
    parts.push("");
  }

  // Handle multiple errors
  if (result.errors && result.errors.length > 0) {
    parts.push(`## Found ${result.errors.length} Error(s)\n`);

    if (result.summary) {
      parts.push(`> ${result.summary}\n`);
    }

    result.errors.forEach((error, index) => {
      parts.push(formatSingleError(error, index));
      parts.push("---\n");
    });
  } else {
    // Single error format (backward compatibility)
    if (result.rootCause) {
      parts.push("### Root Cause\n");
      parts.push(result.rootCause);
      parts.push("");
    }

    if (result.keyError) {
      parts.push("### Key Error\n");
      parts.push("```");
      parts.push(result.keyError);
      parts.push("```");
      parts.push("");
    }

    if (result.explanation) {
      parts.push("### Explanation\n");
      parts.push(result.explanation);
      parts.push("");
    }

    if (result.suggestedFix) {
      parts.push("### Suggested Fix\n");
      parts.push(formatFix(result.suggestedFix));
      parts.push("");
    }

    if (result.codeExample) {
      parts.push("### Example Fix\n");
      parts.push("```" + (result.codeLanguage || ""));
      parts.push(result.codeExample);
      parts.push("```");
      parts.push("");
    }

    if (result.confidence) {
      const emoji = result.confidence >= 80 ? "🟢" : result.confidence >= 50 ? "🟡" : "🔴";
      parts.push("### Confidence\n");
      parts.push(`${emoji} **${result.confidence}%**\n`);
    }
  }

  // Fix PR
  if (result.fixPrUrl) {
    parts.push("### 🔧 Auto-Fix PR\n");
    parts.push(`A fix has been automatically generated: [View PR](${result.fixPrUrl})\n`);
  }

  // Footer
  parts.push("---");
  parts.push("*Powered by [SenseTheLog](https://sensethelog.com)*");

  return parts.join("\n");
}

module.exports = { formatSummary };
