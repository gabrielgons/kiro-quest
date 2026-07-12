#!/usr/bin/env node
/**
 * Sync the built dist/ directory to S3 and invalidate CloudFront cache.
 *
 * Usage:
 *   node scripts/sync-to-s3.mjs [--bucket BUCKET_NAME] [--distribution-id DIST_ID]
 *
 * If bucket and distribution-id are not provided, they will be read from
 * the CDK stack outputs (KiroQuestFrontendStack).
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../../dist');

function run(cmd) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { encoding: 'utf-8', stdio: 'inherit' });
}

function getOutput(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

// Parse CLI arguments
const args = process.argv.slice(2);
let bucketName = '';
let distributionId = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--bucket' && args[i + 1]) {
    bucketName = args[++i];
  }
  if (args[i] === '--distribution-id' && args[i + 1]) {
    distributionId = args[++i];
  }
}

// Get values from CloudFormation outputs if not provided
if (!bucketName || !distributionId) {
  try {
    const outputs = getOutput(
      'aws cloudformation describe-stacks --stack-name KiroQuestFrontendStack --query "Stacks[0].Outputs" --output json'
    );
    const parsed = JSON.parse(outputs);
    for (const output of parsed) {
      if (output.OutputKey === 'BucketName') {
        bucketName = bucketName || output.OutputValue;
      }
      if (output.OutputKey === 'DistributionId') {
        distributionId = distributionId || output.OutputValue;
      }
    }
  } catch (error) {
    console.error('Failed to read stack outputs. Please provide --bucket and --distribution-id arguments.');
    process.exit(1);
  }
}

if (!bucketName) {
  console.error('Error: Could not determine S3 bucket name.');
  process.exit(1);
}

if (!existsSync(distDir)) {
  console.error(`Error: dist/ directory not found at ${distDir}`);
  console.error('Run "npm run build" in the project root first.');
  process.exit(1);
}

// Sync dist/ to S3
console.log(`\nSyncing ${distDir} to s3://${bucketName}/...\n`);
run(`aws s3 sync "${distDir}" "s3://${bucketName}" --delete --cache-control "public, max-age=31536000, immutable" --exclude "index.html" --exclude "*.json"`);

// Upload index.html and JSON files with short cache
run(`aws s3 sync "${distDir}" "s3://${bucketName}" --exclude "*" --include "index.html" --include "*.json" --cache-control "public, max-age=60, s-maxage=60"`);

// Invalidate CloudFront cache
if (distributionId) {
  console.log(`\nInvalidating CloudFront distribution ${distributionId}...\n`);
  run(`aws cloudfront create-invalidation --distribution-id "${distributionId}" --paths "/*"`);
} else {
  console.log('\nWarning: No distribution ID found, skipping CloudFront invalidation.');
}

console.log('\nDeploy complete!');
