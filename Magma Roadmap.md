
# Magma Roadmap

**Note**: All of this isn't set in stone. Features can be added, removed, or changed. More bugs/issues will most definitely show up. Story points are a rough rough estimate and will most likely change +-.

## Current V4 features (29 - 49 SP)
- Merge in updates from master branch to magma branch
	- 1 Story point
- Update plugins to Vue
	- Already updated:
		- Atomic
		- Emu
		- Mock
		- Sandcat
		- ssl
		- Stockpile
	- Need updating:
		- 15 in total (30 - 45 story points)
		- Access
		- builder
		- Compass
		- Debrief
		- Fieldmanual
		- Gameboard
		- Human
		- Manx
		- mock
		- Response
		- Training
		- Arsenal
		- CalTack
		- Pathfinder
		- SAML
- Replicate current behavior when you log into Caldera as blue or red. Currently on magma, if you log into red it shows all plugins instead of just the ones available for red and vice versa with blue. Additionally there is no color change for either logins.
	- 3 Story points
- Implement configuration pages (settings, fact sources, objectives, contacts, exfilled files) Epic
	- 10-15 Story points

## New V5 features (38-46 SP)
- Replicate browser tabs (ability to reorder tabs, etc.)
	- 2-3 Story points
- When importing an adversary display an example yaml file
	- 1 Story point
- Make sidebar actually collapse and adjust description/icons
	- Possibly get rid of caldera title and just keep logo on collapse?
	- 2 Story point
- Implement rest of home dashboard - Operations, Abilities, Adversaries
	- 2-4 Story points each - 6-12 total
- User attributes, roles and preferences Epic?
	- Overhaul user model:
		- Users can belong to a group that aren't role based, group shares agents. operations, and adversaries
	- User preferences:
		- Font size
		- set default settings
		- change layout of home page
	- Notifications and action history
		- Example notification: "Operation XYZ has finished running", "XYZ has run into an issue", "Agent XYZ has died", etc.
		- Action history: View "timeline" of previous actions e.g. "Operation XYZ finished running at 10:02", "Agent started at 4:07", etc.
	- 20 Story points?
- Theme overhaul
	- Ideas? Still working on it
	- ? Story points
- Improvements to training Epic?
	- No server restarts needed to complete training
	- Training popup/tour to guide you through interface on first start
	- 5-8 Story points

  
## Bug fixes/issues (16 SP)
- Remove magma from the plugin list in navigation/make sure navigation is correct for plugins
	- 1 Story point
- Fix bugs in operations page and possibly refactor code
	- 4 Story points
- Fix routing in production - Currently routing using the development server works perfectly. In prod you can navigate, but all the frontend does is push route names to the URL bar. It doesn't actually serve the html/javascript from that route, therefore if you refresh a page `localhost:8888/opearations` it will give you a 404 error since the page doesn't technically exist because the python server isn't serving it at that endpoint
	- 3 Story points
- Fix Mock not being installed on git clone --recursive
	- 1 Story point
- Possibly change how abilities are searched during agent configuration: currently fuzzy finding instead of exact
	- 2 Story points
- Ability -> Create Ability -> Add executor: Select options are not selected by default - Either change it so there are default options or add a "disabled" option ("Please select an option")
	- 1 Story point
- Implement modals instead of browser alerts across the board - e.g. deleting an adversary shows a browser alert instead of a modal and warning
	- 3 Story point
- Install magma in the plugins directory automatically when cloning repo recursively 
	- 1 Story point

## Other (5-10 SP)
- Ready deployment - Could be an Epic. CI/CD and generally get everything ready to deploy the master branch
	- 5-10 Story points
- QA testing
- Update frontend testing
- Should we add warnings before editing agents?
- Side bar styling: lowercase or uppercase?
- Color theme: Currently purple - How do we style red vs blue then? Still on board with purple?


