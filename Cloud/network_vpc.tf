# ---------------------------------------------------------
# VPC & SUBNET DEFINITIONS (Mandatory: Resilience & Networking)
# ---------------------------------------------------------

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

# --- Public Subnets (For Load Balancer) ---
resource "aws_subnet" "public" {
  count             = 2 # Deployed across two AZs (Mandatory for resilience)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true # Allows public IP assignment

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}"
    Type = "Public"
  }
}

# --- Private Subnets (For App Servers and Database) ---
resource "aws_subnet" "private" {
  count             = 2 # Deployed across two AZs
  vpc_id            = aws_vpc.main.id
  # Offset index by 2 (e.g., 10.0.2.0/24, 10.0.3.0/24)
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 2) 
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}"
    Type = "Private"
  }
}

# --- NAT Gateway Setup (Required for Private Subnet Outbound Internet) ---

# 1. Elastic IP for the NAT Gateway
resource "aws_eip" "nat" {
  vpc = true
}

# 2. NAT Gateway (Placed in the first Public Subnet)
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.project_name}-nat-gw"
  }
}

# 3. Route Table for Private Subnets
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id # Routes traffic out via NAT GW
  }
}

# 4. Associate Private Subnets with Private Route Table
resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# 5. DB Subnet Group (Mandatory for RDS deployment)
resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-db-subnet-group"
  subnet_ids  = aws_subnet.private[*].id # Uses all private subnets
}