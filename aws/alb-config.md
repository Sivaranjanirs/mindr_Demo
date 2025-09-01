# ALB Configuration for Long Streaming Responses

## Overview
To prevent ALB from terminating long-running streaming responses (like AI generation), the idle timeout must be configured appropriately.

## Configuration Settings

### Target Group Settings
```bash
# Set idle timeout to 180 seconds (3 minutes)
aws elbv2 modify-target-group-attributes \
    --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/your-tg-name \
    --attributes Key=deregistration_delay.timeout_seconds,Value=180

# Configure health check settings for streaming endpoints
aws elbv2 modify-target-group-attributes \
    --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/your-tg-name \
    --attributes \
        Key=health_check.interval_seconds,Value=30 \
        Key=health_check.timeout_seconds,Value=5 \
        Key=health_check.healthy_threshold_count,Value=2 \
        Key=health_check.unhealthy_threshold_count,Value=2
```

### Load Balancer Attributes
```bash
# Set idle timeout on the load balancer itself
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn arn:aws:elasticloadbalancing:region:account:loadbalancer/app/your-alb-name \
    --attributes Key=idle_timeout.timeout_seconds,Value=180
```

### Terraform Configuration
If using Terraform, add these settings:

```hcl
resource "aws_lb" "mindr_alb" {
  name               = "mindr-alb"
  load_balancer_type = "application"
  subnets            = var.subnet_ids
  security_groups    = [aws_security_group.alb.id]

  # Set idle timeout to 180 seconds for long streaming responses
  idle_timeout = 180

  enable_deletion_protection = false

  tags = {
    Name = "mindr-alb"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "mindr_backend" {
  name     = "mindr-backend-tg"
  port     = 8000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  # Important: Set deregistration delay for graceful shutdowns
  deregistration_delay = 180

  tags = {
    Name = "mindr-backend-tg"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "mindr_frontend" {
  name     = "mindr-frontend-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200,404"  # Frontend may return 404 for unknown routes
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  deregistration_delay = 30  # Frontend can drain faster

  tags = {
    Name = "mindr-frontend-tg"
    Environment = var.environment
  }
}
```

### CloudFormation Configuration
If using CloudFormation:

```yaml
ALB:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    Name: mindr-alb
    Type: application
    Scheme: internet-facing
    IpAddressType: ipv4
    Subnets: !Ref SubnetIds
    SecurityGroups:
      - !Ref ALBSecurityGroup
    LoadBalancerAttributes:
      - Key: idle_timeout.timeout_seconds
        Value: '180'  # 3 minutes for long streaming
      - Key: access_logs.s3.enabled
        Value: 'true'
      - Key: access_logs.s3.bucket
        Value: !Ref LoggingBucket

BackendTargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    Name: mindr-backend-tg
    Port: 8000
    Protocol: HTTP
    VpcId: !Ref VpcId
    HealthCheckIntervalSeconds: 30
    HealthCheckPath: /health
    HealthCheckProtocol: HTTP
    HealthCheckTimeoutSeconds: 5
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 2
    TargetGroupAttributes:
      - Key: deregistration_delay.timeout_seconds
        Value: '180'
      - Key: stickiness.enabled
        Value: 'false'
```

## Listener Rules for Streaming Endpoints

### Backend API Routes (streaming)
```bash
# Create listener rule for backend API with proper timeout handling
aws elbv2 create-rule \
    --listener-arn arn:aws:elasticloadbalancing:region:account:listener/app/your-alb/listener-id \
    --priority 100 \
    --conditions Field=path-pattern,Values='/chat,/health,/reindex' \
    --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account:targetgroup/backend-tg
```

### Frontend Routes (static content)
```bash
# Create default rule for frontend
aws elbv2 create-rule \
    --listener-arn arn:aws:elasticloadbalancing:region:account:listener/app/your-alb/listener-id \
    --priority 200 \
    --conditions Field=path-pattern,Values='/*' \
    --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account:targetgroup/frontend-tg
```

## Security Group Configuration

```bash
# ALB Security Group - Allow HTTP/HTTPS inbound
aws ec2 create-security-group \
    --group-name mindr-alb-sg \
    --description "Security group for Mindr ALB"

aws ec2 authorize-security-group-ingress \
    --group-id sg-alb-id \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id sg-alb-id \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# Backend Security Group - Allow ALB traffic
aws ec2 create-security-group \
    --group-name mindr-backend-sg \
    --description "Security group for Mindr backend"

aws ec2 authorize-security-group-ingress \
    --group-id sg-backend-id \
    --protocol tcp \
    --port 8000 \
    --source-group sg-alb-id
```

