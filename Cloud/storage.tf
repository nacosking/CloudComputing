# ---------------------------------------------------------
# S3 BUCKETS (Mandatory Requirement)
# ---------------------------------------------------------

# Get current AWS account ID (Used for unique bucket naming)
data "aws_caller_identity" "current" {}

# 1. Application Storage Bucket
resource "aws_s3_bucket" "app_storage" {
  # Uses Account ID for global uniqueness
  bucket = "${var.project_name}-app-storage-${data.aws_caller_identity.current.account_id}"
  # CRITICAL Lab Fix: Allows Terraform to delete the bucket even if it contains files
  force_destroy = true 
}

# Enable versioning (Backup strategy)
resource "aws_s3_bucket_versioning" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  versioning_configuration { status = "Enabled" }
}

# Server-side encryption (Security)
resource "aws_s3_bucket_server_side_encryption_configuration" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

# Block public access (Security Hardening)
resource "aws_s3_bucket_public_access_block" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy (Cost Optimization)
resource "aws_s3_bucket_lifecycle_configuration" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  
  rule {
    id     = "transition-to-cheaper-storage"
    status = "Enabled"

    # CORRECTED: Each argument gets its own line within the block
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

# 2. Backup Bucket
resource "aws_s3_bucket" "backups" {
  bucket = "${var.project_name}-backups-${data.aws_caller_identity.current.account_id}"
  force_destroy = true 
}

# Block public access for backups
resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}