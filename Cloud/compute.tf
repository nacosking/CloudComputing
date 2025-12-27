# ---------------------------------------------------------
# COMPUTE: ALB, LAUNCH TEMPLATE, ASG
# ---------------------------------------------------------

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Note: IAM Instance Profile data source is defined in security.tf

# ---------------------------------------------------------
# APPLICATION LOAD BALANCER
# ---------------------------------------------------------

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  tags = {
    Name = "${var.project_name}-alb"
  }
}

resource "aws_lb_target_group" "main" {
  name     = "${var.project_name}-tg"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/"
    port                = "5000"
    protocol            = "HTTP"
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }

  deregistration_delay = 30

  tags = {
    Name = "${var.project_name}-target-group"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

# ---------------------------------------------------------
# LAUNCH TEMPLATE
# ---------------------------------------------------------

resource "aws_launch_template" "main" {
  name_prefix   = "${var.project_name}-lt-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  iam_instance_profile {
    name = data.aws_iam_instance_profile.lab_profile.name
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.web.id]
    delete_on_termination       = true
  }

  user_data = base64encode(<<-EOF
#!/bin/bash
set -e

# Logging setup
exec > >(tee /var/log/user-data.log) 2>&1
echo "=== Starting deployment at $(date) ==="

# Wait for system to be ready
sleep 30

# Wait for package locks
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/dpkg/lock >/dev/null 2>&1; do
    echo "Waiting for package manager locks..."
    sleep 3
done

# System updates and dependencies
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl postgresql-client awscli

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify installations
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Setup application directory
mkdir -p /home/ubuntu/app
chown -R ubuntu:ubuntu /home/ubuntu/app

# Install PM2 globally
npm install -g pm2

# Deploy application as ubuntu user
su - ubuntu << 'USEREOF'
set -e
cd /home/ubuntu

# Clone repository
echo "Cloning repository..."
rm -rf app
git clone -b newsoftcode https://github.com/nacosking/CloudComputing.git app

# Navigate to application directory
cd /home/ubuntu/app/Reserve-Menu

# Fix case-sensitive filename issue (if exists)
if [ -f "client/src/components/adminMenuManager.tsx" ]; then
    mv client/src/components/adminMenuManager.tsx client/src/components/AdminMenuManager.tsx
fi

# Install dependencies
echo "Installing npm packages..."
npm install
npm install @aws-sdk/client-s3 qrcode
npm install connect-pg-simple

# Build application
echo "Building application..."
rm -rf dist
npm run build

# Stop existing PM2 processes
pm2 delete reserve-menu || true

# Start application with ALL environment variables
echo "Starting application with PM2..."
NODE_TLS_REJECT_UNAUTHORIZED="0" \
DATABASE_URL="postgresql://${var.db_username}:${urlencode(var.db_password)}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}?sslmode=require" \
S3_BUCKET_NAME="${aws_s3_bucket.app_storage.id}" \
AWS_REGION="${var.aws_region}" \
PORT=5000 \
NODE_ENV=production \
pm2 start dist/index.cjs --name reserve-menu

# Save PM2 configuration
pm2 save --force

echo "Application started successfully!"
USEREOF

# Configure PM2 to start on system boot
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
systemctl enable pm2-ubuntu
systemctl start pm2-ubuntu

# Verify application is running
sleep 10
su - ubuntu -c 'pm2 list'
su - ubuntu -c 'pm2 logs reserve-menu --lines 50 --nostream'

echo "=== Deployment complete at $(date) ==="
EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-asg-instance"
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name = "${var.project_name}-asg-volume"
    }
  }
}

# ---------------------------------------------------------
# AUTO SCALING GROUP
# ---------------------------------------------------------

resource "aws_autoscaling_group" "main" {
  name                = "${var.project_name}-asg"
  vpc_zone_identifier = aws_subnet.public[*].id
  target_group_arns   = [aws_lb_target_group.main.arn]
  
  health_check_type         = "ELB"
  health_check_grace_period = 300
  
  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.desired_capacity

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  # Wait for instances to pass health checks before continuing
  wait_for_capacity_timeout = "10m"

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 300
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-asg-instance"
    propagate_at_launch = true
  }

  tag {
    key                 = "ManagedBy"
    value               = "Terraform-ASG"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ---------------------------------------------------------
# AUTO SCALING POLICIES
# ---------------------------------------------------------

resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.project_name}-scale-up"
  autoscaling_group_name = aws_autoscaling_group.main.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
  cooldown               = 300
  policy_type            = "SimpleScaling"
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.project_name}-scale-down"
  autoscaling_group_name = aws_autoscaling_group.main.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 300
  policy_type            = "SimpleScaling"
}

# ---------------------------------------------------------
# CLOUDWATCH ALARMS FOR AUTO SCALING
# ---------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.project_name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 70

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  alarm_description = "Triggers when CPU exceeds 70%"
  alarm_actions     = [aws_autoscaling_policy.scale_up.arn]
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "${var.project_name}-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 30

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  alarm_description = "Triggers when CPU drops below 30%"
  alarm_actions     = [aws_autoscaling_policy.scale_down.arn]
}