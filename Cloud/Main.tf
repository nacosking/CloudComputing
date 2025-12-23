# ---------------------------------------------------------
# TERRAFORM CONFIGURATION
# ---------------------------------------------------------
terraform {
  required_version = ">= 1.0"

  required_providers {
    # The AWS Provider (connects to your cloud)
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # The Random Provider (generates unique IDs for S3 buckets)
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# ---------------------------------------------------------
# PROVIDER SETUP
# ---------------------------------------------------------
provider "aws" {
  region = var.aws_region

  # GLOBAL TAGGING STRATEGY (Role 3 Requirement for Cost Monitoring)
  # Automatically applies these tags to every AWS resource.
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      Team        = var.team_name
      Owner       = "Student-Group-04"
      ManagedBy   = "Terraform"
    }
  }
}

# ---------------------------------------------------------
# DATA SOURCES (The "Read-Only" Information)
# ---------------------------------------------------------

# 1. AWS Academy Lab Role (CRITICAL: Used to bypass role creation restrictions)
# This imports the existing role so we can attach policies to it.
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

# 2. Availability Zones
# This finds the available zones (e.g., us-east-1a, us-east-1b)
# to spread resources for Multi-AZ resilience.
data "aws_availability_zones" "available" {
  state = "available"
}

# 3. Amazon Linux 2023 AMI
# Automatically finds the latest Linux image ID for EC2 instances.
# AL2023 supports Node.js 20 (requires GLIBC 2.28+)
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name    = "name"
    values  = ["al2023-ami-2023.*-x86_64"]
  }
}