## Monitoring and Alerting

### CloudWatch Alarms
```bash
# Monitor target response time for long requests
aws cloudwatch put-metric-alarm \
    --alarm-name "Mindr-High-Response-Time" \
    --alarm-description "Alert when response time exceeds 30 seconds" \
    --metric-name TargetResponseTime \
    --namespace AWS/ApplicationELB \
    --statistic Average \
    --period 300 \
    --threshold 30 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=LoadBalancer,Value=app/mindr-alb Name=TargetGroup,Value=targetgroup/mindr-backend-tg \
    --evaluation-periods 2

# Monitor connection counts
aws cloudwatch put-metric-alarm \
    --alarm-name "Mindr-High-Connection-Count" \
    --alarm-description "Alert when active connections exceed 100" \
    --metric-name ActiveConnectionCount \
    --namespace AWS/ApplicationELB \
    --statistic Sum \
    --period 300 \
    --threshold 100 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=LoadBalancer,Value=app/mindr-alb \
    --evaluation-periods 2
```

### Custom Metrics for Streaming
Add these metrics to your FastAPI backend:

```python
import boto3
import time
from datetime import datetime

cloudwatch = boto3.client('cloudwatch')

def publish_streaming_metrics(request_id: str, duration_ms: float, success: bool):
    """Publish custom metrics for streaming requests"""
    try:
        cloudwatch.put_metric_data(
            Namespace='Mindr/Streaming',
            MetricData=[
                {
                    'MetricName': 'StreamDuration',
                    'Value': duration_ms,
                    'Unit': 'Milliseconds',
                    'Dimensions': [
                        {
                            'Name': 'RequestType',
                            'Value': 'Chat'
                        }
                    ],
                    'Timestamp': datetime.utcnow()
                },
                {
                    'MetricName': 'StreamSuccess',
                    'Value': 1 if success else 0,
                    'Unit': 'Count',
                    'Dimensions': [
                        {
                            'Name': 'RequestType', 
                            'Value': 'Chat'
                        }
                    ],
                    'Timestamp': datetime.utcnow()
                }
            ]
        )
    except Exception as e:
        print(f"Failed to publish metrics: {e}")
```

## Testing Long Connections

### Test Script
```bash
#!/bin/bash
# Test long streaming connections

echo "Testing streaming endpoint with curl..."
curl -X POST http://your-alb-domain/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about sleep hygiene"}' \
  --max-time 200 \
  --connect-timeout 10 \
  --no-buffer

echo "Testing health endpoint..."
curl -X GET http://your-alb-domain/health

echo "Testing frontend..."
curl -X GET http://your-alb-domain/
```

### Load Testing for Streaming
```bash
# Using Apache Bench for concurrent streaming requests
ab -n 10 -c 2 -T 'application/json' -p chat-payload.json http://your-alb-domain/chat

# chat-payload.json content:
# {"message": "Tell me about nutrition"}
```

## Troubleshooting

### Common Issues
1. **504 Gateway Timeout**: ALB idle timeout too low
2. **Connection Reset**: Target group deregistration delay too short  
3. **Intermittent Failures**: Health check timeout too aggressive

### Debugging Commands
```bash
# Check ALB attributes
aws elbv2 describe-load-balancer-attributes --load-balancer-arn <arn>

# Check target group health
aws elbv2 describe-target-health --target-group-arn <arn>

# View ALB access logs
aws s3 ls s3://your-alb-logs-bucket/ --recursive

# Monitor real-time metrics
aws logs filter-log-events \
    --log-group-name /aws/applicationelb/mindr-alb \
    --start-time $(date -d '5 minutes ago' +%s)000 \
    --filter-pattern '[timestamp, request_id, client_ip, client_port, target_ip, target_port, request_processing_time, target_processing_time >= 30, response_processing_time, elb_status_code, target_status_code, received_bytes, sent_bytes, "\"POST /chat HTTP/1.1\""]'
```

This configuration ensures that long AI streaming responses (up to 3 minutes) won't be terminated by ALB idle timeouts, while the heartbeat mechanism keeps connections alive during processing.