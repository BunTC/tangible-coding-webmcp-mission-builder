# Manual Step 7 local proposal fixture

This procedure is for local manual testing only. It seeds one production-schema-compatible pending proposal into the current fictional browser draft. It is not a WebMCP simulation, does not call an agent or network, and must not be used with real pupil or school information.

1. Build the fictional sample mission in the application so the browser has a current draft.
2. Open the browser developer console on the local application.
3. Run the following code once, then reload the page:

```js
const key = 'tangible-coding-studio:mission-builder:draft:v1'
const draft = JSON.parse(localStorage.getItem(key))
const before = draft.mission.learningIntention
draft.status = 'needs-review'
draft.validation = { readiness: 'blocked', score: 0, checks: [], preparedOutputs: [], acknowledgedWarningIds: [] }
draft.pendingChanges = [{
  changeSetId: 'manual-step-7-set-1',
  source: 'webmcp-agent',
  toolName: 'build_tangible_mission',
  createdAt: '2026-08-28T12:00:00.000Z',
  operations: [{
    operationId: 'manual-step-7-operation-1',
    section: 'learning-intention',
    before,
    proposed: 'We are learning to test, explain and improve a story sequence.',
    status: 'pending',
    validation: { valid: true, messages: [] }
  }]
}]
draft.changeHistory ??= []
localStorage.setItem(key, JSON.stringify(draft))
```

Use the Step 7 review controls to accept, edit-and-accept or reject the section. Starting a new mission or loading/replacing the demo mission clears this bounded local proposal history.

## Targeted attribution check

1. Seed the proposal above, reload, and accept it. Expect resolved history to retain the proposal ID, tool, section, original proposed value, accepted decision and decision timestamp.
2. Edit the accepted learning intention through the normal Step 4 field. Expect the canvas to show the teacher's new value while resolved history still shows the unchanged historical proposed value.
3. Expect resolved history to label the current section attribution `Teacher edited after accepting this proposal.` It must not describe either action as lesson approval.
4. Reload the page. Expect both the teacher-edited current value and the original resolved proposal history and attribution to remain visible.
5. Use Start New Mission before another fixture run, rebuild the fictional sample mission, seed once, and reload. This avoids reusing resolved fixture IDs.
