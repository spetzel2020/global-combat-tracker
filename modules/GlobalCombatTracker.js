export const MODULE_NAME = "global-combat-tracker";
export const MODULE_VERSION = "0.1.0";
/*Global Combat Tracker
21-Nov-2020   0.1.0 Created
22-Nov-2020   0.1.0 Switch to a push model rather than pull (because otherwise we get caught in a render loop)




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


Hooks.on('renderCombatTracker', async (combat, html) => {
  if (!combat || !game.user.isGM) {return;}

  //See whether we can retrieve other scenes CombatTrackers
  const gameCombats = game.combats;
  const viewedScene = game.scenes.viewed;
  const combatsInOtherScenes = gameCombats?.entities.filter(c => c.data.scene !== viewedScene._id);

  //Don't want to sync different encounters within the same scene
  //(unless we decide that's the way to show other scenes)
//FIXME: Will need to be a checkbox that says "Sync with other combat trackers" - failing that will need sources and sink  
  console.log(`Combats in current scene ${viewedScene.name}:`);
  console.log(gameCombats?.entities.filter(c => c.data.scene === viewedScene._id));
  console.log(`Combats in other scenes:`);

  let tokensInOtherCombats = new Set();    //can't add tokens directly because they are per scene - record the token data
  combatsInOtherScenes?.forEach(c => {
    const otherScene = game.scenes.find(s => s._id === c.data.scene);
    console.log(c, otherScene);
    //"turns" are really tokens and "turn.token" is really token data
    c.turns.forEach(turn => {
      const tokenData = turn.token;
      tokensInOtherCombats.add(tokenData);
    });
  });

  //If this scene combat hasn't been initialized, then just do it later
  if (!combat.combat) {return;}

  //Now create temporary tokens and add them to this Combat Tracker
  //Note that you can't compare actor data because mean tokens can have the same actor
  let tokenDataToAdd = new Set();
  tokensInOtherCombats.forEach(td => {
    if (td && !(td.flags && td.flags[MODULE_NAME] && td.flags[MODULE_NAME].isCopy)) {
      const tokenAlreadyPresent = combat.combat.turns?.find(turn => ((turn.tokenId === td._id) 
                                                    && turn.flags && turn.flags[MODULE_NAME] && turn.flags[MODULE_NAME].isCopy));
      if (!tokenAlreadyPresent) {
        //Not found; add it
        // Just copy the token data, keeping the same id and setting a flag which marks it as a copy
    
        const tokenDataCopy = duplicate(td);
        if (!tokenDataCopy.flags) {tokenDataCopy.flags = {}}
        tokenDataCopy.flags[MODULE_NAME] = {isCopy : true};
        tokenDataToAdd.add(tokenDataCopy);
      }
    }//end if td not a copy itself
  });
  if (tokenDataToAdd.size) {
    //Have to lift the toggleCombat code because a lot of it depends on having actual tokens
    //We may need to create temporary tokens for this to work
    const createData = Array.from(tokenDataToAdd).map(td => {return {tokenId: td._id, flags: td.flags, hidden: true}});
    await combat.combat.createEmbeddedEntity("Combatant", createData, {temporary : false});
  }

});

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
