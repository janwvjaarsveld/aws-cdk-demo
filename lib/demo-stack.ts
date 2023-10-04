import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class DemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "OurDemoVPC", {
      cidr: "10.1.0.0/16",
      maxAzs: 2,
      subnetConfiguration: [
        { cidrMask: 24, name: "Web", subnetType: ec2.SubnetType.PUBLIC },
        {
          cidrMask: 24,
          name: "Application",
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        },
      ],
    });
    const asg = new autoscaling.AutoScalingGroup(this, "ASG", {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: new ec2.AmazonLinuxImage(),
    });

    asg.addUserData(`
    yum update -y
    yum install httpd -y
    echo 'Hello from the CDK' > /var/www/html/index.html
    service httpd start
    chkconfig httpd on`);

    const lb = new elbv2.ApplicationLoadBalancer(this, "LB", {
      vpc,
      internetFacing: true,
    });
    const listener = lb.addListener("Listener", { port: 80 });
    listener.addTargets("Target", { port: 80, targets: [asg] });
    listener.connections.allowDefaultPortFromAnyIpv4("Open to the world!");
  }
}
