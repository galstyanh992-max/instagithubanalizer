// Honest placeholder for scripts whose implementation files do not exist yet.
// Prints NOT IMPLEMENTED and exits non-zero so it can never report a false PASS.
const label = process.argv[2] || "unknown";
console.error(`NOT IMPLEMENTED: ${label} placeholder`);
process.exit(1);
