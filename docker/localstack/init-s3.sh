#!/usr/bin/env bash
set -euo pipefail

BUCKET_NAME="${S3_BUCKET:-llc-documents}"

awslocal s3 mb "s3://${BUCKET_NAME}" 2>/dev/null || true
