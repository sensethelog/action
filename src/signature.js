const patterns = [
  // Module/Import errors
  { pattern: /ModuleNotFoundError:.*['"](.+)['"]/i, signature: "missing_module" },
  { pattern: /Cannot find module ['"](.+)['"]/i, signature: "missing_module" },
  { pattern: /Module not found.*Can't resolve ['"]?([^'"]+)['"]?/i, signature: "module_not_found" },
  { pattern: /Module not found/i, signature: "module_not_found" },
  { pattern: /Cannot resolve ['"]?([^'"]+)['"]?/i, signature: "module_not_found" },
  { pattern: /ImportError:.*['"](.+)['"]/i, signature: "import_error" },

  // Type/Runtime errors
  { pattern: /TypeError:.*Cannot read.*['"]?(\w+)['"]?/i, signature: "type_error" },
  { pattern: /TypeError:/i, signature: "type_error" },
  { pattern: /ReferenceError:/i, signature: "reference_error" },
  { pattern: /SyntaxError:/i, signature: "syntax_error" },

  // Lint errors
  { pattern: /eslint.*error/i, signature: "lint_error" },
  { pattern: /\d+:\d+\s+error\s+/i, signature: "lint_error" },
  { pattern: /✖\s+\d+\s+problem/i, signature: "lint_error" },
  { pattern: /no-unused-vars/i, signature: "lint_error" },

  // Timeout errors
  { pattern: /Timeout.*exceeded/i, signature: "timeout_error" },
  { pattern: /jest.*timeout/i, signature: "jest_timeout_error" },
  { pattern: /timed out/i, signature: "timeout_error" },

  // Connection/Network errors
  { pattern: /Error: connect ECONNREFUSED/i, signature: "connection_refused" },
  { pattern: /ENOTFOUND/i, signature: "dns_error" },

  // File system errors
  { pattern: /ENOENT.*no such file or directory/i, signature: "file_not_found" },
  { pattern: /EACCES/i, signature: "permission_denied" },
  { pattern: /ENOMEM/i, signature: "out_of_memory" },
  { pattern: /ENOSPC/i, signature: "disk_full" },

  // Environment errors
  { pattern: /Environment variable ['"]?(\w+)['"]? is not set/i, signature: "env_var_missing" },
  { pattern: /missing.*environment.*variable/i, signature: "env_var_missing" },

  // Package manager errors
  { pattern: /npm ERR! code E404/i, signature: "npm_package_not_found" },
  { pattern: /npm ERR! code ERESOLVE/i, signature: "npm_dependency_conflict" },
  { pattern: /npm ERR!/i, signature: "npm_error" },
  { pattern: /yarn error/i, signature: "yarn_error" },

  // Docker errors
  { pattern: /docker.*not found/i, signature: "docker_not_available" },

  // Auth errors
  { pattern: /permission denied/i, signature: "permission_denied" },
  { pattern: /authentication.*failed/i, signature: "auth_failed" },
  { pattern: /unauthorized/i, signature: "auth_failed" },
  { pattern: /rate limit/i, signature: "rate_limited" },

  // Test errors
  { pattern: /AssertionError/i, signature: "assertion_failed" },
  { pattern: /FAIL\s+\S+/i, signature: "test_failure" },
  { pattern: /test.*failed/i, signature: "test_failure" },
  { pattern: /Tests:.*failed/i, signature: "test_failure" },

  // Build errors
  { pattern: /build.*failed/i, signature: "build_failure" },
  { pattern: /compilation.*error/i, signature: "compilation_error" },
  { pattern: /error Command failed/i, signature: "command_failed" },
  { pattern: /exit code [1-9]/i, signature: "exit_error" },

  // Terraform errors
  { pattern: /Error: Reference to undeclared resource/i, signature: "terraform_undeclared_resource" },
  { pattern: /Error: Invalid reference/i, signature: "terraform_invalid_reference" },
  { pattern: /Error: Missing required argument/i, signature: "terraform_missing_argument" },
  { pattern: /Error: Unsupported attribute/i, signature: "terraform_unsupported_attribute" },
  { pattern: /terraform.*plan.*failed/i, signature: "terraform_plan_error" },
  { pattern: /terraform.*apply.*failed/i, signature: "terraform_apply_error" },
  { pattern: /Error acquiring the state lock/i, signature: "terraform_state_lock" },

  // CloudFormation errors
  { pattern: /Stack.*rollback/i, signature: "cloudformation_rollback" },
  { pattern: /ROLLBACK_COMPLETE/i, signature: "cloudformation_rollback" },
  { pattern: /CREATE_FAILED/i, signature: "cloudformation_create_failed" },
  { pattern: /UPDATE_FAILED/i, signature: "cloudformation_update_failed" },
  { pattern: /Property validation failure/i, signature: "cloudformation_validation_error" },
  { pattern: /Resource creation failed/i, signature: "cloudformation_resource_failed" },
  { pattern: /cloudformation.*failed/i, signature: "cloudformation_error" },
];

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

function generateSignature(logs) {
  const normalizedLogs = logs.toLowerCase();

  for (const { pattern, signature } of patterns) {
    const match = normalizedLogs.match(new RegExp(pattern.source, "i"));
    if (match) {
      if (match[1]) {
        const detail = match[1]
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()
          .substring(0, 30);
        return `${signature}_${detail}`;
      }
      return signature;
    }
  }

  const hash = simpleHash(normalizedLogs.substring(0, 500));
  return `unknown_${hash}`;
}

module.exports = { generateSignature };
