# ---------------------------------------------------------
# COMPUTE: ALB, LAUNCH TEMPLATE, ASG
# ---------------------------------------------------------

# --- 1. Load Balancer ---
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
  port     = 5000       # Port your Node app listens on
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/"
    port                = "5000"
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
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
# 2. Launch Template (Fixed for Lab & Memory)
# ---------------------------------------------------------
resource "aws_launch_template" "main" {
  name_prefix   = "${var.project_name}-lt-"
  
  # CRITICAL FIX 1: Use hardcoded AMI ID from locals (No Data Source)
  image_id      = local.ami_id 
  
  instance_type = "t2.micro" # Hardcoded to free tier

  # CRITICAL FIX 2: Use hardcoded ARN (No Data Source)
  iam_instance_profile {
    arn = local.lab_instance_profile_arn
  }

  network_interfaces {
    associate_public_ip_address = true
    # Ensure this matches the resource name in security.tf (app vs web)
    security_groups             = [aws_security_group.app.id] 
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    
    # --- A. LOGGING & MEMORY FIX ---
    exec > >(tee /var/log/user-data.log) 2>&1
    
    # CRITICAL FIX 3: Add Swap Space (Prevents crash during npm install)
    echo "Adding swap space to prevent OOM..."
    dd if=/dev/zero of=/swapfile bs=128M count=16
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile swap swap defaults 0 0" >> /etc/fstab

    # --- B. DEPENDENCIES ---
    echo "Installing dependencies..."
    apt-get update -y
    apt-get install -y git curl postgresql-client
    
    # Install Node.js 20
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs

    # --- C. APP SETUP ---
    mkdir -p /home/ubuntu/app
    chown -R ubuntu:ubuntu /home/ubuntu/app

    # --- D. DEPLOYMENT (Run as ubuntu user) ---
    su - ubuntu -c '
        # 1. Setup PM2
        sudo npm install -g pm2
        
        # 2. Clone Repo
        cd /home/ubuntu
        rm -rf app
        git clone -b master https://github.com/nacosking/CloudComputing.git app
        
        # 3. Install & Build
        cd /home/ubuntu/app/Reserve-Menu
        echo "Installing npm packages..."
        npm install
        npm install @aws-sdk/client-s3 qrcode
        
        # 4. Generate .env
        cat <<-EOT > .env
DATABASE_URL="postgresql://admin:${urlencode(var.db_password)}@${aws_db_instance.default.endpoint}/${aws_db_instance.default.db_name}?sslmode=no-verify"
S3_BUCKET_NAME="${aws_s3_bucket.app_storage.id}"
AWS_REGION="${var.region}"
PORT=5000
NODE_ENV=production
EOT

        # 5. Build
        echo "Building application..."
        npm run build
        
        # 6. Start
        echo "Starting PM2..."
        pm2 start dist/index.cjs --name "reserve-menu"
        pm2 save
    '

    # --- E. PM2 STARTUP HOOK ---
    env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
    systemctl start pm2-ubuntu
    
    echo "Deployment complete!"
  EOF
  )
}

# ---------------------------------------------------------
# 3. Auto Scaling Group
# ---------------------------------------------------------
resource "aws_autoscaling_group" "main" {
  name                = "${var.project_name}-asg"
  vpc_zone_identifier = aws_subnet.public[*].id
  target_group_arns   = [aws_lb_target_group.main.arn]
  
  # Capacity
  min_size            = 1
  max_size            = 2
  desired_capacity    = 1

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-asg-instance"
    propagate_at_launch = true
  }
}

# Scaling Policies (Simple CPU scaling is more reliable for labs)
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "scale_up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "scale_down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}