# GitHub Code Scanning

The Action can upload SARIF when the caller grants `security-events: write`. For pull requests from forks, SARIF upload and PR comments are skipped because the token cannot safely write to the base repository.
