export const MODULE_NAME = "global-combat-tracker";
export const MODULE_VERSION = "0.1.0";
/*Global Combat Tracker
21-Nov-2020   0.1.0 Created
22-Nov-2020   0.1.0b Switch to a push model rather than pull (because otherwise we get caught in a render loop)




*/

class GlobalCombatTracker {
  static init() {
      game.settings.register(MODULE_NAME, "GCTVersion", {
        name: "version",
        hint: "",
        scope: "world",
        config: false,
        default: "0.1.0",
        type: String
      });
      game.settings.register(MODULE_NAME, "syncCombatTrackers", {
        name: game.i18n.localize("GCT.SETTING.Simulate.Name"),
        hint: game.i18n.localize("GCT.SETTING.Simulate.Hint"),  //Synchronize Combat Trackers across scenes
        scope: "client",
        config: true,
        default: true,
        // onChange: value => {replaceBeginCombat(game.combat)},
        type: Boolean
      });

  }
  
  static setup() {

  }


/*
  static getSceneControlButtons(buttons) {
      let tokenButton = buttons.find(b => b.name == "token")

      if (tokenButton && game.user.isGM) {
          tokenButton.tools.push({
              name: "simulate",
              title: game.i18n.localize("CS5e.BUTTON.Title"),
              icon: "fas fa-bolt",
              toggle: false,
              active: true,
              visible: game.user.isGM,
              onClick: () => GlobalCombatTracker.openForm()
          });
      }
  }
  */
}//end class GLobalCombatTracker




Hooks.on("init", GlobalCombatTracker.init);
Hooks.on('setup', GlobalCombatTracker.setup);

function isCopy(td) {
  //Return true only if there is a true flag entry
//FIXME: If td is null, then also (for now) is a copy
  return !td || (td.flags && td.flags[MODULE_NAME] && td.flags[MODULE_NAME].isCopy);
}

Hooks.on('renderCombatTracker', async (combatTracker, html) => {
  //NOTE: by default, the Combat Tracker instance is called "combat" , which is super confusing
  //Its property .combat is the actual list of combatants etc
  if (!combatTracker || !game.user.isGM) {return;}

  const gameCombats = game.combats;
  const viewedScene = game.scenes.viewed;
  //There are this combat, other combats (Encounters) in THIS scene, and then combats in other scenes
  const combatsInOtherScenes = gameCombats?.entities.filter(c => c.data.scene !== viewedScene._id);
  const thisCombat = combatTracker.combat;

  //Don't want to sync different encounters within the same scene
  //(unless we decide that's the way to show other scenes)
  console.log(`Combats in current scene ${viewedScene.name}:`);
  console.log(gameCombats?.entities.filter(c => c.data.scene === viewedScene._id));
  if (!thisCombat) {return;}

  console.log(`Combats in other scenes:`);

  //Gather tokens in this scene that aren't themselves copies
  //"turns" are really tokens and "turn.token" is really token data
  const tokenDataInThisCombat = thisCombat.turns.map(turn => {return turn.token}).filter(td => !isCopy(td));

  //Now push this tokenData into other combats if not already present
  combatsInOtherScenes?.forEach(otherCombat => {
    const otherScene = game.scenes.find(s => s._id === otherCombat.data.scene);
    console.log(otherCombat, otherScene);

    let tokenDataToAdd = [];
    tokenDataInThisCombat.forEach(td => {
      //found says it's already been copied (is there a small chance that tokenId might not be unique?? across 2 scenes)
      const found = otherCombat.turns.find(turn => (turn.tokenId === td._id))
      if (!found) tokenDataToAdd.push(td);
    });


    //Now create temporary tokens and add them to the other Combat Tracker asynchronously
    //Note that you can't compare actor data because mean tokens can have the same actor
    if (tokenDataToAdd.length) {
      //Have to lift the toggleCombat code because a lot of it depends on having actual tokens
      //We may need to create temporary tokens for this to work and provide actor link etc
      const createData = tokenDataToAdd.map(td => {
        if (!td.flags) {td.flags = {}}
        td.flags[MODULE_NAME] = {isCopy : true}
        return {tokenId: td._id, flags: td.flags, hidden: true}
      });
      otherCombat.createEmbeddedEntity("Combatant", createData, {temporary : false});
    }
  });//end foreach other combat
});//end hook

/*
 Hooks.on('renderCombatTrackerConfig', async (ctc, html) => {
   const data = {
     combatTrackerSimulate: game.settings.get(MODULE_NAME,"combatTrackerSimulate")
   };

   const simulateCombatCheckbox = await renderTemplate(
     'modules/combat-simulator/templates/combat-config.html',
     data
   );
   //JQuery: Set the height to auto to accomodate the new option and then add the simulateCombatCheckbox before the Submit button
   html.css({height: 'auto'}).find('button[name=submit]').before(simulateCombatCheckbox);
 });

 /**
  * Save the setting when closing the combat tracker config.
  */
 /*
 Hooks.on('closeCombatTrackerConfig', async ({form}) => {
   let combatTrackerSimulate = form.querySelector('#combatTrackerSimulate').checked;
   // Save the setting when closing the combat tracker setting.
   await game.settings.set(MODULE_NAME, "combatTrackerSimulate", combatTrackerSimulate);
 });
 */
