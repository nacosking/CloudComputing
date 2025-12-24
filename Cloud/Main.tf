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

data "aws_caller_identity" "current" {}

# 2. Availability Zones
# This finds the available zones (e.g., us-east-1a, us-east-1b)
# to spread resources for Multi-AZ resilience.
data "aws_availability_zones" "available" {
  state = "available"
}

<<<<<<< HEAD
# 3. Ubuntu 22.04 LTS AMI
# Automatically finds the latest Ubuntu image ID for EC2 instances.
# Changed from Amazon Linux 2 because user_data script uses apt-get and /home/ubuntu
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical (Ubuntu official)

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
=======
# 3. Ubuntu 24.04 LTS AMI
# Automatically finds the latest Ubuntu image ID for EC2 instances.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
>>>>>>> e5bdf4c6e85da8f1eef328d6ed5d6711c04bda7e
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}