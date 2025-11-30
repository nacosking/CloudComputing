# ---------------------------------------------------------
# CLOUDWATCH ALARMS (Mandatory Requirement)
# ---------------------------------------------------------

# SNS Topic for Alerts (Notification Channel)
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"
}

# SNS Topic Subscription (Email)
resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "your-email@example.com" # CRITICAL: Change this to your email and CONFIRM subscription
}

# Alarm: High CPU Utilization (Trigger for Auto Scaling UP)
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name                = "${var.project_name}-high-cpu"
  comparison_operator       = "GreaterThanThreshold"
  metric_name               = "CPUUtilization"
  namespace                 = "AWS/EC2"
  threshold                 = "70" # Scale up at 70% CPU
  alarm_actions             = [aws_autoscaling_policy.scale_up.arn, aws_sns_topic.alerts.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }
}

# Alarm: Low CPU Utilization (Trigger for Auto Scaling DOWN)
resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  alarm_name                = "${var.project_name}-low-cpu"
  comparison_operator       = "LessThanThreshold"
  metric_name               = "CPUUtilization"
  namespace                 = "AWS/EC2"
  threshold                 = "30" # Scale down at 30% CPU
  alarm_actions             = [aws_autoscaling_policy.scale_down.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }
}

# Alarm: RDS High CPU
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name                = "${var.project_name}-rds-high-cpu"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = "2"
  metric_name               = "CPUUtilization"
  namespace                 = "AWS/RDS"
  threshold                 = "80" 
  alarm_actions             = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

# CloudWatch Dashboard (Mandatory for Visual Monitoring)
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [ ["AWS/EC2", "CPUUtilization", { stat = "Average" }] ]
          title    = "EC2 CPU Utilization"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [ ["AWS/ApplicationELB", "RequestCount", { stat = "Sum" }] ]
          title    = "ALB Request Count"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [ ["AWS/RDS", "CPUUtilization", { stat = "Average" }] ]
          title    = "RDS CPU Utilization"
        }
      }
    ]
  })
}