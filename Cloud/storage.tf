# ---------------------------------------------------------
# S3 BUCKETS (Mandatory Requirement)
# ---------------------------------------------------------

# NOTE: data "aws_caller_identity" "current" is already defined in compute.tf
# We can use it here without re-declaring it.

# 1. Application Storage Bucket
resource "aws_s3_bucket" "app_storage" {
  # Uses Account ID from the common data source to ensure unique naming
  bucket        = "${var.project_name}-app-storage-${data.aws_caller_identity.current.account_id}"
  # CRITICAL Lab Fix: Allows Terraform to delete the bucket even if it contains files
  force_destroy = true
}

# Enable versioning (Backup strategy)
resource "aws_s3_bucket_versioning" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption (Security)
resource "aws_s3_bucket_server_side_encryption_configuration" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access (Security Hardening - Relaxed for Public Read)
# We explicitly set these to FALSE to allow the public policy below
resource "aws_s3_bucket_public_access_block" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket Policy (Allow Public Read Access)
resource "aws_s3_bucket_policy" "allow_public_read" {
  bucket = aws_s3_bucket.app_storage.id

  # --- CRITICAL FIX ---
  # This tells Terraform: "Do NOT try to add this policy until you have finished
  # unblocking public access above." This prevents the 403 error.
  depends_on = [aws_s3_bucket_public_access_block.app_storage]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.app_storage.arn}/*"
      },
    ]
  })
}

# Lifecycle policy (Cost Optimization)
resource "aws_s3_bucket_lifecycle_configuration" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id

  rule {
    id     = "transition-to-cheaper-storage"
    status = "Enabled"

    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# ---------------------------------------------------------
# 2. Backup Bucket (Private Storage)
# ---------------------------------------------------------

resource "aws_s3_bucket" "backups" {
  bucket        = "${var.project_name}-backups-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

# Block public access for backups (Strict Security)
resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}