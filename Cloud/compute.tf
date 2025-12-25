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

  # Now this will work because the data source is defined above
  image_id      = data.aws_ami.ubuntu.id

  instance_type = var.instance_type

  # Attach IAM instance profile for S3 and CloudWatch access
  # Uses the data source defined in security.tf
  iam_instance_profile {
    name = data.aws_iam_instance_profile.lab_profile.name
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.web.id]
  }

  user_data = base64encode(<<-EOF
#!/bin/bash

# --- A. LOGGING SETUP ---
# Redirect all output to /var/log/user-data.log for debugging
exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting deployment..."

# --- B. PRE-INSTALLATION CHECKS ---
# Wait for automatic system updates to finish to prevent "apt lock" errors
while fuser /var/lib/dpkg/lock >/dev/null 2>&1 ; do
    echo "Waiting for other software managers to finish..." 
    sleep 1
done

# --- C. SYSTEM DEPENDENCIES ---
# Prevent interactive pop-ups (pink screens)
export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y git curl postgresql-client

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# --- D. DIRECTORY SETUP ---
# Create app directory and transfer ownership to 'ubuntu' user
mkdir -p /home/ubuntu/app
chown -R ubuntu:ubuntu /home/ubuntu/app

# --- E. APPLICATION DEPLOYMENT (Run as 'ubuntu' user) ---
# Using 'su - ubuntu' ensures files are owned by the user, not root
su - ubuntu -c '
    echo "Running setup as user: $(whoami)"
    
    # 1. Install PM2 globally
    sudo npm install -g pm2
    
    # 2. Clone Repository
    cd /home/ubuntu
    rm -rf app
    # CHANGED: "master" to "main" (common cause of failure)
    git clone -b master https://github.com/nacosking/CloudComputing.git app
    
    # 3. Install Project Dependencies
    cd /home/ubuntu/app/Reserve-Menu
    echo "Installing npm packages..."
    npm install
    npm install @aws-sdk/client-s3 qrcode
    
    # 4. Generate .env File (Crucial for Persistence)
    echo "Creating .env file..."
    cat <<EOT > .env
DATABASE_URL="postgresql://dbadmin:SecurePass%232025%21@cloud-project-db.cjw1tqy2i0kb.us-east-1.rds.amazonaws.com:5432/appdb?sslmode=no-verify"
S3_BUCKET_NAME="cloud-project-app-storage-135739449447"
AWS_REGION="us-east-1"
PORT=5000
NODE_ENV=production
EOT

    # 5. Build and Start Application
    echo "Building application..."
    npm run build
    
    echo "Starting PM2..."
    pm2 start dist/index.cjs --name "reserve-menu"
    pm2 save
'

# --- F. FINAL SYSTEM CONFIGURATION ---
# Configure PM2 to start automatically on system reboot
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
systemctl start pm2-ubuntu

echo "Deployment complete!"
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