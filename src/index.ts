import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';

export class FargateStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc"); // <-- Fixes the ECR connection issue
    // const vpc = ec2.Vpc.fromLookup(this, "VPC", { isDefault: true });

    const logdriver = new ecs.AwsLogDriver({
      streamPrefix: "log",
      mode: ecs.AwsLogDriverMode.NON_BLOCKING,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    const lb = new elbv2.ApplicationLoadBalancer(this, "LB", {
      vpc,
      internetFacing: true,
    });

    const cluster = new ecs.Cluster(this, "Cluster", { vpc });
    const taskDefinition = new ecs.FargateTaskDefinition(this, "td");
    const sg = new ec2.SecurityGroup(this, "sg", {
      vpc,
      allowAllOutbound: true,
      description: "Allow container to see docker hub on internet",
    });
    const dnsNamespace = new servicediscovery.PrivateDnsNamespace(
      this,
      "DnsNamespace",
      {
        name: "dnsnamespaceRPA",
        vpc: vpc,
        description: "Private DnsNamespace for my Microservices",
      }
    );
    const sv = new ecs.FargateService(this, "service", {
      cluster,
      taskDefinition,
      securityGroups: [sg],
      enableExecuteCommand: true,
      cloudMapOptions: {
        name: "nginx",
        cloudMapNamespace: dnsNamespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
    });

    const listener1 = new elbv2.ApplicationListener(this, "Listener1", {
      loadBalancer: lb,
      port: 80,
    });

    const container = taskDefinition.addContainer("nginx", {
      image: ecs.ContainerImage.fromRegistry("nginx:alpine"),
      portMappings: [{ containerPort: 80, protocol: ecs.Protocol.TCP }],

      memoryLimitMiB: 512,
      logging: logdriver,
    });

    listener1.addTargets("something", {
      targetGroupName: "tg",
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [
        sv.loadBalancerTarget({
          containerName: "nginx",
          containerPort: 80,
        }),
      ],
      healthCheck: {
        enabled: true,
        port: "80",
        path: "/",
        healthyHttpCodes: "200",
      },
    });
  }
}

const app = new App();
new FargateStack(app, "FargateStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
