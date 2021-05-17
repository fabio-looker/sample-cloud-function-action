# Minimal Example

**Pros**

  - Does not require any NPM dependencies (easier to deploy in GCF UI)

**Cons**

  - Does not demonstrate how to retrieve secrets from Google Cloud Storage or other permissioned product, and instead relies on entering secrets into an ENV variable which may be read by other admins with edit permissions to the function
  - Does not demonstrate OAuth
