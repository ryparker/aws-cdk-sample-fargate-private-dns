# AWS CDK Sample

## :rocket: Quick Start

**1. Install dependencies with Yarn v1**

```shell
yarn install
```

**2. Build Cloudformation files**

```shell
yarn build
```

**3. Create the [bootstrap stack](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) in your AWS account**
_This only needs to be ran once per account/region._

```shell
yarn bootstrap
```

**4. Deploy**

```shell
yarn deploy --all
```
