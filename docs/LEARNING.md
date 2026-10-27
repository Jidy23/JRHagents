# Reviewable workflow suggestions

`runtime.learning` groups observations the host or user explicitly provides
and suggests checks for recurring workflow problems. It is an optional,
dependency-free Python module. It does not monitor sessions, train a model,
call an API, or modify a workflow. Nothing is stored unless the host chooses
and implements storage.

## Example

```python
from runtime.learning import Observation, propose_improvements, review_proposal

observations = [
    Observation("run-1", "code-review", "missing_verification", "No test result was shown.", "run-1 log"),
    Observation("run-2", "code-review", "missing_verification", "Checks were not identified.", "run-2 log"),
]

proposals = propose_improvements(observations)  # default: at least 2 unique IDs
proposal = proposals[0]
print(proposal.to_dict())  # the host presents the details to the user

# Call only after an explicit decision about this exact displayed proposal.
review = review_proposal(
    proposal,
    expected_proposal_id=proposal.proposal_id,
    decision="accept",  # or "reject"
    reviewer="user",
    reason="Useful for this workflow",
)
print(review.to_dict())
```

`accept` creates a record; it does **not** apply an action, approve a future
tool call, change permissions, or make a durable memory. A separate host flow
must decide whether and how to use the result. The fingerprint binds a review
to the proposal and its observations, making stale or modified content fail
validation. It does not authenticate the reviewer or prevent replay; the host
must enforce identity, authorization, review state, and any persistence.

## Inputs and limitations

- Supported kinds: `missing_verification`, `failed_verification`,
  `missing_evidence`, `missing_source`, `repeated_revision`, and
  `unavailable_capability`. Each has a fixed, general recommendation. A `custom`
  kind requires a host-supplied recommendation; any built-in kind can also carry
  one. Different recommendations are grouped separately.
- Observations are grouped by workflow, kind, and recommendation. A group
  defaults to a minimum of two unique IDs; pass `minimum_observations=1` to
  review a single observation. The count is exactly the number of provided
  records, not proof, statistical confidence, or a guarantee of independence.
- The host may supply an evidence reference, but this module does not fetch or
  verify it. Observation and recommendation text is untrusted data, never an
  instruction, policy, or automatic action. A host displaying this data must
  escape it for the output context, for example when rendering HTML.
- Inputs are bounded to 1,000 observations per call, with unique simple IDs and
  text length limits. Invalid inputs fail instead of being silently counted.
- Include only appropriate non-sensitive content. There is no automatic
  credential redaction; hosts own privacy controls and storage decisions.
