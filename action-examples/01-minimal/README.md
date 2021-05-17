# Minimal Example

**Pros**

  - No external code/module dependencies
  - No external service dependencies, so can easily be mocked locally

**Cons**

  - Keeps secrets in env variables, which is not appropriate in GCF's where any admin with read access could see them
