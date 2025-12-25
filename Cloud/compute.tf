# ---------------------------------------------------------
# COMPUTE: ALB, LAUNCH TEMPLATE, ASG
# ---------------------------------------------------------

# --- FIXED: Added Data Source Here to Fix "Undeclared Resource" Error ---
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

# Create Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  # References security group defined in security.tf
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
# LAUNCH TEMPLATE (Mandatory Requirement)
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
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    # Redirect logs to a file so you can debug if something goes wrong
    exec > >(tee /var/log/user-data.log) 2>&1
    
    echo "--- Starting Initialization ---"

    # 1. Install System Dependencies
    apt-get update -y
    apt-get install -y git curl postgresql-client
    
    # Install Node.js 20
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs

    # 2. Setup Directory & Clone (Run as root, fix permissions later)
    mkdir -p /home/ubuntu/app
    
    # Clone directly into the target folder
    # Note: We clone into a temp folder and move it to ensure the structure is correct
    git clone -b master https://github.com/nacosking/CloudComputing.git /home/ubuntu/repo_temp
    mv /home/ubuntu/repo_temp/* /home/ubuntu/app/
    rm -rf /home/ubuntu/repo_temp

    # 3. Create .env file
    # We do this as root so we don't need complex quoting. 
    # Terraform replaces the variables ${...} here before the script ever runs.
    echo "Creating .env file..."
    cat <<EOT > /home/ubuntu/app/Reserve-Menu/.env
DATABASE_URL="postgresql://${var.db_username}:${urlencode(var.db_password)}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}?sslmode=no-verify"
S3_BUCKET_NAME="${aws_s3_bucket.app_storage.id}"
AWS_REGION="${var.aws_region}"
PORT=5000
NODE_ENV=production
EOT

    # 4. Fix Permissions
    # Give the 'ubuntu' user full ownership of the app directory
    chown -R ubuntu:ubuntu /home/ubuntu/app

    # 5. Build and Start App (Switch to ubuntu user safely)
    # We use a specific command string rather than a massive block
    echo "Switching to ubuntu user for installation..."
    su - ubuntu -c "
      cd /home/ubuntu/app/Reserve-Menu
      
      echo 'Installing global PM2...'
      sudo npm install -g pm2

      echo 'Installing dependencies...'
      npm install
      npm install @aws-sdk/client-s3 qrcode

      echo 'Building...'
      npm run build

      echo 'Starting PM2...'
      pm2 start dist/index.cjs --name 'reserve-menu'
      pm2 save
    "

    # 6. Finalize PM2 startup (Must be run as root)
    env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
    systemctl start pm2-ubuntu
    systemctl enable pm2-ubuntu

    echo "--- Deployment Complete ---"
  EOF
  )
}
# ---------------------------------------------------------
# AUTO SCALING GROUP (Mandatory Requirement)
# ---------------------------------------------------------

resource "aws_autoscaling_group" "main" {
  name                = "${var.project_name}-asg"

  # FIXED: Switched to PUBLIC subnets to ensure Internet Access for git clone
  vpc_zone_identifier = aws_subnet.public[*].id

  target_group_arns   = [aws_lb_target_group.main.arn]
  health_check_type   = "ELB"
  min_size            = var.min_size
  max_size            = var.max_size
  desired_capacity    = var.desired_capacity

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

resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.project_name}-scale-up"
  autoscaling_group_name = aws_autoscaling_group.main.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
  cooldown               = 300
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.project_name}-scale-down"
  autoscaling_group_name = aws_autoscaling_group.main.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 300
}