# Secret Manager Example

This example demonstrates a best practice approach to keeping secrets externally.

Unlike the minimal example, this example contains a code dependencies (defined in package.json), and also depends on the external Secret Manager service.

The code refers to a statically named secret, which you would manually register within Secret Manager ahead of time.