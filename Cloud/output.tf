# ---------------------------------------------------------
# OUTPUT VALUES (Team Hand-off and Submission Links)
# ---------------------------------------------------------

# Application Access
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "application_url" {
  description = "URL to access the application (Submission Link)"
  value       = "http://${aws_lb.main.dns_name}"
}

# Monitoring Links
output "autoscaling_group_name" {
  description = "Name of the Auto Scaling Group (Used for stress testing and demo)"
  value       = aws_autoscaling_group.main.name
}

output "cloudwatch_dashboard_url" {
  description = "URL to CloudWatch Dashboard (Used for monitoring demo)"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

# Database and Secrets (Role 2 Connection Details)
output "database_endpoint" {
  description = "RDS database endpoint (Used in application connection string)"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "secrets_manager_secret_name" {
  description = "Name of the Secrets Manager secret containing database credentials"
  value       = aws_secretsmanager_secret.db_credentials.name
}

# Storage Details
output "s3_bucket_name" {
  description = "Name of the S3 bucket for application storage"
  value       = aws_s3_bucket.app_storage.id
}