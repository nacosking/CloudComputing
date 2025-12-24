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

# ---------------------------------------------------------
# LAUNCH TEMPLATE (Mandatory Requirement)
# ---------------------------------------------------------

resource "aws_launch_template" "main" {
  name_prefix   = "${var.project_name}-lt-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  # Attach IAM instance profile for S3 and CloudWatch access
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
    exec > /var/log/user-data.log 2>&1
    set -e

    echo "=== Starting bootstrap at $(date) ==="

    # 1. Install System Dependencies
    apt-get update -y
    apt-get install -y nodejs npm git wget postgresql-client

    # 2. Install PM2 globally
    npm install -g pm2

    # 3. Clone Repository
    # We clone into /home/ubuntu/app
    cd /home/ubuntu
    rm -rf app
    git clone https://github.com/nacosking/CloudComputing.git app

    # 4. Fix Permissions (CRITICAL)
    chown -R ubuntu:ubuntu /home/ubuntu/app

    # 5. Build and Start the App (AS THE UBUNTU USER)
    # Using 'su - ubuntu -c' ensures environments variables are set for the correct user
    su - ubuntu -c '
        cd /home/ubuntu/app/Application
        
        echo "Installing dependencies..."
        npm install
        
        echo "Building app..."
        npm run build

        # Configure Environment Variables
        export PORT=5000
        export NODE_ENV=production
        # Note: using postgres:// matches what worked manually
        export DATABASE_URL="postgres://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
        export SESSION_SECRET="change-me-session-secret"

        # 6. Database Connection Retry Loop (Resilience)
        # This prevents the app from crashing if the DB isn't ready yet
        echo "Waiting for Database to be ready..."
        until pg_isready -d $DATABASE_URL; do
          echo "Database unavailable - sleeping..."
          sleep 5
        done
        echo "Database is up!"

        # 7. Start with PM2 using the CORRECT file (.cjs)
        echo "Starting PM2..."
        pm2 start dist/index.cjs --name "backend"
        
        # Freeze the process list for restarts
        pm2 save
    '

    # 8. Setup PM2 Startup System (Run as Root)
    env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
    systemctl start pm2-ubuntu
    
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