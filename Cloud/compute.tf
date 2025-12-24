# ---------------------------------------------------------
# APPLICATION LOAD BALANCER (Mandatory Requirement)
# ---------------------------------------------------------

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical (The company that makes Ubuntu)

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
# Create Application Load Balancer
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

# Create Target Group (Routes traffic to EC2 instances)
resource "aws_lb_target_group" "main" {
  name     = "${var.project_name}-tg"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  # Health check configuration
  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 10     # Increased for more retries
    timeout             = 30     # Increased timeout
    interval            = 60     # Increased interval
    path                = "/"
    matcher             = "200,301,302,304"
    port                = "traffic-port"
  }

  tags = {
    Name = "${var.project_name}-target-group"
  }
}

# Create Listener (Forwards HTTP traffic to Target Group)
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
# LAUNCH TEMPLATE (Mandatory Requirement)
# ---------------------------------------------------------

resource "aws_launch_template" "main" {
  name_prefix   = "${var.project_name}-lt-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  # Attach IAM instance profile for S3 and CloudWatch access
  # Uses the existing LabInstanceProfile provided by AWS Academy
  iam_instance_profile {
    name = data.aws_iam_instance_profile.lab_profile.name
  }

  # Network configuration
  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.web.id]
  }

  # User data script (Bootstrap script that runs on instance startup)
  user_data = base64encode(<<-EOF
#!/bin/bash
set -e
exec > >(tee /var/log/user-data.log) 2>&1
echo "=== Starting bootstrap at $(date) ==="

# 1. Update System
echo "Updating system..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# 2. Install Dependencies
echo "Installing dependencies..."
apt-get install -y git curl build-essential

# 3. Install Node.js 20
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 4. Install PM2
echo "Installing PM2..."
npm install -g pm2

# 5. Clone Repository
echo "Cloning repository..."
cd /home/ubuntu
rm -rf app  # Remove if exists
git clone -b testing https://github.com/nacosking/CloudComputing.git app
chown -R ubuntu:ubuntu app

# 6. Setup Application
echo "Setting up application..."
cd /home/ubuntu/app/Application

# Wait for RDS to be ready
echo "Waiting for database..."
sleep 30

# Set environment variables
export PORT=5000
export NODE_ENV=production
export DATABASE_URL="postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
export SESSION_SECRET="change-me-session-secret-$(openssl rand -hex 32)"

# Install dependencies
echo "Installing npm packages..."
npm install

# Run database migrations
echo "Running database migrations..."
npx drizzle-kit push || echo "Migration failed, continuing..."

# Build the application
echo "Building application..."
npm run build

# 7. Start Application with PM2
echo "Starting application..."
sudo -u ubuntu bash <<'USEREOF'
cd /home/ubuntu/app/Application
export PORT=5000
export NODE_ENV=production
export DATABASE_URL="postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
export SESSION_SECRET="change-me-session-secret"

pm2 start npm --name "reserve-menu" -- start
pm2 save
USEREOF

# 8. Setup PM2 startup
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# 9. Create health check endpoint test
echo "Testing application..."
sleep 10
curl -f http://localhost:5000 || echo "App not responding yet"

echo "=== Bootstrap complete at $(date) ==="
EOF
  )
  update_default_version = true

  tags = {
    Name = "${var.project_name}-launch-template"
  }
}
# ---------------------------------------------------------
# AUTO SCALING GROUP (Mandatory Requirement)
# ---------------------------------------------------------

resource "aws_autoscaling_group" "main" {
  name                = "${var.project_name}-asg"
  vpc_zone_identifier = aws_subnet.public[*].id
  target_group_arns   = [aws_lb_target_group.main.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 600  # Increased to allow more startup time

  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.desired_capacity

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  # Instance refresh configuration (for zero-downtime updates)
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-asg-instance"
    propagate_at_launch = true
  }

  tag {
    key                 = "ManagedBy"
    value               = "AutoScaling"
    propagate_at_launch = true
  }
}

# ---------------------------------------------------------
# AUTO SCALING POLICIES (Mandatory Requirement)
# ---------------------------------------------------------

# Scale Up Policy (Triggered by high CPU alarm)
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.project_name}-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

# Scale Down Policy (Triggered by low CPU alarm)
resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.project_name}-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}