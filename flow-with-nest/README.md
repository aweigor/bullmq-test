### NestJs flow processor working example

Flow processing can be used in cases when we need to wait and monitor group of jobs. Parent job only fires when all child jobs completed.

If child job throws errors and cannot be finished, parent job will never be able to process result of other (completed) processes, so I added attempts tracking for queue with attempts, and added timeout listener in main script, so after timeout all jobs must be finished or they will be removed