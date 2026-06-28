const fs = require("fs");
const { execSync } = require("child_process");

const forbiddenTrackedFiles = [".env", ".dev.vars", "service-account.json", "service-account-key.json"];
const secretPatterns = [
  /-----BEGIN (RSA|EC|DSA|OPENSSH|PRIVATE) PRIVATE KEY-----/,
  /CLOUDFLARE_API_TOKEN\s*[:=]\s*['\"]?[A-Za-z0-9._-]{20,}/i,
  /META_ACCESS_TOKEN\s*[:=]\s*['\"]?[A-Za-z0-9._-]{20,}/i,
  /TIKTOK_ACCESS_TOKEN\s*[:=]\s*['\"]?[A-Za-z0-9._-]{20,}/i,
  /GA4_API_SECRET\s*[:=]\s*['\"]?[A-Za-z0-9._-]{8,}/i,
  /AKIA[0-9A-Z]{16}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/
];

function getTrackedFiles() {
  const output = execSync("git ls-files", { encoding: "utf8" });
  return output.split(/\r?\n/).filter(Boolean);
}

function isBinary(buf) {
  return buf.includes(0);
}

function main() {
  const trackedFiles = getTrackedFiles();
  const failures = [];

  for (const file of forbiddenTrackedFiles) {
    if (trackedFiles.includes(file)) {
      failures.push(`Forbidden file is tracked: ${file}`);
    }
  }

  for (const file of trackedFiles) {
    let buf;
    try {
      buf = fs.readFileSync(file);
    } catch {
      continue;
    }

    if (isBinary(buf)) {
      continue;
    }

    const text = buf.toString("utf8");
    for (const pattern of secretPatterns) {
      if (pattern.test(text)) {
        failures.push(`Possible secret detected in ${file}: ${pattern}`);
        break;
      }
    }
  }

  if (failures.length > 0) {
    console.error("Security check failed:");
    for (const item of failures) {
      console.error(`- ${item}`);
    }
    process.exit(1);
  }

  console.log("Security check passed. No tracked secret files or obvious secret patterns found.");
}

main();
