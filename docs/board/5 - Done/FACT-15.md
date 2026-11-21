# Summary
Add New Game screen
# Details
**Assignee:** Ches Burks
**Reporter:** Ches Burks
**Labels:** #Factory-Client
**Priority:** Medium
**Related Tickets:** 
# Description
The Single Player screen lists the saves in the Home's `saves/` folder, most recently played first, each with a Play button. New Game opens a screen with the save's name, a dropdown of the world types the data defines, and an optional seed. Create makes the save (`save.kvt` and the first world's `world.kvt`, see [Save File Format](../../design/User%20Data/Save%20File%20Format.md)) and starts the game. The main menu, Single Player and New Game are retained UI specs in Factory-Client's `ui/` resources.

Not done yet: the server doesn't load the save, deleting or renaming saves, and Enter in a field doesn't create (a text field's submit also fires when it loses focus).

# Comments

