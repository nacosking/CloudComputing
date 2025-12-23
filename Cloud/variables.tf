# ---------------------------------------------------------
# VARIABLES: GENERAL CONFIGURATION
# ---------------------------------------------------------
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "cloud-project"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "team_name" {
  description = "Team name"
  type        = string
  default     = "team-1"
}

# ---------------------------------------------------------
# VARIABLES: NETWORKING & COMPUTE
# ---------------------------------------------------------
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "instance_type" {
  description = "EC2 instance type (Free tier eligible)"
  type        = string
  default     = "t2.micro" 
}

# Auto Scaling Group settings for resilience (Mandatory Requirement)
variable "min_size" {
  description = "Minimum number of instances in ASG"
  type        = number
  default     = 2 
}

variable "max_size" {
  description = "Maximum number of instances in ASG"
  type        = number
  default     = 4
}

variable "desired_capacity" {
  description = "Desired number of instances in ASG"
  type        = number
  default     = 2
}

variable "allowed_ssh_cidr" {
  description = "CIDR blocks allowed to SSH (0.0.0.0/0 for lab debugging)"
  type        = list(string)
  default     = ["0.0.0.0/0"] 
}

# ---------------------------------------------------------
# VARIABLES: DATABASE SECRETS (Sensitive Data)
# ---------------------------------------------------------
variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "dbadmin"
  sensitive   = true # Hides value in logs
}

variable "db_password" {
  description = "Database master password (Must meet complexity)"
  type        = string
  sensitive   = true # Hides value in logs
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "appdb"
}