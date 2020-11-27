# Global Compbat Tracker
Prototype of synchronizing combat trackers across Scenes in Foundry
**WARNING**: Back up your world before testing this

* **Author**: Spetzel#0103 (Discord)
* **Version**: 0.2.0
* **Foundry VTT Compatibility**: 0.6.5-0.7.7
* **System Compatibility (If applicable)**: N/A
* **Translation Support**: en


# Description
Run combat across multiple scenes (for example, multi-level houses, chase scenes, teleportation, or inter-connected dungeon levels.

**Known incompatible modules (turn these off):**
- GM-Token-Drag-Visibility

# Install
1. Go to the "Add-on Modules" tab in Foundry Setup
2. Click "Install Module" and paste this link: `https://raw.githubusercontent.com/spetzel2020/global-combat-tracker/releases/download/0.2.0/module.json`
3. Open your world and go to Settings>Manage Modules and enable **Global Combat Tracker**

# Using Global Combat Tracker
1. Open the Global Combat Tracker (GCT) by clicking in the Sidebar or right-clicking the Combat icon; you should see the normal Combat Tracker except with **Global Combat Tracker** in the title bar
2. Pick a token and toggle-combat to add it to the GCT
3. Switch Scenes; at this point the normal Combat Tracker would be blank, but GCT retains the existing tokens
4. Add more tokens in the same way to the GCT
5. Click Begin Combat, roll initiative, do the normal combat things
6. You can click on a combatant to move to the scene and location of the token you added

## Things to notice/watch for:
- GCT adds a mirror Scene called **GCT Mirror Scene**; this should be automatically deleted when you delete all combats
- GCT may interact badly with other modules that expect the Combat Tracker to be linked to one (real) scene; please open an Issue or DM me on Discord
- Remember I told you to back up your world!

## Contributions
*Coming Soon!*

## License
**Global Combat Tracker for Foundry VTT** by Jeffrey Pugh is licensed under the [GNU General Public License v3.0](https://github.com/spetzel2020/global-combat-tracker/blob/master/LICENSE)

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development v 0.1.6](http://foundryvtt.com/article/license/).
