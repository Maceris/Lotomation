# Summary
Move item/block/tag/etc loading to event-based
# Details
**Assignee:** Ches Burks
**Reporter:** Ches Burks
**Labels:** 
**Priority:** Medium
**Related Tickets:** 
# Description
Instead of loading tags, materials, blocks, and items from their current methods, we should load them via events. This way other plugins have a chance to inject things before/after each stage of loading defaults and are aware of what is going on.
# Comments

